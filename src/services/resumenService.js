import { getMovimientos, getResumen } from './movimientoService';
import { getCxC, getAging as getAgingCxC, getResumenCxC } from './cxcService';
import { getCxP, getAging as getAgingCxP, getResumenCxP } from './cxpService';
import { getCuentas, getResumenBancos } from './bancosService';
import { getTarjetas, getResumenTarjetas, getAlertasProximidad } from './tarjetasService';
import { getPrestamos, getResumenPrestamos, getAlertasPrestamos } from './prestamosService';

export async function getResumenFinanciero(db, filtros = {}) {
  const fechaDesde = filtros.fechaDesde || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const fechaHasta = filtros.fechaHasta || new Date().toISOString().slice(0, 10);

  const [movimientos, cxcItems, cxpItems, cuentas, tarjetas, prestamos] = await Promise.all([
    getMovimientos(db, { fechaDesde, fechaHasta }),
    getCxC(db, {}),
    getCxP(db, {}),
    getCuentas(db, {}),
    getTarjetas(db),
    getPrestamos(db)
  ]);

  const flujoMes = getResumen(movimientos);
  const resumenCxC = getResumenCxC(cxcItems);
  const resumenCxP = getResumenCxP(cxpItems);
  const resumenBancos = getResumenBancos(cuentas);
  const resumenTarjetas = getResumenTarjetas(tarjetas);
  const resumenPrestamos = getResumenPrestamos(prestamos);

  const cartera = {
    cxcPendiente: resumenCxC.totalCartera,
    cxpPendiente: resumenCxP.totalObligaciones,
    neto: resumenCxC.totalCartera - resumenCxP.totalObligaciones
  };

  const deuda = {
    prestamosPendientes: resumenPrestamos.totalDeuda,
    tarjetasUtilizadas: resumenTarjetas.totalUtilizado,
    total: resumenPrestamos.totalDeuda + resumenTarjetas.totalUtilizado
  };

  const liquidez = {
    bancos: resumenBancos.totalBancos,
    caja: resumenBancos.totalCaja,
    disponible: resumenBancos.totalGeneral
  };

  const forecast = calcularForecast(cxcItems, cxpItems);

  const agingCxC = getAgingCxC(cxcItems.filter(i => i.estado !== 'pagado' && i.estado !== 'anulado'));
  const agingCxP = getAgingCxP(cxpItems.filter(i => i.estado !== 'pagado' && i.estado !== 'anulado'));
  const agingConsolidado = {
    cxc: agingCxC,
    cxp: agingCxP
  };

  const alertas = generarAlertas(cxcItems, cxpItems, tarjetas, prestamos);

  return {
    flujoMes: {
      ingresos: flujoMes.totalIngresos,
      egresos: flujoMes.totalEgresos,
      neto: flujoMes.saldoNeto
    },
    cartera,
    deuda,
    liquidez,
    forecast,
    agingConsolidado,
    alertas,
    periodo: { fechaDesde, fechaHasta }
  };
}

function calcularForecast(cxcItems, cxpItems) {
  const hoy = new Date();
  const en30Dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
  const en60Dias = new Date(hoy.getTime() + 60 * 24 * 60 * 60 * 1000);
  const en90Dias = new Date(hoy.getTime() + 90 * 24 * 60 * 60 * 1000);

  const entradas30 = cxcItems
    .filter(i => i.estado !== 'pagado' && i.estado !== 'anulado')
    .filter(i => {
      const fv = i.factura?.fechaVencimiento?.toDate?.() || new Date(i.factura?.fechaVencimiento);
      return fv <= en30Dias;
    })
    .reduce((s, i) => s + (Number(i.saldoPendiente) || 0), 0);

  const salidas30 = cxpItems
    .filter(i => i.estado !== 'pagado' && i.estado !== 'anulado')
    .filter(i => {
      const fv = i.factura?.fechaVencimiento?.toDate?.() || new Date(i.factura?.fechaVencimiento);
      return fv <= en30Dias;
    })
    .reduce((s, i) => s + (Number(i.saldoPendiente) || 0), 0);

  const entradas60 = cxcItems
    .filter(i => i.estado !== 'pagado' && i.estado !== 'anulado')
    .filter(i => {
      const fv = i.factura?.fechaVencimiento?.toDate?.() || new Date(i.factura?.fechaVencimiento);
      return fv <= en60Dias;
    })
    .reduce((s, i) => s + (Number(i.saldoPendiente) || 0), 0);

  const salidas60 = cxpItems
    .filter(i => i.estado !== 'pagado' && i.estado !== 'anulado')
    .filter(i => {
      const fv = i.factura?.fechaVencimiento?.toDate?.() || new Date(i.factura?.fechaVencimiento);
      return fv <= en60Dias;
    })
    .reduce((s, i) => s + (Number(i.saldoPendiente) || 0), 0);

  const entradas90 = cxcItems
    .filter(i => i.estado !== 'pagado' && i.estado !== 'anulado')
    .filter(i => {
      const fv = i.factura?.fechaVencimiento?.toDate?.() || new Date(i.factura?.fechaVencimiento);
      return fv <= en90Dias;
    })
    .reduce((s, i) => s + (Number(i.saldoPendiente) || 0), 0);

  const salidas90 = cxpItems
    .filter(i => i.estado !== 'pagado' && i.estado !== 'anulado')
    .filter(i => {
      const fv = i.factura?.fechaVencimiento?.toDate?.() || new Date(i.factura?.fechaVencimiento);
      return fv <= en90Dias;
    })
    .reduce((s, i) => s + (Number(i.saldoPendiente) || 0), 0);

  return {
    entradas30,
    salidas30,
    proyectado30: entradas30 - salidas30,
    entradas60,
    salidas60,
    proyectado60: entradas60 - salidas60,
    entradas90,
    salidas90,
    proyectado90: entradas90 - salidas90
  };
}

function generarAlertas(cxcItems, cxpItems, tarjetas, prestamos) {
  const alertas = [];
  const hoy = new Date();

  cxcItems.filter(i => i.estado !== 'pagado' && i.estado !== 'anulado').forEach(i => {
    const fv = i.factura?.fechaVencimiento?.toDate?.() || new Date(i.factura?.fechaVencimiento);
    const diasVencido = Math.floor((hoy - fv) / 86400000);
    if (diasVencido > 0) {
      alertas.push({
        tipo: 'cxc_vencido',
        mensaje: `Factura ${i.factura?.numero || 's/n'} vencida hace ${diasVencido} día(s) - ${i.tercero?.nombre || 'Cliente'}`,
        prioridad: diasVencido > 30 ? 'alta' : 'media',
        documentoId: i.id,
        monto: Number(i.saldoPendiente) || 0
      });
    }
  });

  cxpItems.filter(i => i.estado !== 'pagado' && i.estado !== 'anulado').forEach(i => {
    const fv = i.factura?.fechaVencimiento?.toDate?.() || new Date(i.factura?.fechaVencimiento);
    const diasVencido = Math.floor((hoy - fv) / 86400000);
    if (diasVencido > 0) {
      alertas.push({
        tipo: 'cxp_vencido',
        mensaje: `Obligación ${i.factura?.numero || 's/n'} vencida hace ${diasVencido} día(s) - ${i.tercero?.nombre || 'Proveedor'}`,
        prioridad: diasVencido > 30 ? 'alta' : 'media',
        documentoId: i.id,
        monto: Number(i.saldoPendiente) || 0
      });
    }
  });

  const alertasTarjetas = getAlertasProximidad(tarjetas);
  alertasTarjetas.forEach(a => {
    alertas.push({
      tipo: 'tarjeta_proxima',
      mensaje: `${a.emisor} ****${a.numero?.slice(-4) || '0000'}: ${a.mensaje}`,
      prioridad: a.tipo === 'pago' ? 'alta' : 'media',
      documentoId: a.tarjetaId,
      monto: 0
    });
  });

  const alertasPrestamos = getAlertasPrestamos(prestamos);
  alertasPrestamos.forEach(a => {
    alertas.push({
      tipo: 'prestamo_vencido',
      mensaje: a.mensaje,
      prioridad: a.dias > 30 ? 'alta' : 'media',
      documentoId: a.prestamoId,
      monto: 0
    });
  });

  tarjetas.forEach(t => {
    if (t.cupoDisponible < Number(t.cupoTotal) * 0.1) {
      alertas.push({
        tipo: 'tarjeta_cupo_bajo',
        mensaje: `${t.emisor} ****${t.numero?.slice(-4) || '0000'}: Cupo bajo ($${t.cupoDisponible.toFixed(2)})`,
        prioridad: 'media',
        documentoId: t.id,
        monto: t.cupoDisponible
      });
    }
  });

  return alertas.sort((a, b) => {
    const prioridades = { alta: 0, media: 1, baja: 2 };
    return prioridades[a.prioridad] - prioridades[b.prioridad];
  });
}

export function getFlujoCajaMensual(movimientos, meses = 6) {
  const datos = [];
  const hoy = new Date();
  
  for (let i = meses - 1; i >= 0; i--) {
    const fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const fechaFin = new Date(hoy.getFullYear(), hoy.getMonth() - i + 1, 0);
    
    const ingresos = movimientos
      .filter(m => {
        const f = m.fecha?.toDate ? m.fecha.toDate() : new Date(m.fecha);
        return m.tipo === 'ingreso' && m.estado !== 'anulado' && f >= fechaInicio && f <= fechaFin;
      })
      .reduce((s, m) => s + Number(m.monto), 0);
    
    const egresos = movimientos
      .filter(m => {
        const f = m.fecha?.toDate ? m.fecha.toDate() : new Date(m.fecha);
        return m.tipo === 'egreso' && m.estado !== 'anulado' && f >= fechaInicio && f <= fechaFin;
      })
      .reduce((s, m) => s + Number(m.monto), 0);
    
    datos.push({
      mes: fechaInicio.toLocaleDateString('es-EC', { month: 'short', year: '2-digit' }),
      ingresos,
      egresos,
      neto: ingresos - egresos
    });
  }
  
  return datos;
}

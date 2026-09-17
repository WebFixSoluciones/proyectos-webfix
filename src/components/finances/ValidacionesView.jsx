import { resolveThemeProps } from '../ui/themeProps';
import { mergeThemeProps } from '../ui/themeProps';
import { UiCard, UiBox, UiHeading, UiText } from '../ui/layout';
import { UiButton } from '../ui/controls';
import { useState } from 'react';
import {
  Shield, CheckCircle, AlertTriangle, XCircle, RefreshCw,
  FileText, Users, Landmark, ArrowRight, Download
} from 'lucide-react';
import {
  validarIntegridadCompleta, corregirSaldoPendiente
} from '../../services/validacionService';

export default function ValidacionesView({ db, usuario, showToast }) {
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [corrigiendo, setCorrigiendo] = useState(null);
  const [ultimaValidacion, setUltimaValidacion] = useState(null);

  const ejecutarValidacion = async () => {
    setLoading(true);
    try {
      const res = await validarIntegridadCompleta(db);
      setResultados(res);
      setUltimaValidacion(new Date().toLocaleString('es-EC'));
      showToast('Validación completada', 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const corregirSaldo = async (movimientoId) => {
    setCorrigiendo(movimientoId);
    try {
      const res = await corregirSaldoPendiente(db, movimientoId, usuario);
      showToast(res.mensaje, 'success');
      await ejecutarValidacion();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      setCorrigiendo(null);
    }
  };

  const exportarResultados = () => {
    if (!resultados) return;
    
    const data = {
      fecha: ultimaValidacion,
      resumen: resultados.resumen,
      movimientos: resultados.movimientos,
      cxc: resultados.cxc,
      cxp: resultados.cxp,
      duplicados: resultados.duplicados
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `validacion_financiera_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Resultados exportados', 'success');
  };

  const getSeveridadColor = (severidad) => {
    switch (severidad) {
      case 'severo': return {"style":{"backgroundColor":"var(--red-3)","color":"var(--red-11)"}};
      case 'advertencia': return {"style":{"backgroundColor":"var(--amber-3)","color":"var(--amber-11)"}};
      case 'info': return {"style":{"backgroundColor":"var(--blue-3)","color":"var(--blue-11)"}};
      default: return {"style":{"backgroundColor":"var(--gray-3)","color":"var(--gray-11)"}};
    }
  };

  const getSeveridadIcon = (severidad) => {
    switch (severidad) {
      case 'severo': return <XCircle {...{"className":"w-5 h-5"}} />;
      case 'advertencia': return <AlertTriangle {...{"className":"w-5 h-5"}} />;
      default: return <AlertTriangle {...{"className":"w-5 h-5"}} />;
    }
  };

  if (!resultados) {
    return (
      <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6"}}>
        <UiBox {...{"className":"flex items-center justify-center h-96"}}>
          <UiBox {...{"className":"text-center"}}>
            <Shield {...{"style":{"color":"var(--gray-11)"},"className":"w-16 h-16 mx-auto mb-4"}} />
            <UiHeading as="h2" {...{"size":"5","weight":"bold","color":"gray","highContrast":true,"className":"mb-2"}}>
              Validación de Integridad Financiera
            </UiHeading>
            <UiText as="p" {...{"color":"gray","highContrast":true,"className":"mb-6 max-w-md"}}>
              Verifica la consistencia de datos entre movimientos, CxC, CxP y detecta duplicados o inconsistencias
            </UiText>
            <UiButton
              onClick={ejecutarValidacion}
              disabled={loading}
              {...{"variant":"solid","color":"blue","className":"disabled:cursor-not-allowed flex items-center gap-2 mx-auto"}}
            >
              {loading ? (
                <>
                  <RefreshCw {...{"className":"w-5 h-5 animate-spin"}} />
                  Validando...
                </>
              ) : (
                <>
                  <Shield {...{"className":"w-5 h-5"}} />
                  Ejecutar Validación
                </>
              )}
            </UiButton>
          </UiBox>
        </UiBox>
      </UiCard>
    );
  }

  return (
    <UiBox {...{"className":"p-6 space-y-6"}}>
      {/* Header */}
      <UiBox {...{"className":"flex items-center justify-between"}}>
        <UiBox>
          <UiHeading as="h1" {...{"size":"6","weight":"bold","color":"gray","highContrast":true,"className":"flex items-center gap-2"}}>
            <Shield {...{"className":"w-7 h-7"}} />
            Validación de Integridad
          </UiHeading>
          <UiText as="p" {...{"size":"2","color":"gray","highContrast":true,"className":"mt-1"}}>
            Última ejecución: {ultimaValidacion}
          </UiText>
        </UiBox>
        <UiBox {...{"className":"flex gap-2"}}>
          <UiButton
            onClick={exportarResultados}
            {...{"variant":"soft","color":"gray","className":"flex items-center gap-2"}}
          >
            <Download {...{"className":"w-4 h-4"}} />
            Exportar
          </UiButton>
          <UiButton
            onClick={ejecutarValidacion}
            disabled={loading}
            {...{"variant":"solid","color":"blue","className":"flex items-center gap-2"}}
          >
            <RefreshCw {...mergeThemeProps({"className":"w-4 h-4"}, {}, (loading ? {"className":"animate-spin"} : {}))} />
            Re-validar
          </UiButton>
        </UiBox>
      </UiBox>

      {/* Resumen General */}
      <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-4 gap-4"}}>
        <UiBox {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-4"}, {}, (resultados.resumen.valido ? {"style":{"backgroundColor":"var(--green-3)"}} : {"style":{"backgroundColor":"var(--red-3)"}}))}>
          <UiBox {...{"className":"flex items-center gap-3"}}>
            {resultados.resumen.valido ? (
              <CheckCircle {...{"style":{"color":"var(--green-11)"},"className":"w-10 h-10"}} />
            ) : (
              <XCircle {...{"style":{"color":"var(--red-11)"},"className":"w-10 h-10"}} />
            )}
            <UiBox>
              <UiText as="p" {...{"size":"2","color":"gray","highContrast":true}}>Estado General</UiText>
              <UiText as="p" {...{"size":"4","weight":"bold"}}>
                {resultados.resumen.valido ? 'Válido' : 'Con Errores'}
              </UiText>
            </UiBox>
          </UiBox>
        </UiBox>

        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiText as="p" {...{"size":"2","color":"gray","highContrast":true}}>Total Errores</UiText>
          <UiText as="p" {...{"size":"6","weight":"bold","color":"gray","highContrast":true}}>{resultados.resumen.totalErrores}</UiText>
        </UiCard>

        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiText as="p" {...{"size":"2","color":"gray","highContrast":true}}>Errores Severos</UiText>
          <UiText as="p" {...{"size":"6","weight":"bold","color":"red"}}>{resultados.resumen.severos}</UiText>
        </UiCard>

        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiText as="p" {...{"size":"2","color":"gray","highContrast":true}}>Advertencias</UiText>
          <UiText as="p" {...{"size":"6","weight":"bold","color":"amber"}}>{resultados.resumen.advertencias}</UiText>
        </UiCard>
      </UiBox>

      {/* Estadísticas */}
      <UiBox {...{"className":"grid grid-cols-1 md:grid-cols-3 gap-4"}}>
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"className":"flex items-center justify-between mb-2"}}>
            <UiText as="p" {...{"size":"2","weight":"medium","color":"gray","highContrast":true}}>Movimientos Validados</UiText>
            <FileText {...{"style":{"color":"var(--gray-11)"},"className":"w-5 h-5"}} />
          </UiBox>
          <UiText as="p" {...{"size":"6","weight":"bold","color":"gray","highContrast":true}}>{resultados.movimientos.total}</UiText>
          <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>
            {resultados.movimientos.errores.length} con errores
          </UiText>
        </UiCard>

        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"className":"flex items-center justify-between mb-2"}}>
            <UiText as="p" {...{"size":"2","weight":"medium","color":"gray","highContrast":true}}>CxC / CxP</UiText>
            <Users {...{"style":{"color":"var(--gray-11)"},"className":"w-5 h-5"}} />
          </UiBox>
          <UiText as="p" {...{"size":"6","weight":"bold","color":"gray","highContrast":true}}>
            {resultados.cxc.totalCxC + resultados.cxp.totalCxP}
          </UiText>
          <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>
            CxC: {resultados.cxc.totalCxC} | CxP: {resultados.cxp.totalCxP}
          </UiText>
        </UiCard>

        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-4"}}>
          <UiBox {...{"className":"flex items-center justify-between mb-2"}}>
            <UiText as="p" {...{"size":"2","weight":"medium","color":"gray","highContrast":true}}>Duplicados Detectados</UiText>
            <AlertTriangle {...{"style":{"color":"var(--gray-11)"},"className":"w-5 h-5"}} />
          </UiBox>
          <UiText as="p" {...{"size":"6","weight":"bold","color":"gray","highContrast":true}}>{resultados.duplicados.length}</UiText>
          <UiText as="p" {...{"size":"1","color":"gray","className":"mt-1"}}>
            Movimientos duplicados
          </UiText>
        </UiCard>
      </UiBox>

      {/* Errores de Movimientos */}
      {resultados.movimientos.errores.length > 0 && (
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6"}}>
          <UiHeading as="h2" {...{"size":"4","weight":"bold","color":"gray","highContrast":true,"className":"mb-4 flex items-center gap-2"}}>
            <AlertTriangle {...{"style":{"color":"var(--red-11)"},"className":"w-5 h-5"}} />
            Errores en Movimientos ({resultados.movimientos.errores.length})
          </UiHeading>
          <UiBox {...{"className":"space-y-3"}}>
            {resultados.movimientos.errores.slice(0, 10).map((err, idx) => (
              <UiBox
                key={idx}
                {...mergeThemeProps({"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)"},"className":"p-4"}, {}, resolveThemeProps(getSeveridadColor(err.severidad)))}
              >
                <UiBox {...{"className":"flex items-start justify-between"}}>
                  <UiBox {...{"className":"flex items-start gap-3 flex-1"}}>
                    {getSeveridadIcon(err.severidad)}
                    <UiBox {...{"className":"flex-1"}}>
                      <UiBox {...{"className":"flex items-center gap-2 mb-1"}}>
                        <UiText {...{"weight":"medium"}}>{err.tipo}</UiText>
                        <UiText {...{"size":"1","className":"opacity-75"}}>ID: {err.id.substring(0, 8)}...</UiText>
                      </UiBox>
                      <UiText as="p" {...{"size":"2"}}>{err.mensaje}</UiText>
                    </UiBox>
                  </UiBox>
                  {err.tipo === 'SALDO' && (
                    <UiButton
                      onClick={() => corregirSaldo(err.id)}
                      disabled={corrigiendo === err.id}
                      {...{"variant":"surface","size":"2","className":"flex items-center gap-1"}}
                    >
                      {corrigiendo === err.id ? (
                        <>
                          <RefreshCw {...{"className":"w-3 h-3 animate-spin"}} />
                          Corrigiendo...
                        </>
                      ) : (
                        <>
                          <ArrowRight {...{"className":"w-3 h-3"}} />
                          Corregir
                        </>
                      )}
                    </UiButton>
                  )}
                </UiBox>
              </UiBox>
            ))}
            {resultados.movimientos.errores.length > 10 && (
              <UiText as="p" {...{"size":"2","color":"gray","className":"text-center mt-4"}}>
                Y {resultados.movimientos.errores.length - 10} errores más...
              </UiText>
            )}
          </UiBox>
        </UiCard>
      )}

      {/* Errores CxC */}
      {!resultados.cxc.valido && (
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6"}}>
          <UiHeading as="h2" {...{"size":"4","weight":"bold","color":"gray","highContrast":true,"className":"mb-4 flex items-center gap-2"}}>
            <Users {...{"style":{"color":"var(--blue-11)"},"className":"w-5 h-5"}} />
            Errores en Cuentas por Cobrar ({resultados.cxc.errores.length})
          </UiHeading>
          <UiBox {...{"className":"space-y-3"}}>
            {resultados.cxc.errores.slice(0, 5).map((err, idx) => (
              <UiBox key={idx} {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--blue-3)"},"className":"p-4"}}>
                <UiBox {...{"className":"flex items-start gap-3"}}>
                  <AlertTriangle {...{"style":{"color":"var(--blue-11)"},"className":"w-5 h-5 flex-shrink-0 mt-0.5"}} />
                  <UiBox {...{"className":"flex-1"}}>
                    <UiBox {...{"className":"flex items-center gap-2 mb-1"}}>
                      <UiText {...{"weight":"medium"}}>{err.tipo}</UiText>
                      {err.documento && <UiText {...{"size":"1","className":"opacity-75"}}>Doc: {err.documento}</UiText>}
                    </UiBox>
                    <UiText as="p" {...{"size":"2"}}>{err.mensaje}</UiText>
                    {err.saldoCxC !== undefined && err.saldoMovimiento !== undefined && (
                      <UiBox {...{"className":"mt-2"}}>
                        <UiText as="p">CxC: ${err.saldoCxC.toFixed(2)} | Movimiento: ${err.saldoMovimiento.toFixed(2)}</UiText>
                        <UiText as="p" {...{"color":"red","weight":"medium"}}>Diferencia: ${err.diferencia.toFixed(2)}</UiText>
                      </UiBox>
                    )}
                  </UiBox>
                </UiBox>
              </UiBox>
            ))}
          </UiBox>
        </UiCard>
      )}

      {/* Errores CxP */}
      {!resultados.cxp.valido && (
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6"}}>
          <UiHeading as="h2" {...{"size":"4","weight":"bold","color":"gray","highContrast":true,"className":"mb-4 flex items-center gap-2"}}>
            <Landmark {...{"style":{"color":"var(--purple-11)"},"className":"w-5 h-5"}} />
            Errores en Cuentas por Pagar ({resultados.cxp.errores.length})
          </UiHeading>
          <UiBox {...{"className":"space-y-3"}}>
            {resultados.cxp.errores.slice(0, 5).map((err, idx) => (
              <UiBox key={idx} {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--purple-3)"},"className":"p-4"}}>
                <UiBox {...{"className":"flex items-start gap-3"}}>
                  <AlertTriangle {...{"style":{"color":"var(--purple-11)"},"className":"w-5 h-5 flex-shrink-0 mt-0.5"}} />
                  <UiBox {...{"className":"flex-1"}}>
                    <UiBox {...{"className":"flex items-center gap-2 mb-1"}}>
                      <UiText {...{"weight":"medium"}}>{err.tipo}</UiText>
                      {err.documento && <UiText {...{"size":"1","className":"opacity-75"}}>Doc: {err.documento}</UiText>}
                    </UiBox>
                    <UiText as="p" {...{"size":"2"}}>{err.mensaje}</UiText>
                    {err.saldoCxP !== undefined && err.saldoMovimiento !== undefined && (
                      <UiBox {...{"className":"mt-2"}}>
                        <UiText as="p">CxP: ${err.saldoCxP.toFixed(2)} | Movimiento: ${err.saldoMovimiento.toFixed(2)}</UiText>
                        <UiText as="p" {...{"color":"red","weight":"medium"}}>Diferencia: ${err.diferencia.toFixed(2)}</UiText>
                      </UiBox>
                    )}
                  </UiBox>
                </UiBox>
              </UiBox>
            ))}
          </UiBox>
        </UiCard>
      )}

      {/* Duplicados */}
      {resultados.duplicados.length > 0 && (
        <UiCard {...{"style":{"backgroundColor":"var(--color-panel-solid)"},"className":"p-6"}}>
          <UiHeading as="h2" {...{"size":"4","weight":"bold","color":"gray","highContrast":true,"className":"mb-4 flex items-center gap-2"}}>
            <AlertTriangle {...{"style":{"color":"var(--orange-11)"},"className":"w-5 h-5"}} />
            Movimientos Duplicados ({resultados.duplicados.length})
          </UiHeading>
          <UiBox {...{"className":"space-y-3"}}>
            {resultados.duplicados.slice(0, 5).map((dup, idx) => (
              <UiBox key={idx} {...{"style":{"borderRadius":"var(--radius-3)","border":"1px solid var(--gray-a6)","backgroundColor":"var(--orange-3)"},"className":"p-4"}}>
                <UiBox {...{"className":"flex items-start gap-3"}}>
                  <AlertTriangle {...{"style":{"color":"var(--orange-11)"},"className":"w-5 h-5 flex-shrink-0 mt-0.5"}} />
                  <UiBox {...{"className":"flex-1"}}>
                    <UiText as="p" {...{"weight":"medium","size":"2","className":"mb-1"}}>{dup.razon}</UiText>
                    <UiBox {...{"className":"grid grid-cols-2 gap-4 mt-2"}}>
                      <UiBox>
                        <UiText as="p" {...{"color":"gray","highContrast":true}}>Movimiento 1:</UiText>
                        <UiText as="p" {...{"weight":"regular"}}>{dup.movimiento.documento?.numero}</UiText>
                        <UiText as="p">{dup.movimiento.tercero?.nombre}</UiText>
                        <UiText as="p" {...{"weight":"medium"}}>${Number(dup.movimiento.monto || 0).toFixed(2)}</UiText>
                      </UiBox>
                      <UiBox>
                        <UiText as="p" {...{"color":"gray","highContrast":true}}>Movimiento 2:</UiText>
                        <UiText as="p" {...{"weight":"regular"}}>{dup.duplicadoDe.documento?.numero}</UiText>
                        <UiText as="p">{dup.duplicadoDe.tercero?.nombre}</UiText>
                        <UiText as="p" {...{"weight":"medium"}}>${Number(dup.duplicadoDe.monto || 0).toFixed(2)}</UiText>
                      </UiBox>
                    </UiBox>
                  </UiBox>
                </UiBox>
              </UiBox>
            ))}
            {resultados.duplicados.length > 5 && (
              <UiText as="p" {...{"size":"2","color":"gray","className":"text-center mt-4"}}>
                Y {resultados.duplicados.length - 5} duplicados más...
              </UiText>
            )}
          </UiBox>
        </UiCard>
      )}

      {/* Todo OK */}
      {resultados.resumen.valido && (
        <UiBox {...{"style":{"backgroundColor":"var(--green-3)","border":"1px solid var(--gray-a6)","borderRadius":"var(--radius-3)"},"className":"p-8 text-center"}}>
          <CheckCircle {...{"style":{"color":"var(--green-11)"},"className":"w-16 h-16 mx-auto mb-4"}} />
          <UiHeading as="h2" {...{"size":"5","weight":"bold","color":"green","className":"mb-2"}}>
            ¡Todo está correcto!
          </UiHeading>
          <UiText as="p" {...{"color":"green"}}>
            No se encontraron errores ni inconsistencias en los datos financieros.
          </UiText>
        </UiBox>
      )}
    </UiBox>
  );
}

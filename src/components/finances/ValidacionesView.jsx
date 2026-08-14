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
      case 'severo': return 'bg-red-50 border-red-200 text-red-800';
      case 'advertencia': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSeveridadIcon = (severidad) => {
    switch (severidad) {
      case 'severo': return <XCircle className="w-5 h-5" />;
      case 'advertencia': return <AlertTriangle className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  if (!resultados) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Shield className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Validación de Integridad Financiera
            </h2>
            <p className="text-gray-600 mb-6 max-w-md">
              Verifica la consistencia de datos entre movimientos, CxC, CxP y detecta duplicados o inconsistencias
            </p>
            <button
              onClick={ejecutarValidacion}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <Shield className="w-5 h-5" />
                  Ejecutar Validación
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="w-7 h-7" />
            Validación de Integridad
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Última ejecución: {ultimaValidacion}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportarResultados}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar
          </button>
          <button
            onClick={ejecutarValidacion}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Re-validar
          </button>
        </div>
      </div>

      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg border-2 ${resultados.resumen.valido ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
          <div className="flex items-center gap-3">
            {resultados.resumen.valido ? (
              <CheckCircle className="w-10 h-10 text-green-600" />
            ) : (
              <XCircle className="w-10 h-10 text-red-600" />
            )}
            <div>
              <p className="text-sm text-gray-600">Estado General</p>
              <p className="text-lg font-bold">
                {resultados.resumen.valido ? 'Válido' : 'Con Errores'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-gray-200">
          <p className="text-sm text-gray-600">Total Errores</p>
          <p className="text-2xl font-bold text-gray-800">{resultados.resumen.totalErrores}</p>
        </div>

        <div className="p-4 rounded-lg bg-white border border-gray-200">
          <p className="text-sm text-gray-600">Errores Severos</p>
          <p className="text-2xl font-bold text-red-600">{resultados.resumen.severos}</p>
        </div>

        <div className="p-4 rounded-lg bg-white border border-gray-200">
          <p className="text-sm text-gray-600">Advertencias</p>
          <p className="text-2xl font-bold text-yellow-600">{resultados.resumen.advertencias}</p>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Movimientos Validados</p>
            <FileText className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{resultados.movimientos.total}</p>
          <p className="text-xs text-gray-500 mt-1">
            {resultados.movimientos.errores.length} con errores
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">CxC / CxP</p>
            <Users className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {resultados.cxc.totalCxC + resultados.cxp.totalCxP}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            CxC: {resultados.cxc.totalCxC} | CxP: {resultados.cxp.totalCxP}
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Duplicados Detectados</p>
            <AlertTriangle className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-2xl font-bold text-gray-800">{resultados.duplicados.length}</p>
          <p className="text-xs text-gray-500 mt-1">
            Movimientos duplicados
          </p>
        </div>
      </div>

      {/* Errores de Movimientos */}
      {resultados.movimientos.errores.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Errores en Movimientos ({resultados.movimientos.errores.length})
          </h2>
          <div className="space-y-3">
            {resultados.movimientos.errores.slice(0, 10).map((err, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${getSeveridadColor(err.severidad)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getSeveridadIcon(err.severidad)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{err.tipo}</span>
                        <span className="text-xs opacity-75">ID: {err.id.substring(0, 8)}...</span>
                      </div>
                      <p className="text-sm">{err.mensaje}</p>
                    </div>
                  </div>
                  {err.tipo === 'SALDO' && (
                    <button
                      onClick={() => corregirSaldo(err.id)}
                      disabled={corrigiendo === err.id}
                      className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:bg-gray-100 text-xs font-medium flex items-center gap-1"
                    >
                      {corrigiendo === err.id ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Corrigiendo...
                        </>
                      ) : (
                        <>
                          <ArrowRight className="w-3 h-3" />
                          Corregir
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {resultados.movimientos.errores.length > 10 && (
              <p className="text-sm text-gray-500 text-center mt-4">
                Y {resultados.movimientos.errores.length - 10} errores más...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Errores CxC */}
      {!resultados.cxc.valido && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Errores en Cuentas por Cobrar ({resultados.cxc.errores.length})
          </h2>
          <div className="space-y-3">
            {resultados.cxc.errores.slice(0, 5).map((err, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{err.tipo}</span>
                      {err.documento && <span className="text-xs opacity-75">Doc: {err.documento}</span>}
                    </div>
                    <p className="text-sm">{err.mensaje}</p>
                    {err.saldoCxC !== undefined && err.saldoMovimiento !== undefined && (
                      <div className="mt-2 text-xs">
                        <p>CxC: ${err.saldoCxC.toFixed(2)} | Movimiento: ${err.saldoMovimiento.toFixed(2)}</p>
                        <p className="text-red-600 font-medium">Diferencia: ${err.diferencia.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errores CxP */}
      {!resultados.cxp.valido && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-purple-600" />
            Errores en Cuentas por Pagar ({resultados.cxp.errores.length})
          </h2>
          <div className="space-y-3">
            {resultados.cxp.errores.slice(0, 5).map((err, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-purple-50 border-purple-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{err.tipo}</span>
                      {err.documento && <span className="text-xs opacity-75">Doc: {err.documento}</span>}
                    </div>
                    <p className="text-sm">{err.mensaje}</p>
                    {err.saldoCxP !== undefined && err.saldoMovimiento !== undefined && (
                      <div className="mt-2 text-xs">
                        <p>CxP: ${err.saldoCxP.toFixed(2)} | Movimiento: ${err.saldoMovimiento.toFixed(2)}</p>
                        <p className="text-red-600 font-medium">Diferencia: ${err.diferencia.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Duplicados */}
      {resultados.duplicados.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Movimientos Duplicados ({resultados.duplicados.length})
          </h2>
          <div className="space-y-3">
            {resultados.duplicados.slice(0, 5).map((dup, idx) => (
              <div key={idx} className="p-4 rounded-lg border bg-orange-50 border-orange-200">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1">{dup.razon}</p>
                    <div className="grid grid-cols-2 gap-4 text-xs mt-2">
                      <div>
                        <p className="text-gray-600">Movimiento 1:</p>
                        <p className="font-mono">{dup.movimiento.documento?.numero}</p>
                        <p>{dup.movimiento.tercero?.nombre}</p>
                        <p className="font-medium">${Number(dup.movimiento.monto || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Movimiento 2:</p>
                        <p className="font-mono">{dup.duplicadoDe.documento?.numero}</p>
                        <p>{dup.duplicadoDe.tercero?.nombre}</p>
                        <p className="font-medium">${Number(dup.duplicadoDe.monto || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {resultados.duplicados.length > 5 && (
              <p className="text-sm text-gray-500 text-center mt-4">
                Y {resultados.duplicados.length - 5} duplicados más...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Todo OK */}
      {resultados.resumen.valido && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-green-800 mb-2">
            ¡Todo está correcto!
          </h2>
          <p className="text-green-700">
            No se encontraron errores ni inconsistencias en los datos financieros.
          </p>
        </div>
      )}
    </div>
  );
}

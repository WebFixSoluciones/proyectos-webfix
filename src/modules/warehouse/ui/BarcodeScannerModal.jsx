import { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, Keyboard, ScanBarcode, X, CheckCircle2, AlertCircle, Volume2, VolumeX } from 'lucide-react';

let sharedAudioCtx = null;

function playBeep(enabled = true) {
  if (!enabled || typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!sharedAudioCtx) sharedAudioCtx = new AudioCtx();
    if (sharedAudioCtx.state === 'suspended') sharedAudioCtx.resume();
    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1280;
    gain.gain.setValueAtTime(0.08, sharedAudioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, sharedAudioCtx.currentTime + 0.09);
    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);
    osc.start();
    osc.stop(sharedAudioCtx.currentTime + 0.09);
  } catch {
    // Silenciar si el navegador bloquea autoplay de audio
  }
}

/**
 * Escáner Universal de Códigos de Barra (Lector USB/Bluetooth HID + Cámara nativa BarcodeDetector + Manual).
 * Compatible con escritorio, tablet y móvil.
 */
export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Escáner de Códigos de Barra',
  subtitle = 'Usa tu lector láser USB/Bluetooth o activa la cámara del dispositivo.',
  continuous = false
}) {
  const [mode, setMode] = useState('usb'); // 'usb' | 'camera'
  const [manualCode, setManualCode] = useState('');
  const [lastScanned, setLastScanned] = useState('');
  const [cameraError, setCameraError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const inputRef = useRef(null);
  const lastScanTimeRef = useRef(0);

  const stopCamera = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const emitCode = useCallback((raw) => {
    const clean = String(raw || '').trim();
    if (!clean) return;
    const now = Date.now();
    if (now - lastScanTimeRef.current < 550 && clean === lastScanned) return;
    lastScanTimeRef.current = now;
    setLastScanned(clean);
    playBeep(soundEnabled);
    onScan?.(clean);
    if (!continuous) {
      stopCamera();
      onClose?.();
    }
  }, [continuous, lastScanned, onClose, onScan, soundEnabled, stopCamera]);

  // Autofocus en modo USB/Teclado sin robar foco de otros elementos cuando el modal está cerrado
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }
    if (mode === 'usb') {
      stopCamera();
      const timer = setTimeout(() => inputRef.current?.focus(), 80);
      return () => clearTimeout(timer);
    }
  }, [isOpen, mode, stopCamera]);

  // Activar cámara + BarcodeDetector API nativo (Chrome/Edge/Android)
  useEffect(() => {
    if (!isOpen || mode !== 'camera') return;
    let cancelled = false;

    const start = async () => {
      setCameraError('');
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Tu navegador no permite acceso a la cámara. Usa modo Lector USB / Manual o abre el sistema vía HTTPS.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCameraActive(true);

        if ('BarcodeDetector' in window) {
          const detector = new window.BarcodeDetector({
            formats: ['code_128', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_39', 'qr_code']
          });
          const tick = async () => {
            if (cancelled || !videoRef.current || videoRef.current.readyState < 2) {
              if (!cancelled) rafRef.current = requestAnimationFrame(tick);
              return;
            }
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0 && barcodes[0].rawValue) {
                emitCode(barcodes[0].rawValue);
              }
            } catch {
              // Ignorar frame puntual
            }
            if (!cancelled) rafRef.current = requestAnimationFrame(tick);
          };
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setCameraError('Cámara activa, pero este navegador no soporta BarcodeDetector nativo (usa Chrome/Edge o un lector láser USB/Bluetooth en la pestaña Lector USB).');
        }
      } catch (err) {
        setCameraError(
          err?.name === 'NotAllowedError'
            ? 'Permiso de cámara denegado. Habilita el acceso a la cámara en tu navegador.'
            : `No se pudo iniciar la cámara: ${err?.message || 'dispositivo no disponible'}.`
        );
      }
    };

    start();
    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [isOpen, mode, emitCode, stopCamera]);

  if (!isOpen) return null;

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    emitCode(manualCode);
    setManualCode('');
  };

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/55 p-3 sm:p-4">
      <div className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <ScanBarcode size={19} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">{title}</h3>
              <p className="text-xs text-slate-500 truncate">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              title={soundEnabled ? 'Silenciar pitido' : 'Activar pitido'}
            >
              {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>
            <button
              type="button"
              onClick={() => { stopCamera(); onClose?.(); }}
              className="w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Selector de Modo */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100">
            <button
              type="button"
              onClick={() => setMode('usb')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'usb' ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Keyboard size={15} />
              <span>Lector USB / Manual</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('camera')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                mode === 'camera' ? 'bg-white text-slate-900 border border-slate-200' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera size={15} />
              <span>Cámara (Móvil / Webcam)</span>
            </button>
          </div>

          {mode === 'usb' ? (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 p-4 text-center space-y-2">
                <ScanBarcode size={28} className="mx-auto text-emerald-700" />
                <p className="text-xs font-semibold text-emerald-950">
                  Listo para recibir lectura del escáner láser USB o Bluetooth
                </p>
                <p className="text-[11px] text-emerald-800">
                  Apunta al código de barras y dispara, o escribe el código/SKU y presiona Enter.
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Escanea o escribe código de barras / SKU..."
                  className="flex-1 h-10 px-3 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:border-emerald-600"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="h-10 px-4 rounded-lg bg-[#1b1b1b] text-white text-xs font-semibold hover:bg-black cursor-pointer shrink-0"
                >
                  Confirmar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-200">
                <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
                {cameraActive && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="w-4/5 h-24 rounded-lg border-2 border-emerald-400/90 relative">
                      <div className="absolute inset-x-2 top-1/2 h-0.5 bg-rose-500/80" />
                    </div>
                  </div>
                )}
                {!cameraActive && !cameraError && (
                  <p className="text-xs text-slate-300">Iniciando cámara...</p>
                )}
              </div>
              {cameraError && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-600" />
                  <span>{cameraError}</span>
                </div>
              )}
            </div>
          )}

          {lastScanned && (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span className="truncate">
                  Última lectura: <strong className="font-mono">{lastScanned}</strong>
                </span>
              </div>
              {continuous && <span className="text-[11px] font-semibold text-emerald-700 shrink-0">Modo continuo</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

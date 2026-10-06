import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, X, Check, HelpCircle } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // If already installed, hide
  if (isInstalled || dismissed) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        // If user cancelled or didn't proceed, don't force guide
      }
    } else {
      // Guide the user how to install in Chrome Android
      setShowAndroidGuide(true);
    }
  };

  return (
    <>
      {/* Top compact install pill / button */}
      <div className="w-full flex items-center justify-between bg-teal-50/90 border border-teal-200/80 rounded-2xl px-4 py-2.5 mb-4 text-xs sm:text-sm text-teal-900 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-teal-700 text-white shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold block sm:inline">Instala la App en Android</span>
            <span className="text-teal-700/80 hidden sm:inline"> — Acceso rápido y uso sin conexión</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white font-medium px-3 py-1.5 rounded-xl shadow-xs transition-colors cursor-pointer text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instalar</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-teal-700/60 hover:text-teal-900 rounded-lg transition-colors cursor-pointer"
            title="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Android Chrome Installation Guide Modal */}
      {showAndroidGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-200 text-gray-800 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 text-teal-700">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-base text-gray-900">Instalar en Google Chrome</h3>
              </div>
              <button
                onClick={() => setShowAndroidGuide(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-sm text-gray-600">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  En Google Chrome en tu móvil, pulsa el botón de <strong>tres puntos verticales (⋮)</strong> en la esquina superior derecha.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  Toca la opción <strong>«Instalar aplicación»</strong> o <strong>«Añadir a la pantalla de inicio»</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-xs shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  Confirma pulsando <strong>«Instalar»</strong>. La aplicación aparecerá en tu menú de apps con su icono propio.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAndroidGuide(false)}
              className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-xl text-sm transition-colors cursor-pointer shadow-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};

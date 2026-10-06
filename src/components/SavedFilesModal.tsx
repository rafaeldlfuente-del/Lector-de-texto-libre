import React from 'react';
import { SavedFile } from '../types';
import { X, Folder, Trash2, FileDown, CheckCircle2, Clock } from 'lucide-react';

interface SavedFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: SavedFile[];
  onLoadFile: (file: SavedFile) => void;
  onDeleteFile: (id: string) => void;
}

export const SavedFilesModal: React.FC<SavedFilesModalProps> = ({
  isOpen,
  onClose,
  files,
  onLoadFile,
  onDeleteFile,
}) => {
  if (!isOpen) return null;

  const downloadTextFile = (file: SavedFile) => {
    const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'documento'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 border border-gray-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Tus archivos guardados</h2>
              <p className="text-xs text-gray-500">
                {files.length} {files.length === 1 ? 'archivo guardado' : 'archivos guardados'} en este dispositivo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {files.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-teal-50 flex items-center justify-center text-teal-600">
                <Folder className="w-7 h-7 stroke-[1.5]" />
              </div>
              <h3 className="text-sm font-medium text-gray-700 mb-1">Aún no tienes archivos guardados</h3>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Escribe o carga un texto en el lector y pulsa el botón «Guardar» para acceder a él cuando quieras.
              </p>
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className="group p-4 rounded-xl border border-gray-200 hover:border-teal-400 hover:shadow-xs transition-all bg-white flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-gray-900 text-sm truncate">{file.title}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1 font-normal text-gray-600">
                      {file.content || '(Sin texto)'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => downloadTextFile(file)}
                      title="Descargar archivo .txt"
                      className="p-1.5 text-gray-400 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteFile(file.id)}
                      title="Eliminar de tus archivos"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gray-400" />
                    {formatDate(file.createdAt)} · {file.wordCount} palabras
                  </span>
                  <button
                    onClick={() => {
                      onLoadFile(file);
                      onClose();
                    }}
                    className="inline-flex items-center gap-1 text-teal-700 font-medium hover:text-teal-800 hover:underline cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Cargar al lector
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

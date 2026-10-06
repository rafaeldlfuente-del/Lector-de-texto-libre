/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Type,
  User,
  Gauge,
  Save,
  Folder,
  FileUp,
  Highlighter,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Copy,
  Check,
  Download,
  AlertCircle,
  FileText,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import {
  SavedFile,
  PitchOption,
  PITCH_OPTIONS,
  SPEED_OPTIONS,
  FONT_SIZES,
  FEMALE_VOICE_PROFILES,
  FemaleVoiceProfile,
} from './types';
import { useSpeech } from './hooks/useSpeech';
import { SavedFilesModal } from './components/SavedFilesModal';
import { SaveFileModal } from './components/SaveFileModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';

const STORAGE_KEY = 'lector_texto_saved_docs_v1';
const DRAFT_KEY = 'lector_texto_current_draft';

// Sample starting text in Spanish
const DEFAULT_SAMPLE_TEXT = `Bienvenido al lector de texto en voz alta. Esta versión ha sido rediseñada para ser completamente limpia, fluida y sin ningún tipo de publicidad.

Puedes escribir o pegar cualquier texto aquí, ajustar el tono de voz, la velocidad y el tamaño de la letra a tu preferencia. 

Pulsa el botón de reproducción para escuchar la lectura con resaltado de palabras en tiempo real.`;

export default function App() {
  const [text, setText] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft !== null) return draft;
    }
    return DEFAULT_SAMPLE_TEXT;
  });

  const [fontSize, setFontSize] = useState<number>(16);
  const [pitch, setPitch] = useState<PitchOption>('alto'); // As shown in photo: "Alto"
  const [speed, setSpeed] = useState<number>(1.0); // 1.0 or selectable
  const [highlightEnabled, setHighlightEnabled] = useState<boolean>(true);
  
  // Female voice profile selection
  const [selectedProfileId, setSelectedProfileId] = useState<string>('es-es-1');
  const [isVoiceDropdownOpen, setIsVoiceDropdownOpen] = useState<boolean>(false);
  const voiceDropdownRef = useRef<HTMLDivElement | null>(null);

  const [isSavedModalOpen, setIsSavedModalOpen] = useState<boolean>(false);
  const [isSaveAsModalOpen, setIsSaveAsModalOpen] = useState<boolean>(false);
  const [savedFiles, setSavedFiles] = useState<SavedFile[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const activeWordRef = useRef<HTMLElement | null>(null);
  const highlightContainerRef = useRef<HTMLDivElement | null>(null);

  // Current active female voice profile
  const currentProfile = useMemo(() => {
    return (
      FEMALE_VOICE_PROFILES.find((p) => p.id === selectedProfileId) ||
      FEMALE_VOICE_PROFILES[0]
    );
  }, [selectedProfileId]);

  // Close voice dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        voiceDropdownRef.current &&
        !voiceDropdownRef.current.contains(e.target as Node)
      ) {
        setIsVoiceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // System voices inspection and candidate selection
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const updateVoices = () => {
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        setSystemVoices(v);
      }
    };
    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Filter and distribute candidate female voices from browser
  const candidateVoices = useMemo(() => {
    const spanish = systemVoices.filter((v) =>
      v.lang.toLowerCase().replace('_', '-').startsWith('es')
    );
    const femaleKeywords = [
      'helena',
      'monica',
      'mónica',
      'laura',
      'paulina',
      'victoria',
      'lucia',
      'lucía',
      'elvira',
      'carmen',
      'conchita',
      'penelope',
      'penélope',
      'marta',
      'marisol',
      'ines',
      'inés',
      'sabina',
      'paloma',
      'ximena',
      'mia',
      'female',
      'mujer',
    ];
    const femaleSpanish = spanish.filter((v) => {
      const name = v.name.toLowerCase();
      return femaleKeywords.some((kw) => name.includes(kw));
    });

    if (femaleSpanish.length > 0) return femaleSpanish;
    if (spanish.length > 0) return spanish;
    return systemVoices;
  }, [systemVoices]);

  // Pick voice URI for the selected profile
  const voiceForCurrentProfile = useMemo(() => {
    if (candidateVoices.length === 0) return '';
    const profileIndex = FEMALE_VOICE_PROFILES.findIndex(
      (p) => p.id === selectedProfileId
    );
    const safeIndex = profileIndex >= 0 ? profileIndex : 0;
    const picked = candidateVoices[safeIndex % candidateVoices.length];
    return picked ? picked.voiceURI : '';
  }, [candidateVoices, selectedProfileId]);

  // Use Speech hook
  const {
    isPlaying,
    isPaused,
    currentTime,
    totalDuration,
    wordCount,
    charCount,
    currentWordCharIndex,
    play,
    pause,
    stop,
    togglePlay,
    skipBackward,
    skipForward,
    seekTo,
  } = useSpeech({
    text,
    speed,
    pitch,
    selectedVoiceURI: voiceForCurrentProfile,
    voicePitchMultiplier: currentProfile.pitchMultiplier,
    voiceRateMultiplier: currentProfile.rateMultiplier,
    highlightEnabled,
  });

  // Save draft text
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, text);
    } catch {
      // ignore
    }
  }, [text]);

  // Load saved files from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSavedFiles(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Auto-scroll highlight into view when speaking
  useEffect(() => {
    if (
      highlightEnabled &&
      isPlaying &&
      activeWordRef.current &&
      highlightContainerRef.current
    ) {
      activeWordRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [currentWordCharIndex, isPlaying, highlightEnabled]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3000);
  };

  // Save current text
  const handleSaveFile = (title: string) => {
    const newFile: SavedFile = {
      id: Date.now().toString(),
      title,
      content: text,
      createdAt: Date.now(),
      wordCount,
      charCount,
    };
    const updated = [newFile, ...savedFiles];
    setSavedFiles(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      showToast(`«${title}» guardado correctamente`);
    } catch {
      showToast('Error al guardar en el almacenamiento local');
    }
  };

  // Delete saved file
  const handleDeleteFile = (id: string) => {
    const updated = savedFiles.filter((f) => f.id !== id);
    setSavedFiles(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      showToast('Archivo eliminado');
    } catch {
      // ignore
    }
  };

  // Load saved file
  const handleLoadFile = (file: SavedFile) => {
    stop();
    setText(file.content);
    showToast(`Archivo «${file.title}» cargado`);
  };

  // File upload reader
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        stop();
        setText(content);
        showToast(`Archivo «${file.name}» cargado`);
      }
    };
    reader.onerror = () => {
      showToast('No se pudo leer el archivo seleccionado');
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  // Drag and drop file
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        stop();
        setText(content);
        showToast(`Archivo «${file.name}» cargado`);
      }
    };
    reader.readAsText(file);
  };

  // Clear text - deja en blanco la caja de texto al pulsarlo el usuario
  const handleClear = () => {
    stop();
    setText('');
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.setItem(DRAFT_KEY, '');
    } catch {
      // ignore
    }
    showToast('Texto borrado');
  };

  // Copy text to clipboard
  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Texto copiado al portapapeles');
  };

  // Time formatter mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Progress ratio
  const progressRatio =
    totalDuration > 0 ? Math.min(1, currentTime / totalDuration) : 0;

  // Render text with word highlighting if enabled and playing/paused
  const renderHighlightedContent = () => {
    if (!text) return null;

    if (!highlightEnabled || !currentWordCharIndex) {
      return <span className="whitespace-pre-wrap">{text}</span>;
    }

    const { start, length } = currentWordCharIndex;
    const safeStart = Math.max(0, Math.min(start, text.length));
    const safeEnd = Math.max(safeStart, Math.min(safeStart + length, text.length));

    const before = text.slice(0, safeStart);
    const activeWord = text.slice(safeStart, safeEnd);
    const after = text.slice(safeEnd);

    return (
      <span className="whitespace-pre-wrap leading-relaxed select-text">
        {before}
        <span
          ref={activeWordRef}
          className="bg-teal-200 text-teal-950 font-semibold px-1 py-0.5 rounded transition-colors shadow-xs"
        >
          {activeWord}
        </span>
        {after}
      </span>
    );
  };

  // Keyboard shortcut: Space to toggle play/pause when not typing in textarea or input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.code === 'Space' &&
        (e.target as HTMLElement).tagName !== 'TEXTAREA' &&
        (e.target as HTMLElement).tagName !== 'INPUT'
      ) {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-gray-800 flex flex-col items-center py-6 px-3 sm:px-6">
      {/* Toast feedback */}
      {toastMessage && (
        <div className="fixed top-5 z-50 bg-gray-900/90 text-white px-4 py-2 rounded-full text-xs sm:text-sm font-medium shadow-lg backdrop-blur-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-200">
          <Check className="w-4 h-4 text-teal-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container mirroring the original reader layout */}
      <div className="w-full max-w-2xl flex flex-col items-center">
        {/* In-App PWA Install Prompt for Android Chrome & Desktop */}
        <PWAInstallButton />

        <div className="w-full bg-white rounded-3xl shadow-sm border border-gray-200/80 p-5 sm:p-8 flex flex-col items-center relative">
        {/* Top Voice Selector (exact pill dropdown with vertical menu as in user photo) */}
        <div className="w-full flex justify-center mb-6 relative z-30" ref={voiceDropdownRef}>
          <div className="relative inline-block w-64 sm:w-72">
            {/* Trigger Button */}
            <button
              type="button"
              onClick={() => setIsVoiceDropdownOpen((prev) => !prev)}
              aria-expanded={isVoiceDropdownOpen}
              className="w-full flex items-center justify-between bg-white border border-gray-300 text-gray-700 text-sm sm:text-base font-normal py-1.5 px-4 rounded-md shadow-2xs hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 cursor-pointer"
            >
              <span className="flex-1 text-center font-normal">{currentProfile.label}</span>
              <ChevronDown
                className={`w-4 h-4 text-gray-500 transition-transform duration-200 shrink-0 ${
                  isVoiceDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Dropdown Menu (matching user image October 06, 2026 - 5:32PM) */}
            {isVoiceDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-xl border border-gray-200/90 overflow-hidden py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="divide-y divide-gray-200/80 max-h-80 overflow-y-auto">
                  {FEMALE_VOICE_PROFILES.map((profile) => {
                    const isSelected = profile.id === selectedProfileId;
                    return (
                      <button
                        key={profile.id}
                        type="button"
                        onClick={() => {
                          setSelectedProfileId(profile.id);
                          setIsVoiceDropdownOpen(false);
                          stop();
                          showToast(`Voz seleccionada: ${profile.label} (${profile.description})`);
                        }}
                        className={`w-full py-2.5 px-4 text-center text-sm font-normal transition-colors cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-teal-50/80 text-teal-900 font-medium'
                            : 'text-gray-800 hover:bg-gray-50/90'
                        }`}
                      >
                        <span className="text-sm tracking-tight">{profile.label}</span>
                        <span className="text-[11px] text-gray-400 font-normal">
                          {profile.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Secondary Controls Bar: TT (Font Size), Tone (Pitch), Speed (Gauge) */}
        <div className="w-full flex items-center justify-around sm:justify-between px-2 sm:px-12 mb-6 text-gray-700 gap-3">
          {/* Font Size Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-base sm:text-lg tracking-tight select-none flex items-center justify-center text-gray-700">
              TT
            </span>
            <div className="relative">
              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="appearance-none bg-white border border-gray-300 text-gray-700 text-xs sm:text-sm font-medium py-1 pl-2.5 pr-6 rounded-md shadow-2xs hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 cursor-pointer"
              >
                {FONT_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-gray-500">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Tone / Pitch Selector */}
          <div className="flex items-center gap-1.5">
            <div className="text-gray-700 flex items-center" title="Tono de voz adicional">
              <svg
                className="w-5 h-5 text-gray-700"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 11a7 7 0 0 1-7 7m0 0a7 7 0 0 1-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 0 1-3-3V5a3 3 0 1 1 6 0v6a3 3 0 0 1-3 3z" />
              </svg>
            </div>
            <div className="relative">
              <select
                value={pitch}
                onChange={(e) => setPitch(e.target.value as PitchOption)}
                className="appearance-none bg-white border border-gray-300 text-gray-700 text-xs sm:text-sm font-medium py-1 pl-2.5 pr-6 rounded-md shadow-2xs hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 cursor-pointer"
              >
                {PITCH_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-gray-500">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Speed Selector (Gauge icon) */}
          <div className="flex items-center gap-1.5">
            <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
            <div className="relative">
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="appearance-none bg-white border border-gray-300 text-gray-700 text-xs sm:text-sm font-medium py-1 pl-2.5 pr-6 rounded-md shadow-2xs hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 cursor-pointer"
              >
                {SPEED_OPTIONS.map((rate) => (
                  <option key={rate} value={rate}>
                    {rate}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-gray-500">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                  <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Text Area Box */}
        <div
          className={`relative w-full rounded-2xl border ${
            isDraggingFile ? 'border-teal-500 bg-teal-50/20' : 'border-gray-300 bg-white'
          } shadow-2xs transition-all overflow-hidden flex flex-col group`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingFile(true);
          }}
          onDragLeave={() => setIsDraggingFile(false)}
          onDrop={handleDrop}
        >
          {/* Active Highlight view when playing and highlight is enabled */}
          {isPlaying && highlightEnabled ? (
            <div
              ref={highlightContainerRef}
              style={{ fontSize: `${fontSize}px` }}
              className="w-full h-56 sm:h-64 p-4 sm:p-5 overflow-y-auto text-gray-800 leading-relaxed font-normal bg-white"
            >
              {renderHighlightedContent()}
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe o pega aquí el texto que deseas escuchar..."
              style={{ fontSize: `${fontSize}px` }}
              className="w-full h-56 sm:h-64 p-4 sm:p-5 resize-y text-gray-800 leading-relaxed font-normal focus:outline-none focus:ring-1 focus:ring-teal-500/30 rounded-2xl border-none"
            />
          )}

          {/* Quick corner tools (copy, paste sample if empty) */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {text.length > 0 && (
              <button
                onClick={handleCopy}
                title="Copiar texto"
                className="p-1.5 text-gray-400 hover:text-gray-700 bg-white/90 hover:bg-gray-100 rounded-lg shadow-2xs transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* Drag overlay hint */}
          {isDraggingFile && (
            <div className="absolute inset-0 bg-teal-500/10 backdrop-blur-2xs flex items-center justify-center pointer-events-none">
              <span className="text-teal-800 font-semibold bg-white/90 px-4 py-2 rounded-xl shadow-xs text-sm">
                Suelta el archivo para cargarlo
              </span>
            </div>
          )}
        </div>

        {/* Counter: 0 Caracteres · 0 Palabras */}
        <div className="w-full text-center py-3.5 text-gray-600 font-normal text-sm sm:text-base tracking-wide select-none">
          {charCount} Caracteres · {wordCount} Palabras
        </div>

        {/* Action Buttons Row (Guardar, Tus archivos, Cargar archivo, Resaltar, Borrar) */}
        <div className="w-full flex items-center justify-around sm:justify-between px-2 sm:px-6 mb-7 text-[#0e6552]">
          {/* Guardar */}
          <button
            onClick={() => {
              if (!text.trim()) {
                showToast('Introduce texto antes de guardar');
                return;
              }
              setIsSaveAsModalOpen(true);
            }}
            className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
          >
            <div className="p-1 text-[#0e6552] group-hover:scale-105 transition-transform">
              <Save className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[#0e6552] group-hover:underline">Guardar</span>
          </button>

          {/* Tus archivos */}
          <button
            onClick={() => setIsSavedModalOpen(true)}
            className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
          >
            <div className="p-1 text-[#0e6552] group-hover:scale-105 transition-transform">
              <Folder className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[#0e6552] group-hover:underline">Tus archivos</span>
          </button>

          {/* Cargar archivo */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
          >
            <div className="p-1 text-[#0e6552] group-hover:scale-105 transition-transform">
              <FileUp className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[#0e6552] group-hover:underline">Cargar archivo</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.rtf,.doc,.docx"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Resaltar */}
          <button
            onClick={() => setHighlightEnabled((prev) => !prev)}
            className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
          >
            <div
              className={`p-1 text-[#0e6552] group-hover:scale-105 transition-transform relative ${
                highlightEnabled ? 'opacity-100' : 'opacity-50'
              }`}
            >
              <Highlighter className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
              {highlightEnabled && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-teal-500" />
              )}
            </div>
            <span className={`text-xs sm:text-sm font-medium text-[#0e6552] group-hover:underline ${!highlightEnabled && 'opacity-60'}`}>
              Resaltar
            </span>
          </button>

          {/* Borrar - deja en blanco la caja de texto al pulsarlo */}
          <button
            onClick={handleClear}
            className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
            title="Borrar texto y dejarlo en blanco"
          >
            <div className="p-1 text-[#0e6552] group-hover:scale-105 transition-transform">
              <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
            </div>
            <span className="text-xs sm:text-sm font-medium text-[#0e6552] group-hover:underline">Borrar</span>
          </button>
        </div>

        {/* Audio Player Scrubber & Controls */}
        <div className="w-full flex flex-col items-center px-1 sm:px-4">
          {/* Time & Scrubber Bar */}
          <div className="w-full flex items-center gap-3 sm:gap-4 text-gray-600 text-sm sm:text-base font-normal mb-5">
            <span className="w-10 text-right tabular-nums select-none">{formatTime(currentTime)}</span>

            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min="0"
                max={Math.max(1, totalDuration)}
                value={Math.min(currentTime, Math.max(1, totalDuration))}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const ratio = totalDuration > 0 ? val / totalDuration : 0;
                  seekTo(ratio);
                }}
                className="w-full h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-[#0e6552] focus:outline-none"
                style={{
                  background: `linear-gradient(to right, #0e6552 0%, #0e6552 ${
                    progressRatio * 100
                  }%, #d1d5db ${progressRatio * 100}%, #d1d5db 100%)`,
                }}
              />
            </div>

            <span className="w-10 text-left tabular-nums select-none">{formatTime(totalDuration)}</span>
          </div>

          {/* Playback Controls (<<, ▶ / ⏸, >>) */}
          <div className="flex items-center justify-center gap-8 sm:gap-10 text-[#0e6552]">
            {/* << (Rewind / Previous sentence) */}
            <button
              onClick={skipBackward}
              title="Retroceder"
              className="p-2 text-[#0e6552] hover:opacity-75 active:scale-95 transition-transform cursor-pointer"
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7 fill-current" viewBox="0 0 24 24">
                <path d="M11 5L3 12L11 19V5ZM20 5L12 12L20 19V5Z" />
              </svg>
            </button>

            {/* ▶ / ⏸ Play / Pause */}
            <button
              onClick={togglePlay}
              title={isPlaying ? 'Pausar' : 'Reproducir'}
              className="p-3 text-[#0e6552] hover:opacity-85 active:scale-95 transition-transform cursor-pointer flex items-center justify-center"
            >
              {isPlaying ? (
                <svg className="w-8 h-8 sm:w-9 sm:h-9 fill-current" viewBox="0 0 24 24">
                  <path d="M6 19H10V5H6V19ZM14 5V19H18V5H14Z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 sm:w-9 sm:h-9 fill-current translate-x-0.5" viewBox="0 0 24 24">
                  <path d="M8 5V19L19 12L8 5Z" />
                </svg>
              )}
            </button>

            {/* >> (Fast forward / Next sentence) */}
            <button
              onClick={skipForward}
              title="Avanzar"
              className="p-2 text-[#0e6552] hover:opacity-75 active:scale-95 transition-transform cursor-pointer"
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7 fill-current" viewBox="0 0 24 24">
                <path d="M4 19L12 12L4 5V19ZM13 19L21 12L13 5V19Z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sin publicidad */}
        </div>
      </div>

      {/* Clean bottom badge */}
      <div className="mt-4 flex items-center gap-1.5 text-xs text-gray-500 select-none">
        <Sparkles className="w-3.5 h-3.5 text-teal-600" />
        <span>Versión sin publicidad · 100% privado y optimizado</span>
      </div>

      {/* Offline connectivity indicator */}
      <OfflineIndicator />

      {/* Modals */}
      <SavedFilesModal
        isOpen={isSavedModalOpen}
        onClose={() => setIsSavedModalOpen(false)}
        files={savedFiles}
        onLoadFile={handleLoadFile}
        onDeleteFile={handleDeleteFile}
      />

      <SaveFileModal
        isOpen={isSaveAsModalOpen}
        onClose={() => setIsSaveAsModalOpen(false)}
        onSave={handleSaveFile}
        defaultTitle={
          text.trim()
            ? text.trim().slice(0, 30) + (text.length > 30 ? '...' : '')
            : 'Texto sin título'
        }
      />
    </div>
  );
}

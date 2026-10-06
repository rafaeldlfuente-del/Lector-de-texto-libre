import { useState, useEffect, useRef, useCallback } from 'react';
import { PitchOption, PITCH_OPTIONS } from '../types';

export interface UseSpeechProps {
  text: string;
  speed: number;
  pitch: PitchOption;
  selectedVoiceURI: string;
  voicePitchMultiplier?: number;
  voiceRateMultiplier?: number;
  highlightEnabled: boolean;
  onSentenceChange?: (sentenceIndex: number, wordStart?: number, wordLength?: number) => void;
}

export function useSpeech({
  text,
  speed,
  pitch,
  selectedVoiceURI,
  voicePitchMultiplier = 1.0,
  voiceRateMultiplier = 1.0,
  highlightEnabled,
  onSentenceChange,
}: UseSpeechProps) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [currentSentenceIdx, setCurrentSentenceIdx] = useState<number>(0);
  const [currentWordCharIndex, setCurrentWordCharIndex] = useState<{ start: number; length: number } | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  // Keep refs for active playback
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  const currentSentenceIdxRef = useRef(currentSentenceIdx);
  currentSentenceIdxRef.current = currentSentenceIdx;

  const speedRef = useRef(speed);
  speedRef.current = speed;

  const pitchRef = useRef(pitch);
  pitchRef.current = pitch;

  const selectedVoiceURIRef = useRef(selectedVoiceURI);
  selectedVoiceURIRef.current = selectedVoiceURI;

  const voicePitchMultiplierRef = useRef(voicePitchMultiplier);
  voicePitchMultiplierRef.current = voicePitchMultiplier;

  const voiceRateMultiplierRef = useRef(voiceRateMultiplier);
  voiceRateMultiplierRef.current = voiceRateMultiplier;

  const timerRef = useRef<number | null>(null);

  // Split text into meaningful sentences
  const sentences = useRef<string[]>([]);
  const sentenceCharOffsets = useRef<number[]>([]);

  const parseSentences = useCallback((rawText: string) => {
    if (!rawText.trim()) {
      sentences.current = [];
      sentenceCharOffsets.current = [];
      return;
    }

    // Match sentences ending in punctuation or linebreaks, or chunks of words
    const regex = /[^.!?\n]+[.!?\n]+|[^.!?\n]+$/g;
    const matches: string[] = [];
    const offsets: number[] = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(rawText)) !== null) {
      if (match[0].trim().length > 0) {
        matches.push(match[0]);
        offsets.push(match.index);
      }
    }

    if (matches.length === 0 && rawText.length > 0) {
      matches.push(rawText);
      offsets.push(0);
    }

    sentences.current = matches;
    sentenceCharOffsets.current = offsets;
  }, []);

  // Update sentences when text changes
  useEffect(() => {
    parseSentences(text);
    if (!isPlayingRef.current && !isPausedRef.current) {
      setCurrentSentenceIdx(0);
      setCurrentWordCharIndex(null);
      setCurrentTime(0);
    }
  }, [text, parseSentences]);

  // Load available voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return;
    }

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      if (available && available.length > 0) {
        setVoices(available);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Word count & estimated total time
  const words = text.trim() ? text.trim().split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;
  const charCount = text.length;

  // Approximate total duration in seconds based on 130 words per minute at 1.0 speed
  const wordsPerSecond = Math.max(0.5, (130 / 60) * speed);
  const totalDuration = wordCount > 0 ? Math.max(2, Math.round(wordCount / wordsPerSecond)) : 0;

  // Stop speaking
  const stop = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentSentenceIdx(0);
    setCurrentWordCharIndex(null);
    setCurrentTime(0);
  }, []);

  // Play a specific sentence index
  const speakSentence = useCallback(
    (index: number) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      if (index >= sentences.current.length || index < 0) {
        stop();
        return;
      }

      window.speechSynthesis.cancel();

      const sentenceText = sentences.current[index];
      const utterance = new SpeechSynthesisUtterance(sentenceText);

      // Voice
      const foundVoice = voices.find((v) => v.voiceURI === selectedVoiceURIRef.current);
      if (foundVoice) {
        utterance.voice = foundVoice;
      }

      // Pitch calculation: base user pitch * female voice profile pitch multiplier
      const pitchCfg = PITCH_OPTIONS.find((p) => p.id === pitchRef.current);
      const basePitch = pitchCfg ? pitchCfg.value : 1.0;
      const finalPitch = Math.min(2.0, Math.max(0.1, basePitch * (voicePitchMultiplierRef.current || 1.0)));
      utterance.pitch = finalPitch;

      // Rate / Speed calculation: base speed * profile rate modifier
      const finalRate = Math.min(2.0, Math.max(0.1, speedRef.current * (voiceRateMultiplierRef.current || 1.0)));
      utterance.rate = finalRate;

      // Word boundary event for highlighting
      utterance.onboundary = (e) => {
        if (e.name === 'word') {
          const sentenceOffset = sentenceCharOffsets.current[index] || 0;
          const wordStart = sentenceOffset + e.charIndex;
          const wordLength = e.charLength || 5;

          setCurrentWordCharIndex({
            start: wordStart,
            length: wordLength,
          });

          if (onSentenceChange) {
            onSentenceChange(index, wordStart, wordLength);
          }
        }
      };

      utterance.onend = () => {
        if (isPlayingRef.current && !isPausedRef.current) {
          const nextIdx = index + 1;
          if (nextIdx < sentences.current.length) {
            setCurrentSentenceIdx(nextIdx);
            speakSentence(nextIdx);
          } else {
            // Finished all
            stop();
          }
        }
      };

      utterance.onerror = (err) => {
        if (err.error !== 'canceled' && err.error !== 'interrupted') {
          console.warn('Speech synthesis error:', err);
        }
      };

      setCurrentSentenceIdx(index);
      window.speechSynthesis.speak(utterance);
    },
    [voices, stop, onSentenceChange]
  );

  // Play / Resume
  const play = useCallback(() => {
    if (!text.trim()) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    parseSentences(text);
    if (sentences.current.length === 0) return;

    setIsPlaying(true);
    setIsPaused(false);
    const startIdx = currentSentenceIdx < sentences.current.length ? currentSentenceIdx : 0;
    speakSentence(startIdx);
  }, [text, isPaused, currentSentenceIdx, parseSentences, speakSentence]);

  // Pause
  const pause = useCallback(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  }, [isPlaying]);

  // Toggle play/pause
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Skip backward
  const skipBackward = useCallback(() => {
    if (sentences.current.length === 0) return;
    const prev = Math.max(0, currentSentenceIdx - 1);
    setCurrentSentenceIdx(prev);
    if (isPlaying) {
      speakSentence(prev);
    } else {
      // update time estimate
      const progressRatio = prev / Math.max(1, sentences.current.length);
      setCurrentTime(Math.round(progressRatio * totalDuration));
    }
  }, [currentSentenceIdx, isPlaying, speakSentence, totalDuration]);

  // Skip forward
  const skipForward = useCallback(() => {
    if (sentences.current.length === 0) return;
    const next = Math.min(sentences.current.length - 1, currentSentenceIdx + 1);
    setCurrentSentenceIdx(next);
    if (isPlaying) {
      speakSentence(next);
    } else {
      const progressRatio = next / Math.max(1, sentences.current.length);
      setCurrentTime(Math.round(progressRatio * totalDuration));
    }
  }, [currentSentenceIdx, isPlaying, speakSentence, totalDuration]);

  // Seek by ratio (0 to 1)
  const seekTo = useCallback(
    (ratio: number) => {
      if (sentences.current.length === 0) return;
      const targetIndex = Math.min(
        sentences.current.length - 1,
        Math.floor(ratio * sentences.current.length)
      );
      setCurrentSentenceIdx(targetIndex);
      setCurrentTime(Math.round(ratio * totalDuration));
      if (isPlaying) {
        speakSentence(targetIndex);
      }
    },
    [isPlaying, speakSentence, totalDuration]
  );

  // Keep time synced smoothly during active playback
  useEffect(() => {
    if (isPlaying && !isPaused) {
      timerRef.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          if (prev < totalDuration) {
            return prev + 1;
          }
          return prev;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isPlaying, isPaused, totalDuration]);

  // Chrome resume watchdog to prevent pause bug after 15s
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      if (window.speechSynthesis?.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  return {
    voices,
    isPlaying,
    isPaused,
    currentSentenceIdx,
    currentWordCharIndex: highlightEnabled ? currentWordCharIndex : null,
    currentTime,
    totalDuration,
    wordCount,
    charCount,
    play,
    pause,
    stop,
    togglePlay,
    skipBackward,
    skipForward,
    seekTo,
  };
}

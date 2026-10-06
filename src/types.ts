export interface SavedFile {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  wordCount: number;
  charCount: number;
}

export type PitchOption = 'muy_bajo' | 'bajo' | 'normal' | 'alto' | 'muy_alto';

export interface PitchConfig {
  id: PitchOption;
  label: string;
  value: number; // 0.6 to 1.6
}

export const PITCH_OPTIONS: PitchConfig[] = [
  { id: 'muy_bajo', label: 'Muy bajo', value: 0.6 },
  { id: 'bajo', label: 'Bajo', value: 0.8 },
  { id: 'normal', label: 'Normal', value: 1.0 },
  { id: 'alto', label: 'Alto', value: 1.3 },
  { id: 'muy_alto', label: 'Muy alto', value: 1.6 },
];

export const SPEED_OPTIONS: number[] = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export const FONT_SIZES: number[] = [12, 14, 16, 18, 20, 22, 24, 28, 32];

export interface FemaleVoiceProfile {
  id: string;
  label: string;
  description: string;
  pitchMultiplier: number;
  rateMultiplier: number;
}

export const FEMALE_VOICE_PROFILES: FemaleVoiceProfile[] = [
  {
    id: 'es-es-1',
    label: 'español (España) 1',
    description: 'Tono natural equilibrado',
    pitchMultiplier: 1.05,
    rateMultiplier: 1.0,
  },
  {
    id: 'es-es-2',
    label: 'español (España) 2',
    description: 'Tono agudo y brillante',
    pitchMultiplier: 1.25,
    rateMultiplier: 1.0,
  },
  {
    id: 'es-es-3',
    label: 'español (España) 3',
    description: 'Tono suave y relajado',
    pitchMultiplier: 0.95,
    rateMultiplier: 0.98,
  },
  {
    id: 'es-es-4',
    label: 'español (España) 4',
    description: 'Tono cálido y envolvente',
    pitchMultiplier: 0.86,
    rateMultiplier: 0.98,
  },
  {
    id: 'es-es-5',
    label: 'español (España) 5',
    description: 'Tono juvenil y dinámico',
    pitchMultiplier: 1.35,
    rateMultiplier: 1.02,
  },
  {
    id: 'es-es-6',
    label: 'español (España) 6',
    description: 'Tono narradora melodiosa',
    pitchMultiplier: 1.15,
    rateMultiplier: 0.95,
  },
  {
    id: 'es-es-7',
    label: 'español (España) 7',
    description: 'Tono dulce y fino',
    pitchMultiplier: 1.45,
    rateMultiplier: 1.0,
  },
  {
    id: 'es-es-8',
    label: 'español (España) 8',
    description: 'Tono profesional y claro',
    pitchMultiplier: 1.10,
    rateMultiplier: 1.0,
  },
  {
    id: 'es-es-9',
    label: 'español (España) 9',
    description: 'Tono sereno y profundo',
    pitchMultiplier: 0.78,
    rateMultiplier: 0.96,
  },
];

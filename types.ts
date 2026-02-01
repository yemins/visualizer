export enum TrackType {
  VOCAL = 'VOCAL',
  INSTRUMENTAL = 'INSTRUMENTAL',
  COMBINED = 'COMBINED',
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  READY_TO_ENHANCE = 'READY_TO_ENHANCE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export enum FileFormat {
  FLAC = 'audio/flac',
  WAV = 'audio/wav',
  MP3 = 'audio/mpeg',
}

export interface AudioTrackState {
  id: string;
  file: File | null;
  originalUrl: string | null;
  enhancedUrl: string | null;
  status: ProcessingStatus;
  type: TrackType;
  duration: number; // in seconds
  analysisReport?: string;
}

export interface AppConfig {
  workflow: 'SPLIT' | 'SINGLE';
  inputSource: 'FILE' | 'MICROPHONE' | 'SPOTIFY' | 'YOUTUBE';
  visualizerMode: 'PARTICLE_SPHERE' | 'FRACTAL_RIBBON' | 'MONSTERCAT' | 'NEBULA' | 'GEOMETRY_MORPH' | 'KINETIC_PLANE';
  immersive: boolean;
}

export interface VisualizerConfig {
  mode: AppConfig['visualizerMode'];
  color: string;
  sensitivity: number;
}
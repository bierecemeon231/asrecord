export type RecordingType = 'video' | 'audio';

export type VideoQuality = '1080p' | '720p' | '480p';
export type VideoFps = 30 | 60;
export type VideoBitrate = 'high' | 'medium' | 'low';

export type AudioFormat = 'mp3' | 'wav';
export type AudioSourceOption = 'both' | 'system' | 'mic' | 'none';

export type AudioBitrate = 128 | 192 | 320;

export interface VideoSettings {
  quality: VideoQuality;
  fps: VideoFps;
  bitrate: VideoBitrate;
  audioSource: AudioSourceOption;
}

export interface AudioSettings {
  format: AudioFormat;
  source: 'both' | 'system' | 'mic';
  bitrate: AudioBitrate;
}

export interface TimerOption {
  enabled: boolean;
  durationSeconds: number; // e.g., 30, 60, 300, 600, 1800 or custom
  customMinutes?: number;
}

export interface SaveSettings {
  customPath: string;
  directoryHandle: any | null; // FileSystemDirectoryHandle if available
  autoDownload: boolean;
  autoUploadDrive: boolean;
  driveFolderName: string;
}

export interface HotkeyConfig {
  startStop: string; // e.g. "Alt+R"
  pauseResume: string; // e.g. "Alt+P"
  toggleMic: string; // e.g. "Alt+M"
  screenshot: string; // e.g. "Alt+S"
}

export interface RecordingItem {
  id: string;
  title: string;
  type: RecordingType;
  format: string; // "mp4", "webm", "mp3", "wav"
  blobUrl: string;
  blob: Blob;
  duration: number; // in seconds
  size: number; // bytes
  createdAt: string;
  quality?: string; // e.g., "1080p 60fps"
  driveFileId?: string;
  driveViewLink?: string;
  uploadStatus?: 'idle' | 'uploading' | 'success' | 'error';
  uploadError?: string;
  localPath?: string;
}

export interface UserAuth {
  user: any | null;
  accessToken: string | null;
  loading: boolean;
}

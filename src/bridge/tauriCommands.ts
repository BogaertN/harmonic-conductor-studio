import { invoke } from "@tauri-apps/api/core";

export type WaveformSummary = {
  sample_count: number;
  peak_abs: number;
  rms: number;
};

export type PreviewReport = {
  status: string;
  score_hash: string;
  score_json_bytes: number;
  sample_rate_hz: number;
  sample_count: number;
  waveform_summary: WaveformSummary;
};

export type MusicPreviewReport = {
  status: string;
  title: string;
  score_hash: string;
  tempo_bpm: number;
  meter: string;
  tuning_mode: string;
  track_count: number;
  note_count: number;
  music_sample_rate_hz: number;
  music_sample_count: number;
  music_duration_seconds: number;
  music_waveform_summary: WaveformSummary;
  combined_sample_count: number;
  combined_duration_seconds: number;
  combined_waveform_summary: WaveformSummary;
};

export type WavRenderReport = {
  status: string;
  output_path: string;
  wav_bytes: number;
  wav_hash: string;
  sample_rate_hz: number;
  sample_count: number;
  duration_seconds: number;
  waveform_summary: WaveformSummary;
};

export type PlaybackReport = {
  status: string;
  message: string;
  device: string;
  sample_format: string;
  sample_rate_hz: number;
  channels: number;
  sample_count: number;
  duration_seconds: number;
  waveform_summary: WaveformSummary;
};

export type StopReport = {
  status: string;
  message: string;
};

export async function previewScoreReport(): Promise<PreviewReport> {
  return await invoke<PreviewReport>("preview_score_report");
}

export async function previewSeedMusicReport(): Promise<MusicPreviewReport> {
  return await invoke<MusicPreviewReport>("preview_seed_music_report");
}

export async function renderFirstGestureWav(): Promise<WavRenderReport> {
  return await invoke<WavRenderReport>("render_first_gesture_wav");
}

export async function renderSeedMusicWav(): Promise<WavRenderReport> {
  return await invoke<WavRenderReport>("render_seed_music_wav");
}

export async function renderSeedCombinedWav(): Promise<WavRenderReport> {
  return await invoke<WavRenderReport>("render_seed_combined_wav");
}

export async function playFirstGestureAudio(): Promise<PlaybackReport> {
  return await invoke<PlaybackReport>("play_first_gesture_audio");
}

export async function playSeedMusicAudio(): Promise<PlaybackReport> {
  return await invoke<PlaybackReport>("play_seed_music_audio");
}

export async function playSeedCombinedAudio(): Promise<PlaybackReport> {
  return await invoke<PlaybackReport>("play_seed_combined_audio");
}

export async function stopPlayback(): Promise<StopReport> {
  return await invoke<StopReport>("stop_playback");
}

export async function getAudioDeviceReport(): Promise<unknown> {
  return await invoke("get_audio_device_report");
}

export async function getGestureVocabulary(): Promise<unknown> {
  return await invoke("get_gesture_vocabulary");
}

export async function createDefaultScore(): Promise<unknown> {
  return await invoke("create_default_score");
}

export async function createSeedMusicScore(): Promise<unknown> {
  return await invoke("create_seed_music_score");
}

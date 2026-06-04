import { invoke } from "@tauri-apps/api/core";

export type PreviewReport = {
  status: string;
  score_hash: string;
  score_json_bytes: number;
  sample_rate_hz: number;
  sample_count: number;
  waveform_summary: {
    sample_count: number;
    peak_abs: number;
    rms: number;
  };
};

export async function previewScoreReport(): Promise<PreviewReport> {
  return await invoke<PreviewReport>("preview_score_report");
}

export async function getGestureVocabulary(): Promise<unknown> {
  return await invoke("get_gesture_vocabulary");
}

export async function createDefaultScore(): Promise<unknown> {
  return await invoke("create_default_score");
}

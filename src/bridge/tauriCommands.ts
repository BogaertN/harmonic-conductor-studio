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

export type ProjectFileReport = {
  status: string;
  action: string;
  project_dir: string;
  file_name: string;
  path: string;
  bytes: number;
  file_hash: string;
  score_hash: string;
  title: string;
  format: string;
  version: string;
  note_count: number;
  conductor_event_count: number;
  warnings: string[];
};

export type ProjectListReport = {
  status: string;
  project_dir: string;
  project_count: number;
  projects: Array<{
    file_name: string;
    path: string;
    bytes: number;
    modified_unix_seconds: number | null;
    title: string | null;
    score_hash: string | null;
    note_count: number | null;
    conductor_event_count: number | null;
    warnings: string[];
  }>;
  warnings: string[];
};

export type NotationLayoutReport = {
  strategy: string;
  title: string;
  tempo_bpm: number;
  meter: string;
  tuning_mode: string;
  beats_per_measure: number;
  beat_unit: number;
  quarter_note_ms: number;
  total_duration_ms: number;
  total_duration_seconds: number;
  total_beats: number;
  measure_count: number;
  voice_count: number;
  note_count: number;
  conductor_cue_count: number;
  voices: Array<{
    track_id: string;
    role: string;
    display_name: string;
    staff_y_percent: number;
    note_count: number;
    notes: Array<{
      event_index: number;
      track_id: string;
      role: string;
      midi_note: number;
      note_name: string;
      frequency_hz: number;
      start_ms: number;
      duration_ms: number;
      end_ms: number;
      start_beat: number;
      duration_beats: number;
      measure_index: number;
      beat_in_measure: number;
      x_percent: number;
      width_percent: number;
      y_percent: number;
      velocity: number;
      resonance_lane: string;
    }>;
  }>;
  cue_strip: Array<{
    event_index: number;
    gesture_id: string;
    gesture_name: string;
    operator: string | null;
    field_region: string;
    anchor: string;
    start_ms: number;
    duration_ms: number;
    end_ms: number;
    start_beat: number;
    duration_beats: number;
    measure_index: number;
    beat_in_measure: number;
    x_percent: number;
    width_percent: number;
    cue_text: string;
  }>;
  selected_note: {
    track_id: string;
    role: string;
    midi_note: number;
    note_name: string;
    frequency_hz: number;
    start_ms: number;
    duration_ms: number;
    start_beat: number;
    duration_beats: number;
    measure_index: number;
    beat_in_measure: number;
    velocity: number;
    resonance_lane: string;
  } | null;
  warnings: string[];
};

export type ConductorMotionPoint = {
  time_ms: number;
  time_seconds: number;
  x: number;
  y: number;
  gesture_id: string;
  event_index: number;
  field_region: string;
  intensity: number;
};

export type ConductorMotionReport = {
  strategy: string;
  track_id: string;
  event_count: number;
  total_duration_ms: number;
  total_duration_seconds: number;
  event_views: Array<{
    event_index: number;
    gesture_id: string;
    gesture_name: string;
    operator: string | null;
    field_region: string;
    anchor: string;
    start_ms: number;
    duration_ms: number;
    end_ms: number;
    start_seconds: number;
    duration_seconds: number;
    start_x: number;
    start_y: number;
    target_x: number;
    target_y: number;
    intensity: number;
    motion_label: string;
  }>;
  sampled_points: ConductorMotionPoint[];
  warnings: string[];
};

export type ConductorMappingReport = {
  strategy: string;
  piece_title: string;
  source_track_id: string;
  source_note_count: number;
  generated_event_count: number;
  music_duration_ms: number;
  conductor_duration_ms: number;
  alignment_delta_ms: number;
  alignment_status: string;
  generated_events: Array<{
    event_index: number;
    source_note_name: string;
    source_midi_note: number;
    source_start_ms: number;
    source_duration_ms: number;
    source_movement: string;
    gesture_id: string;
    operator: string;
    field_region: string;
    start_ms: number;
    duration_ms: number;
    end_ms: number;
    intensity: number;
    rationale: string;
  }>;
  warnings: string[];
};

export type MusicTimelineReport = {
  tempo_bpm: number;
  meter: string;
  tuning_mode: string;
  track_count: number;
  total_note_count: number;
  total_duration_ms: number;
  total_duration_seconds: number;
  tracks: Array<{
    track_id: string;
    role: string;
    note_count: number;
    track_duration_ms: number;
    track_duration_seconds: number;
    notes: Array<{
      event_index: number;
      track_id: string;
      role: string;
      midi_note: number;
      note_name: string;
      frequency_hz: number;
      start_ms: number;
      duration_ms: number;
      end_ms: number;
      start_beat: number;
      duration_beats: number;
      velocity: number;
      movement_from_previous: string;
      resonance_lane: string;
    }>;
  }>;
};

export type GestureTimelineReport = {
  track_id: string;
  event_count: number;
  total_duration_ms: number;
  total_duration_seconds: number;
  events: Array<{
    event_index: number;
    gesture_id: string;
    gesture_name: string;
    operator: string | null;
    field_region: string;
    anchor: string;
    start_ms: number;
    duration_ms: number;
    end_ms: number;
    start_seconds: number;
    duration_seconds: number;
    intensity: number;
    cue_text: string;
  }>;
};

export type ResonanceLevelBundle = {
  piece_title: string;
  source_summary: {
    tempo_bpm: number;
    meter: string;
    tuning_mode: string;
    music_track_count: number;
    total_note_count: number;
    conductor_event_count: number;
  };
  beginner_view: Array<{
    block_index: number;
    note_label: string;
    start_ms: number;
    duration_ms: number;
    start_beat: number;
    duration_beats: number;
    movement: string;
    resonance_lane: string;
    beginner_instruction: string;
  }>;
  note_name_view: Array<{
    event_index: number;
    midi_note: number;
    note_name: string;
    start_ms: number;
    duration_ms: number;
    start_beat: number;
    duration_beats: number;
    velocity: number;
  }>;
  conductor_view: Array<{
    cue_index: number;
    gesture_id: string;
    operator: string | null;
    field_region: string;
    start_ms: number;
    duration_ms: number;
    intensity: number;
    cue_text: string;
  }>;
  accessibility_guidance: string[];
  professional_boundary: string;
};

export async function listSavedProjects(): Promise<ProjectListReport> {
  return await invoke<ProjectListReport>("list_saved_projects");
}

export async function saveCurrentProjectAs(fileName: string): Promise<ProjectFileReport> {
  return await invoke<ProjectFileReport>("save_current_project_as", { fileName });
}

export async function openProjectByFileName(fileName: string): Promise<ProjectFileReport> {
  return await invoke<ProjectFileReport>("open_project_by_file_name", { fileName });
}

export async function previewScoreReport(): Promise<PreviewReport> {
  return await invoke<PreviewReport>("preview_score_report");
}

export async function previewSeedMusicReport(): Promise<MusicPreviewReport> {
  return await invoke<MusicPreviewReport>("preview_seed_music_report");
}

export async function getSeedResonanceLevelBundle(): Promise<ResonanceLevelBundle> {
  return await invoke<ResonanceLevelBundle>("get_seed_resonance_level_bundle");
}

export async function getCurrentResonanceLevelBundle(): Promise<ResonanceLevelBundle> {
  return await invoke<ResonanceLevelBundle>("get_current_resonance_level_bundle");
}

export async function getCurrentConductorMotionReport(): Promise<ConductorMotionReport> {
  return await invoke<ConductorMotionReport>("get_current_conductor_motion_report");
}

export async function getGeneratedConductorMotionReport(): Promise<ConductorMotionReport> {
  return await invoke<ConductorMotionReport>("get_generated_conductor_motion_report");
}

export async function getCurrentConductorMappingReport(): Promise<ConductorMappingReport> {
  return await invoke<ConductorMappingReport>("get_current_conductor_mapping_report");
}

export async function applyGeneratedConductorMappingToCurrentScore(): Promise<ConductorMappingReport> {
  return await invoke<ConductorMappingReport>("apply_generated_conductor_mapping_to_current_score");
}

export async function playGeneratedConductorMappingAudio(): Promise<PlaybackReport> {
  return await invoke<PlaybackReport>("play_generated_conductor_mapping_audio");
}

export async function playGeneratedMappedCombinedAudio(): Promise<PlaybackReport> {
  return await invoke<PlaybackReport>("play_generated_mapped_combined_audio");
}

export async function renderGeneratedMappedCombinedWav(): Promise<WavRenderReport> {
  return await invoke<WavRenderReport>("render_generated_mapped_combined_wav");
}

export async function loadSeedMusicProject(): Promise<unknown> {
  return await invoke("load_seed_music_project");
}

export async function getCurrentProjectScore(): Promise<unknown> {
  return await invoke("get_current_project_score");
}

export async function getCurrentNotationLayout(): Promise<NotationLayoutReport> {
  return await invoke<NotationLayoutReport>("get_current_notation_layout");
}

export async function getCurrentMusicTimeline(): Promise<MusicTimelineReport> {
  return await invoke<MusicTimelineReport>("get_current_music_timeline");
}

export async function appendNoteToCurrentTrack(
  trackId: string,
  midiNote: number,
  durationMs: number,
  velocity: number
): Promise<MusicTimelineReport> {
  return await invoke<MusicTimelineReport>("append_note_to_current_track", {
    trackId,
    midiNote,
    durationMs,
    velocity
  });
}

export async function clearCurrentMusicTrack(trackId: string): Promise<MusicTimelineReport> {
  return await invoke<MusicTimelineReport>("clear_current_music_track", { trackId });
}

export async function resetCurrentMusicToSeed(): Promise<MusicTimelineReport> {
  return await invoke<MusicTimelineReport>("reset_current_music_to_seed");
}

export async function playCurrentProjectMusicAudio(): Promise<PlaybackReport> {
  return await invoke<PlaybackReport>("play_current_project_music_audio");
}

export async function renderCurrentProjectMusicWav(): Promise<WavRenderReport> {
  return await invoke<WavRenderReport>("render_current_project_music_wav");
}

export async function getCurrentGestureTimeline(): Promise<GestureTimelineReport> {
  return await invoke<GestureTimelineReport>("get_current_gesture_timeline");
}

export async function appendGestureToCurrentScore(
  gestureId: string,
  durationMs: number,
  intensity: number,
  operator: string | null
): Promise<GestureTimelineReport> {
  return await invoke<GestureTimelineReport>("append_gesture_to_current_score", {
    gestureId,
    durationMs,
    intensity,
    operator
  });
}

export async function clearCurrentGestureTimeline(): Promise<GestureTimelineReport> {
  return await invoke<GestureTimelineReport>("clear_current_gesture_timeline");
}

export async function resetCurrentGestureTimelineToStandardPath(): Promise<GestureTimelineReport> {
  return await invoke<GestureTimelineReport>("reset_current_gesture_timeline_to_standard_path");
}

export async function playCurrentProjectConductorAudio(): Promise<PlaybackReport> {
  return await invoke<PlaybackReport>("play_current_project_conductor_audio");
}

export async function playCurrentProjectCombinedAudio(): Promise<PlaybackReport> {
  return await invoke<PlaybackReport>("play_current_project_combined_audio");
}

export async function renderCurrentProjectCombinedWav(): Promise<WavRenderReport> {
  return await invoke<WavRenderReport>("render_current_project_combined_wav");
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

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

export type HfieldPacketContractReport = {
  status: string;
  contract_id: string;
  file_format: string;
  file_version: string;
  packet_kind: string;
  packet_role: string;
  source_system: string;
  target_systems: string[];
  analog_bridge_intent: string;
  root_frequency_hz: number;
  phase_count: number;
  phase_order: number[];
  anchor_layout: string;
  payload_layers: string[];
  render_targets: string[];
  forge_bridge_status: string;
  forge_bridge_profile: string;
  provenance_contract_id: string;
  artifact_id: string;
  artifact_kind: string;
  custody_model: string;
  disclosure_class: string;
  identity_vault_status: string;
  creator_principal_bound: boolean;
  contributor_count: number;
  parent_artifact_count: number;
  derivative_chain_count: number;
  forge_trace_ref_bound: boolean;
  memory_capsule_ref_bound: boolean;
  authority_receipt_ref_bound: boolean;
  consent_event_ref_bound: boolean;
  provenance_hash_bound: boolean;
  raw_private_identity_exported: boolean;
  public_identity_authorized: boolean;
  economic_processing_authorized: boolean;
  portable_rights_authorized: boolean;
  note_count: number;
  conductor_event_count: number;
  packet_hash: string;
  readiness: {
    hcs_readable: boolean;
    analog_renderable: boolean;
    forge_bridge_reserved: boolean;
    forge_runtime_bound: boolean;
  };
  custody_readiness: {
    identity_vault_reference_only: boolean;
    private_identity_contained: boolean;
    creator_bound: boolean;
    provenance_hash_bound: boolean;
    public_disclosure_authorized: boolean;
    economic_processing_authorized: boolean;
    portable_rights_authorized: boolean;
  };
  fatal_errors: string[];
  warnings: string[];
};



export type HfieldCymaticReaderSurfaceReport = {
  strategy: string;
  status: string;
  cymatic_reader_contract_id: string;
  source_field_contract_id: string;
  source_field_hash: string;
  title: string;
  root_frequency_hz: number;
  phase_order: number[];
  phase_grid_rows: number[][];
  reader_model: string;
  color_profile_id: string;
  standard_frequency_reference: string;
  glass_reader: {
    label: string;
    role: string;
    material_model: string;
    width_units: number;
    height_units: number;
    thickness_units: number;
    orientation: string;
    time_axis: string;
    frequency_axis: string;
    displacement_axis: string;
    opacity_hint: number;
  };
  anchor_colors: Array<{
    phase: number;
    phase_role: string;
    anchor_role: string;
    base_frequency_hz: number;
    color_hex: string;
    hue_degrees: number;
    semantic_note: string;
  }>;
  active_tones: Array<{
    tone_index: number;
    event_kind: string;
    source_track_id: string;
    source_role: string;
    phase: number;
    anchor_phase: number;
    note_name: string | null;
    gesture_id: string | null;
    frequency_hz: number;
    amplitude: number;
    start_ms: number;
    duration_ms: number;
    end_ms: number;
    color_hex: string;
    hue_degrees: number;
    spatial_x: number;
    spatial_y: number;
    spatial_z: number;
  }>;
  reader_surface: {
    x_segments: number;
    t_segments: number;
    vertex_count: number;
    triangle_count: number;
    max_abs_displacement: number;
    polyphonic_interference_count: number;
    vertices: Array<{
      vertex_index: number;
      x_norm: number;
      time_norm: number;
      time_ms: number;
      displacement: number;
      intensity: number;
      active_tone_count: number;
      dominant_phase: number;
      dominant_frequency_hz: number;
      color_hex: string;
      r: number;
      g: number;
      b: number;
    }>;
  };
  interference_slices: Array<{
    slice_index: number;
    time_ms: number;
    time_norm: number;
    active_tone_count: number;
    dominant_phase: number;
    dominant_frequency_hz: number;
    constructive_energy: number;
    destructive_energy: number;
    net_displacement: number;
    color_hex: string;
  }>;
  ambient_field_points: Array<{
    point_index: number;
    time_ms: number;
    time_norm: number;
    phase: number;
    frequency_hz: number;
    amplitude: number;
    x: number;
    y: number;
    z: number;
    color_hex: string;
    role: string;
  }>;
  deterministic_reader_hash: string;
  warnings: string[];
};

export type HfieldFieldSynthesisReport = {
  strategy: string;
  status: string;
  field_contract_id: string;
  title: string;
  source_format: string;
  source_version: string;
  root_frequency_hz: number;
  phase_count: number;
  phase_order: number[];
  phase_grid_rows: number[][];
  anchor_layout: string;
  renderer_intent: string;
  open_source_renderer_profile: string;
  time_window: {
    start_ms: number;
    end_ms: number;
    duration_ms: number;
    duration_seconds: number;
  };
  phase_nodes: Array<{
    phase: number;
    label: string;
    role: string;
    anchor_role: string;
    conductor_order_index: number;
    conductor_grid_row: number;
    conductor_grid_col: number;
    x: number;
    y: number;
    z: number;
    base_frequency_hz: number;
  }>;
  anchors: {
    center_1: HfieldFieldSynthesisReport["phase_nodes"][number];
    lower_5: HfieldFieldSynthesisReport["phase_nodes"][number];
    upper_9: HfieldFieldSynthesisReport["phase_nodes"][number];
  };
  harmonic_events: Array<{
    event_kind: string;
    source_track_id: string;
    source_role: string;
    event_index: number;
    phase: number;
    anchor_phase: number;
    field_region: string;
    note_name: string | null;
    gesture_id: string | null;
    operator: string | null;
    frequency_hz: number;
    amplitude: number;
    start_ms: number;
    duration_ms: number;
    end_ms: number;
    time_norm_start: number;
    time_norm_end: number;
    phase_angle_rad: number;
    x: number;
    y: number;
    z: number;
    cymatic_radius: number;
    cymatic_displacement: number;
  }>;
  cymatic_wave_samples: Array<{
    sample_index: number;
    source_event_index: number;
    event_kind: string;
    time_ms: number;
    time_norm: number;
    phase: number;
    frequency_hz: number;
    amplitude: number;
    x: number;
    y: number;
    z: number;
    radial_displacement: number;
    coherence_weight: number;
  }>;
  field_trace: Array<{
    point_index: number;
    time_ms: number;
    time_norm: number;
    phase: number;
    x: number;
    y: number;
    z: number;
    field_region: string;
    intensity: number;
  }>;
  total_note_count: number;
  total_conductor_event_count: number;
  deterministic_field_hash: string;
  ready_for_3d_viewport: boolean;
  ready_for_cymatic_mesh: boolean;
  warnings: string[];
};

export type ForgePacketBridgeStubReport = {
  status: string;
  bridge_contract_id: string;
  execution_mode: string;
  source_system: string;
  target_system: string;
  bridge_profile: string;
  packet_contract_id: string;
  packet_status: string;
  packet_hash: string;
  score_hash: string;
  artifact_id: string;
  provenance_hash: string;
  identity_vault_ref: string | null;
  forge_runtime_ref: string | null;
  symbolic_trace_ref: string | null;
  validation_ref: string | null;
  memory_capsule_ref: string | null;
  payload: {
    packet_kind: string;
    packet_role: string;
    root_frequency_hz: number;
    phase_count: number;
    phase_order: number[];
    anchor_layout: string;
    payload_layers: string[];
    render_targets: string[];
    note_count: number;
    conductor_event_count: number;
  };
  export_policy: {
    forge_bridge_reserved: boolean;
    forge_runtime_bound: boolean;
    live_execution_authorized: boolean;
    private_identity_exported: boolean;
    public_disclosure_authorized: boolean;
    economic_processing_authorized: boolean;
    portable_rights_authorized: boolean;
    safe_for_reference_export: boolean;
  };
  warnings: string[];
  fatal_errors: string[];
};

export type PlayheadCursorReport = {
  strategy: string;
  title: string;
  status: string;
  current_time_ms: number;
  current_time_seconds: number;
  total_duration_ms: number;
  total_duration_seconds: number;
  progress_percent: number;
  score_cursor_x_percent: number;
  tempo_bpm: number;
  meter: string;
  beats_per_measure: number;
  beat_unit: number;
  quarter_note_ms: number;
  current_absolute_beat: number;
  current_measure: number;
  current_beat_in_measure: number;
  active_note_count: number;
  active_notes: Array<{
    event_index: number;
    track_id: string;
    role: string;
    midi_note: number;
    note_name: string;
    frequency_hz: number;
    start_ms: number;
    duration_ms: number;
    end_ms: number;
    measure_index: number;
    beat_in_measure: number;
    velocity: number;
    resonance_lane: string;
  }>;
  next_note: {
    event_index: number;
    track_id: string;
    note_name: string;
    start_ms: number;
    measure_index: number;
    beat_in_measure: number;
  } | null;
  active_conductor_cue: {
    event_index: number;
    gesture_id: string;
    operator: string | null;
    start_ms: number;
    duration_ms: number;
    end_ms: number;
    measure_index: number;
    beat_in_measure: number;
    intensity: number;
  } | null;
  next_conductor_cue: {
    event_index: number;
    gesture_id: string;
    operator: string | null;
    start_ms: number;
    measure_index: number;
    beat_in_measure: number;
  } | null;
  active_gesture_id: string | null;
  active_operator: string | null;
  warnings: string[];
};

export type LoopPhraseReport = {
  strategy: string;
  status: string;
  title: string;
  phrase_id: string;
  requested_start_measure: number;
  requested_end_measure: number;
  start_measure: number;
  end_measure: number;
  total_measure_count: number;
  beats_per_measure: number;
  beat_unit: number;
  tempo_bpm: number;
  quarter_note_ms: number;
  start_ms: number;
  end_ms: number;
  duration_ms: number;
  start_beat: number;
  end_beat: number;
  start_cursor_x_percent: number;
  end_cursor_x_percent: number;
  included_note_count: number;
  included_conductor_cue_count: number;
  notes: Array<{
    event_index: number;
    track_id: string;
    role: string;
    midi_note: number;
    note_name: string;
    frequency_hz: number;
    original_start_ms: number;
    original_end_ms: number;
    clipped_start_ms: number;
    clipped_end_ms: number;
    phrase_start_ms: number;
    phrase_duration_ms: number;
    measure_index: number;
    beat_in_measure: number;
    velocity: number;
  }>;
  conductor_cues: Array<{
    event_index: number;
    gesture_id: string;
    operator: string | null;
    original_start_ms: number;
    original_end_ms: number;
    clipped_start_ms: number;
    clipped_end_ms: number;
    phrase_start_ms: number;
    phrase_duration_ms: number;
    measure_index: number;
    beat_in_measure: number;
    intensity: number;
  }>;
  playhead_geometry_policy: string;
  loop_ready: boolean;
  warnings: string[];
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

  packet_status: string;
  packet_contract_id: string;
  migration_status: string;
  migration_changed_fields: string[];
  canonical_hash: string;
  fatal_errors: string[];
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
    event_index: number;
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

export type NotationEditReport = {
  status: string;
  action: string;
  selected_note: NotationLayoutReport["selected_note"];
  layout: NotationLayoutReport;
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

export async function getCurrentHfieldPacketContractReport(): Promise<HfieldPacketContractReport> {
  return await invoke<HfieldPacketContractReport>("get_current_hfield_packet_contract_report");
}

export async function getCurrentHfieldCymaticReaderSurfaceReport(): Promise<HfieldCymaticReaderSurfaceReport> {
  return await invoke<HfieldCymaticReaderSurfaceReport>("get_current_hfield_cymatic_reader_surface_report");
}

export async function getCurrentHfieldFieldSynthesisReport(): Promise<HfieldFieldSynthesisReport> {
  return await invoke<HfieldFieldSynthesisReport>("get_current_hfield_field_synthesis_report");
}

export async function getCurrentForgePacketBridgeStubReport(): Promise<ForgePacketBridgeStubReport> {
  return await invoke<ForgePacketBridgeStubReport>("get_current_forge_packet_bridge_stub_report");
}

export async function getCurrentPlayheadCursorReport(timeMs: number): Promise<PlayheadCursorReport> {
  return await invoke<PlayheadCursorReport>("get_current_playhead_cursor_report", { timeMs });
}


export async function getCurrentLoopPhraseReport(startMeasure: number, endMeasure: number): Promise<LoopPhraseReport> {
  return await invoke<LoopPhraseReport>("get_current_loop_phrase_report", { startMeasure, endMeasure });
}

export async function playCurrentProjectPhraseCombinedAudio(startMeasure: number, endMeasure: number): Promise<PlaybackReport> {
  return await invoke<PlaybackReport>("play_current_project_phrase_combined_audio", { startMeasure, endMeasure });
}

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

export async function selectCurrentNotationNote(
  trackId: string,
  eventIndex: number
): Promise<NotationLayoutReport["selected_note"]> {
  return await invoke<NotationLayoutReport["selected_note"]>("select_current_notation_note", {
    trackId,
    eventIndex
  });
}

export async function editCurrentNotationNote(
  trackId: string,
  eventIndex: number,
  midiNote: number,
  durationMs: number,
  velocity: number,
  targetTrackId: string
): Promise<NotationEditReport> {
  return await invoke<NotationEditReport>("edit_current_notation_note", {
    trackId,
    eventIndex,
    midiNote,
    durationMs,
    velocity,
    targetTrackId
  });
}


export async function positionCurrentNotationNoteStartMs(
  trackId: string,
  eventIndex: number,
  startMs: number
): Promise<NotationEditReport> {
  return await invoke<NotationEditReport>("position_current_notation_note_start_ms", {
    trackId,
    eventIndex,
    startMs
  });
}

export async function positionCurrentNotationNoteMeasureBeat(
  trackId: string,
  eventIndex: number,
  measureIndex: number,
  beatInMeasure: number
): Promise<NotationEditReport> {
  return await invoke<NotationEditReport>("position_current_notation_note_measure_beat", {
    trackId,
    eventIndex,
    measureIndex,
    beatInMeasure
  });
}

export async function nudgeCurrentNotationNoteBeats(
  trackId: string,
  eventIndex: number,
  beatDelta: number
): Promise<NotationEditReport> {
  return await invoke<NotationEditReport>("nudge_current_notation_note_beats", {
    trackId,
    eventIndex,
    beatDelta
  });
}

export async function deleteCurrentNotationNote(
  trackId: string,
  eventIndex: number
): Promise<NotationEditReport> {
  return await invoke<NotationEditReport>("delete_current_notation_note", {
    trackId,
    eventIndex
  });
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

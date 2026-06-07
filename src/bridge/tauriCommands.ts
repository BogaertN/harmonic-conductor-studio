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

export type ExportFileReport = {
  status: string;
  export_kind: string;
  file_name: string;
  output_path: string;
  export_dir: string;
  bytes: number;
  file_hash: string;
  created_unix_seconds: number;
};


export type HfieldCanonicalBundleManifestExportReport = {
  status: string;
  export_kind: string;
  manifest_contract_id: string;
  bundle_id: string;
  bundle_dir: string;
  bundle_manifest_hash: string;
  manifest_file_hash: string;
  manifest_file: unknown;
  artifact_count: number;
  artifact_manifest: unknown[];
  authority_boundaries: {
    private_identity_export_disabled: boolean;
    public_identity_disabled: boolean;
    economic_processing_disabled: boolean;
    portable_rights_disabled: boolean;
    live_identity_vault_write_performed: boolean;
    forge_mutation_performed: boolean;
    forge_bridge_execution_mode: string;
    forge_bridge_live_execution_authorized: boolean;
  };
  replay_verifier_fields: unknown;
};




export type HfieldNineGestureConductorEngineReport = {
  status: string;
  contract_id: string;
  gesture_vocabulary_id: string;
  engine_role: string;
  source_score_gesture_vocabulary: string;
  field_layout_id: string;
  root_frequency_hz: number;
  research_basis: unknown;
  authority_boundaries: {
    physical_definition_is_core_logic: boolean;
    candidate_interpretation_is_editable: boolean;
    forge_operational_meaning_locked: boolean;
    mutates_forge: boolean;
    performs_identity_vault_write: boolean;
    exports_private_identity: boolean;
    authorizes_health_or_sensor_claims: boolean;
  };
  field_geometry: unknown;
  conducting_law: unknown;
  primitive_count: number;
  primitives: unknown[];
  current_score_scan: unknown;
};


export type HfieldHarmonicFieldScoreV1UpgradeReport = {
  status: string;
  contract_id: string;
  problem_statement_id: string;
  render_view_registry_id: string;
  source_object_role: string;
  problem_statement: unknown;
  authority_boundaries: {
    harmonic_field_score_is_source: boolean;
    hfield_container_is_persistence_shell: boolean;
    standard_notation_is_view: boolean;
    piano_roll_is_view: boolean;
    tablature_is_view: boolean;
    audio_is_rendering: boolean;
    waveform_is_measurement_display: boolean;
    three_d_field_is_rendering: boolean;
    cymatic_surface_is_rendering: boolean;
    forge_bridge_is_adapter: boolean;
    mutates_forge: boolean;
    performs_identity_vault_write: boolean;
    exports_private_identity: boolean;
    authorizes_health_or_sensor_claims: boolean;
  };
  source_layer_count: number;
  source_layers: unknown[];
  render_view_count: number;
  render_views: unknown[];
  accessibility_policy: unknown;
  current_score_inventory: unknown;
  readiness_gates: unknown;
  next_schema_work: string[];
};


export type HfieldCouplingProfileEngineV1Report = {
  status: string;
  contract_id: string;
  registry_id: string;
  engine_role: string;
  active_profile_id: string;
  normalized_profile_id: string;
  profile_status: string;
  authority_boundaries: {
    harmonic_field_score_remains_source: boolean;
    coupling_profile_is_binding_logic: boolean;
    renderers_are_downstream: boolean;
    open_source_libraries_may_render_parse_or_export: boolean;
    open_source_libraries_are_source_authority: boolean;
    mutates_forge: boolean;
    performs_identity_vault_write: boolean;
    exports_private_identity: boolean;
    authorizes_health_or_sensor_claims: boolean;
  };
  source_inputs: unknown[];
  profile_registry: unknown[];
  coupling_laws: unknown[];
  renderer_bindings: unknown[];
  open_source_dependency_policy: unknown;
  current_score_scan: unknown;
  readiness_gates: unknown;
  next_work: string[];
};


export type HfieldMotifLibraryAnnotationLayerV1Report = {
  status: string;
  contract_id: string;
  registry_id: string;
  layer_role: string;
  authority_boundaries: {
    motifs_are_reusable_source_fragments: boolean;
    annotations_are_attached_metadata: boolean;
    annotations_are_forge_operational_meaning: boolean;
    renderers_may_display_motifs: boolean;
    motif_layer_can_authorize_forge_action: boolean;
    open_source_pattern_tools_are_source_authority: boolean;
    mutates_forge: boolean;
    performs_identity_vault_write: boolean;
    exports_private_identity: boolean;
    authorizes_health_or_sensor_claims: boolean;
  };
  motif_definition_policy: unknown;
  annotation_lifecycle: unknown;
  annotation_classes: unknown[];
  source_bindings: unknown[];
  motif_candidates: unknown[];
  current_score_scan: unknown;
  readiness_gates: unknown;
  open_source_dependency_policy: unknown;
  next_work: string[];
};



export type HfieldDeterministicAudioEngineV2Report = {
  status: string;
  contract_id: string;
  profile_id: string;
  engine_role: string;
  sample_rate_hz: number;
  deterministic_policy: unknown;
  authority_boundaries: {
    audio_is_rendering: boolean;
    harmonic_field_score_remains_source: boolean;
    audio_hash_is_artifact_receipt: boolean;
    audio_hash_is_source_hash: boolean;
    open_source_audio_tools_may_encode_or_analyze: boolean;
    open_source_audio_tools_are_source_authority: boolean;
    mutates_forge: boolean;
    performs_identity_vault_write: boolean;
    exports_private_identity: boolean;
    authorizes_health_or_sensor_claims: boolean;
  };
  source_inventory: unknown;
  render_plan: unknown[];
  output_summary: {
    sample_count: number;
    duration_seconds: number;
    peak_abs: number;
    rms: number;
    nonzero_sample_count: number;
    clipped_sample_count: number;
    finite_sample_count: number;
    pcm_i16_blake3_hash: string;
  };
  readiness_gates: unknown;
  open_source_dependency_policy: unknown;
  next_work: string[];
};


export type HfieldTrueConductorGestureReferenceManifestV1Report = {
  status: string;
  contract_id: string;
  profile_id: string;
  manifest_role: string;
  research_basis: unknown;
  authority_boundaries: {
    manifest_is_rust_owned: boolean;
    references_are_renderer_inputs: boolean;
    references_are_forge_operational_meaning: boolean;
    replaces_generic_reference_overlay: boolean;
    may_drive_later_gesture_aware_field_renderer: boolean;
    mutates_forge: boolean;
    performs_identity_vault_write: boolean;
    exports_private_identity: boolean;
    authorizes_health_or_sensor_claims: boolean;
  };
  coordinate_policy: unknown;
  conducting_operator_manifest: unknown[];
  reference_count: number;
  references: unknown[];
  current_score_scan: unknown;
  readiness_gates: unknown;
  next_work: string[];
};


export type HfieldGestureAwareFieldRendererV2Report = {
  status: string;
  contract_id: string;
  profile_id: string;
  renderer_role: string;
  source_field_contract_id: string;
  true_gesture_manifest_contract_id: string;
  authority_boundaries: {
    renderer_reads_harmonic_field_score: boolean;
    renderer_consumes_true_gesture_manifest: boolean;
    renderer_may_infer_missing_gesture_geometry: boolean;
    renderer_outputs_are_source_authority: boolean;
    renderer_outputs_are_forge_operational_meaning: boolean;
    mutates_forge: boolean;
    performs_identity_vault_write: boolean;
    exports_private_identity: boolean;
    authorizes_health_or_sensor_claims: boolean;
  };
  renderer_contract: unknown;
  field_time_window: unknown;
  anchor_render_nodes: unknown[];
  renderer_layers: unknown[];
  gesture_path_count: number;
  gesture_paths: unknown[];
  current_score_scan: unknown;
  readiness_gates: unknown;
  deterministic_renderer_hash: string;
  next_work: string[];
};


export type HfieldCymaticFieldModelV2Report = {
  status: string;
  contract_id: string;
  profile_id: string;
  model_role: string;
  source_reader_contract_id: string;
  source_field_contract_id: string;
  gesture_aware_renderer_contract_id: string;
  authority_boundaries: {
    model_reads_harmonic_field_score: boolean;
    model_reads_cymatic_reader_surface_v1: boolean;
    model_reads_gesture_aware_renderer_v2: boolean;
    model_outputs_are_rendering_data: boolean;
    model_outputs_are_source_authority: boolean;
    model_outputs_are_physical_sensor_measurements: boolean;
    model_outputs_are_forge_operational_meaning: boolean;
    open_source_simulation_tools_are_source_authority: boolean;
    mutates_forge: boolean;
    performs_identity_vault_write: boolean;
    exports_private_identity: boolean;
    authorizes_health_or_sensor_claims: boolean;
  };
  physical_claim_policy: unknown;
  medium_model: unknown;
  model_layers: unknown[];
  nodal_ring_count: number;
  nodal_rings: unknown[];
  resonance_node_count: number;
  resonance_nodes: unknown[];
  gesture_cymatic_path_count: number;
  gesture_cymatic_paths: unknown[];
  interference_summary: unknown;
  current_score_scan: unknown;
  readiness_gates: unknown;
  deterministic_model_hash: string;
  next_work: string[];
};


export type HfieldSyllableShapedExpressionV1Report = {
  status: string;
  contract_id: string;
  profile_id: string;
  expression_role: string;
  authority_boundaries: {
    expression_is_downstream_rendering_model: boolean;
    harmonic_field_score_remains_source: boolean;
    syllable_shapes_are_language_semantics: boolean;
    syllable_shapes_are_phoneme_claims: boolean;
    generates_words_or_lyrics: boolean;
    renderer_outputs_are_source_authority: boolean;
    renderer_outputs_are_forge_operational_meaning: boolean;
    mutates_forge: boolean;
    performs_identity_vault_write: boolean;
    exports_private_identity: boolean;
    authorizes_health_or_sensor_claims: boolean;
  };
  expression_policy: unknown;
  source_inventory: unknown;
  expression_unit_count: number;
  expression_units: unknown[];
  renderer_bindings: unknown[];
  open_source_dependency_policy: unknown;
  readiness_gates: unknown;
  next_work: string[];
};


export type HcsSqliteMotifProjectLibraryV1Report = {
  status: string;
  contract_id: string;
  profile_id?: string;
  schema_version?: string;
  db_path?: string;
  storage_scope?: unknown;
  actual_music_capacity?: unknown;
  counts?: unknown;
  authority_boundaries?: unknown;
  last_action?: unknown;
  projects?: unknown[];
  motifs?: unknown[];
  project_count?: number;
  motif_count?: number;
  actual_music_supported?: boolean;
  next_work?: string[];
  [key: string]: unknown;
};



export type HcsStudioCreationBackendAndPlaceholderPurgeV1Report = {
  status: string;
  contract_id: string;
  schema_version: string;
  workflow_role: string;
  visible_user_workflow: string[];
  production_backed_tools: unknown;
  hidden_or_advanced_only: string[];
  legacy_surfaces: unknown;
  open_source_dependency_policy: unknown;
  authority_boundaries: unknown;
  readiness_gates: unknown;
  next_work: string[];
  [key: string]: unknown;
};



export type HcsKeyFrequencyRegistryV1Record = {
  midi_note: number;
  pitch_label: string;
  frequency_hz: number;
  frequency_hz_rounded_2dp: number;
  tuning_mode: string;
  a4_hz: number;
  a4_midi_note: number;
  formula_id: string;
  authority: string;
  simulated: boolean;
};

export type HcsKeyFrequencyRegistryV1Report = {
  status: string;
  contract_id: string;
  schema_version: string;
  purpose: string;
  tuning_mode: string;
  a4_hz: number;
  a4_midi_note: number;
  formula_id: string;
  full_midi_range: [number, number];
  standard_piano_range: [number, number];
  tracked_key_count: number;
  standard_piano_key_count: number;
  registry: HcsKeyFrequencyRegistryV1Record[];
  standard_piano_registry: HcsKeyFrequencyRegistryV1Record[];
  studio_anchor_keys: HcsKeyFrequencyRegistryV1Record[];
  non_simulation_rules: Record<string, boolean>;
  authority_boundaries: Record<string, boolean>;
};




export type HcsInstrumentRackTrackSoundProfileV1 = {
  track_id: string;
  role: string;
  instrument_id: string;
  level: number;
  muted: boolean;
  soloed: boolean;
  note_count: number;
  assignment_source: string;
  source_authority: string;
  render_authority: string;
};

export type HcsInstrumentRackAndTrackSoundV1Report = {
  status: string;
  contract_id: string;
  schema_version: string;
  purpose: string;
  title: string;
  score_hash: string;
  tempo_bpm: number;
  meter: string;
  track_count: number;
  note_count: number;
  instrument_catalog: Array<Record<string, unknown>>;
  track_sound_profiles: HcsInstrumentRackTrackSoundProfileV1[];
  mixer_features: Record<string, boolean>;
  sync_law: Record<string, unknown>;
  frequency_authority: Record<string, unknown>;
  authority_boundaries: Record<string, boolean>;
};

export type HcsWaveformTo3DFieldBodyV1Report = {
  status: string;
  contract_id: string;
  schema_version: string;
  purpose: string;
  title: string;
  score_hash: string;
  track_count: number;
  note_count: number;
  total_duration_ms: number;
  waveform_bodies: unknown[];
  conversion_rule: Record<string, unknown>;
  glass_reader_placement_rule: Record<string, unknown>;
  authority_boundaries: Record<string, boolean>;
};

export type HcsFluidSynthSoundFontPlaybackReportV1 = {
  status: string;
  contract_id: string;
  schema_version: string;
  soundfont: string;
  runtime: string;
  title: string;
  note_count: number;
  instrument_assignments: unknown[];
  output_midi: string;
  output_wav: string;
  wav_bytes: number;
  os_playback: Record<string, unknown>;
  pitch_authority: Record<string, unknown>;
  fallback_policy: Record<string, unknown>;
  authority_boundaries: Record<string, boolean>;
};

export type HcsComposerStudioCanvasRebuildV1Report = {
  status: string;
  contract_id: string;
  schema_version: string;
  purpose: string;
  title: string;
  score_hash: string;
  tempo_bpm: number;
  meter: string;
  track_count: number;
  note_count: number;
  total_duration_ms: number;
  music_timeline: Record<string, unknown>;
  notation_layout: Record<string, unknown>;
  composer_canvas_policy: Record<string, unknown>;
  single_source_law: Record<string, unknown>;
  authority_boundaries: Record<string, boolean>;
};

export type HcsComposerFirstWorkflowAndSoundFontFoundationV1Report = {
  status: string;
  contract_id: string;
  schema_version: string;
  purpose: string;
  title: string;
  score_hash: string;
  tempo_bpm: number;
  meter: string;
  track_count: number;
  note_count: number;
  composer_workflow_policy: Record<string, unknown>;
  soundfont_foundation: Record<string, unknown>;
  single_source_law: Record<string, unknown>;
  authority_boundaries: Record<string, boolean>;
};

export type HcsProductionNotationRenderSyncV1Report = {
  status: string;
  contract_id: string;
  schema_version: string;
  purpose: string;
  title: string;
  score_hash: string;
  tempo_bpm: number;
  meter: string;
  tuning_mode: string;
  track_count: number;
  note_count: number;
  total_duration_ms: number;
  music_timeline: MusicTimelineReport;
  notation_layout: NotationLayoutReport;
  playhead_zero_sync: unknown;
  sync_law: Record<string, unknown>;
  notation_surface: Record<string, unknown>;
  frequency_authority: Record<string, unknown>;
  authority_boundaries: Record<string, boolean>;
};

export type HcsVirtualKeyboardAndRealtimeNoteEntryV1Report = {
  status: string;
  contract_id: string;
  schema_version: string;
  purpose: string;
  score_hash: string;
  title: string;
  tempo_bpm: number;
  meter: string;
  track_count: number;
  note_count: number;
  music_timeline: MusicTimelineReport;
  notation_layout: NotationLayoutReport;
  input_surfaces: Record<string, boolean>;
  frequency_authority: Record<string, unknown>;
  write_path: Record<string, unknown>;
  authority_boundaries: Record<string, boolean>;
};

export type HcsTrackEditorAndPianoRollV1Report = {
  status: string;
  contract_id: string;
  schema_version: string;
  action: string;
  title: string;
  score_hash: string;
  tempo_bpm: number;
  meter: string;
  tuning_mode: string;
  track_count: number;
  note_count: number;
  total_duration_ms: number;
  total_duration_seconds: number;
  track_summaries: Array<{
    track_id: string;
    role: string;
    note_count: number;
    duration_ms: number;
    duration_seconds: number;
  }>;
  music_timeline: MusicTimelineReport;
  notation_layout: NotationLayoutReport;
  normal_user_surfaces: string[];
  placeholder_policy: Record<string, boolean>;
  score_import_contract: unknown;
  authority_boundaries: Record<string, boolean>;
};

export type HcsProductionPackagingV1Report = {
  status: string;
  contract_id: string;
  profile_id: string;
  schema_version: string;
  packaging_role: string;
  expected_locked_base: unknown;
  release_targets: unknown;
  release_scripts: unknown;
  notices: unknown;
  release_artifact_policy: unknown;
  excluded_from_distribution: string[];
  required_pre_release_gates: string[];
  authority_boundaries: unknown;
  readiness_gates: unknown;
  next_work: string[];
  [key: string]: unknown;
};

export type HfieldSchemaVersionMigrationRegistryReport = {
  status: string;
  contract_id: string;
  generated_unix_seconds: number;
  format_id?: string;
  current_schema_version?: string;
  current_packet_contract_id?: string;
  canonical_bundle_manifest_contract_id?: string;
  export_replay_verifier_contract_id?: string;
  schema_authority?: unknown;
  version_policy?: unknown;
  supported_input_versions?: unknown[];
  registered_migration_steps?: unknown[];
  required_post_migration_gates?: unknown[];
  explicit_non_authorities?: unknown;
  next_schema_registry_work?: unknown[];
  registry?: unknown;
  original_score_schema?: unknown;
  canonical_score_schema?: unknown;
  migration_report?: unknown;
  canonical_score_hash?: string;
  packet_contract_gate?: unknown;
  identity_vault_reference_summary?: unknown;
  authority_boundaries?: unknown;
  registry_result?: unknown;
};

export type HfieldExportReplayVerifierReport = {
  status: "ok" | "failed" | string;
  replay_verifier_contract_id: string;
  verified_unix_seconds: number;
  manifest_path: string;
  manifest_file_hash: string;
  manifest_file_bytes: number;
  bundle_id: unknown;
  source_hfield_score_hash: unknown;
  expected_artifact_count: number;
  verified_artifact_count: number;
  checks: unknown[];
  artifact_reports: unknown[];
  failures: string[];
  warnings: string[];
  authority_result: unknown;
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

export type PlaybackClockReport = {
  status: "idle" | "playing" | "stopped" | "ended" | string;
  clock_role: string;
  sample_rate_hz: number;
  sample_index: number;
  sample_count: number;
  playback_elapsed_ms: number;
  playback_duration_ms: number;
  score_time_offset_ms: number;
  score_time_end_ms: number | null;
  current_time_ms: number;
  progress_percent: number;
  is_active: boolean;
};


export type HfieldIdentityVaultReferenceBindingReport = {
  status: string;
  contract_id: string;
  artifact_id: string;
  vault_profile: string;
  vault_record_ref: string | null;
  public_identity_ref: string | null;
  creator_principal_id: string | null;
  creator_identity_vault_ref: string | null;
  creator_display_label: string | null;
  custody_model: string;
  disclosure_class: string;
  provenance_hash: string | null;
  private_identity_export_disabled: boolean;
  public_identity_disabled: boolean;
  economic_processing_disabled: boolean;
  portable_rights_disabled: boolean;
  live_identity_vault_write_performed: boolean;
  forge_mutation_performed: boolean;
  changed_fields: string[];
  warnings: string[];
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




export type HfieldRuntimeCarrierPacketReport = {
  strategy: string;
  status: string;
  carrier_contract_id: string;
  title: string;
  source_format: string;
  source_version: string;
  packet_kind: string;
  packet_role: string;
  global_file_carrier_frequency_hz: number;
  phase_root_frequency_hz: number;
  identity_carrier: {
    artifact_id: string;
    title_signature: string;
    frequency_hz: number;
    carrier_role: string;
    payload_layer: string;
    phase: number;
    color_hex: string;
    is_global_identity_tone: boolean;
  };
  operating_field: {
    tuning_mode: string;
    meter: string;
    tempo_bpm: number;
    key_signature_proxy: string;
    phase_order: number[];
    phase_grid_rows: number[][];
    carrier_stack_description: string;
  };
  runtime_paths: Array<{
    path_index: number;
    path_id: string;
    display_label: string;
    channel_kind: string;
    source_track_id: string;
    source_role: string;
    instrument_proxy: string;
    carrier_frequency_hz: number;
    anchor_phase: number;
    color_hex: string;
  }>;
  packet_events: Array<{
    event_index: number;
    event_kind: string;
    payload_layer: string;
    runtime_path_id: string;
    source_track_id: string;
    source_role: string;
    note_name: string | null;
    gesture_id: string | null;
    semantic_binding: string;
    carrier_frequency_hz: number;
    payload_frequency_hz: number;
    phase: number;
    anchor_phase: number;
    amplitude: number;
    start_ms: number;
    duration_ms: number;
    end_ms: number;
    time_norm_start: number;
    time_norm_end: number;
    color_hex: string;
  }>;
  information_ripples: Array<{
    ripple_index: number;
    source_event_index: number;
    ripple_kind: string;
    payload_layer: string;
    runtime_path_id: string;
    semantic_binding: string;
    carrier_frequency_hz: number;
    payload_frequency_hz: number;
    phase: number;
    anchor_phase: number;
    start_ms: number;
    duration_ms: number;
    time_norm: number;
    surface_x_norm: number;
    surface_radius_norm: number;
    amplitude: number;
    color_hex: string;
  }>;
  time_slices: Array<{
    slice_index: number;
    time_ms: number;
    time_norm: number;
    scanline_z_norm: number;
    active_ripple_count: number;
    active_carrier_frequencies_hz: number[];
    active_payload_frequencies_hz: number[];
    composite_amplitude: number;
    dominant_payload_layer: string;
    dominant_phase: number;
    dominant_color_hex: string;
  }>;
  readable_packet_model: string;
  deterministic_carrier_hash: string;
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


export type HfieldRustRenderManifestReport = {
  contract_id: string;
  source_coordinate_contract_id: string;
  coordinate_profile: string;
  axis_contract: {
    x: string;
    y: string;
    z: string;
    t: string;
  };
  total_duration_ms: number;
  scan_min_z: number;
  scan_max_z: number;
  field_width: number;
  field_height: number;
  field_bodies: Array<{
    body_id: string;
    source_entry_id: string;
    layer_key: string;
    lane_key: string;
    track_id: string;
    label: string;
    note_name: string | null;
    midi_note: number | null;
    frequency_hz: number;
    start_ms: number;
    duration_ms: number;
    end_ms: number;
    x: number;
    y: number;
    z_start: number;
    z_end: number;
    z_center: number;
    z_body_length: number;
    radius_x: number;
    radius_y: number;
    amplitude: number;
    color_hex: string;
    layer_color_hex: string;
    pitch_color_hex: string;
    render_role: string;
  }>;
  bridge_bodies: Array<{
    bridge_id: string;
    left_body_id: string;
    right_body_id: string;
    overlap_ms: number;
    x: number;
    y: number;
    z_start: number;
    z_end: number;
    z_center: number;
    z_body_length: number;
    radius_x: number;
    radius_y: number;
    color_a_hex: string;
    color_b_hex: string;
    blend_strength: number;
  }>;
  reference_lines: Array<{
    line_id: string;
    line_role: string;
    label: string;
    points: Array<{
      x: number;
      y: number;
      z: number;
    }>;
    color_hex: string;
    opacity: number;
    width: number;
  }>;
  reference_points: Array<{
    point_id: string;
    point_role: string;
    label: string;
    x: number;
    y: number;
    z: number;
    radius: number;
    color_hex: string;
    phase: number | null;
    time_ms: number | null;
    frequency_hz: number | null;
  }>;
  proof_windows: Array<{
    label: string;
    time_ms: number;
    active_payload_count: number;
    active_runtime_count: number;
    active_body_ids: string[];
  }>;
  warnings: string[];
};


export async function getCurrentHfieldIdentityVaultReferenceReport(): Promise<HfieldIdentityVaultReferenceBindingReport> {
  return await invoke<HfieldIdentityVaultReferenceBindingReport>("get_current_hfield_identity_vault_reference_report");
}

export async function bindCurrentHfieldIdentityVaultReference(): Promise<HfieldIdentityVaultReferenceBindingReport> {
  return await invoke<HfieldIdentityVaultReferenceBindingReport>("bind_current_hfield_identity_vault_reference");
}

export async function getCurrentHfieldPacketContractReport(): Promise<HfieldPacketContractReport> {
  return await invoke<HfieldPacketContractReport>("get_current_hfield_packet_contract_report");
}

export async function getCurrentHfieldRuntimeCarrierPacketReport(): Promise<HfieldRuntimeCarrierPacketReport> {
  return await invoke<HfieldRuntimeCarrierPacketReport>("get_current_hfield_runtime_carrier_packet_report");
}

export async function getCurrentHfieldCymaticReaderSurfaceReport(): Promise<HfieldCymaticReaderSurfaceReport> {
  return await invoke<HfieldCymaticReaderSurfaceReport>("get_current_hfield_cymatic_reader_surface_report");
}


export async function getCurrentHfieldRustRenderManifestReport(): Promise<HfieldRustRenderManifestReport> {
  return await invoke<HfieldRustRenderManifestReport>("get_current_hfield_rust_render_manifest_report");
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


export async function exportCurrentHfieldProjectJson(): Promise<ExportFileReport> {
  return await invoke<ExportFileReport>("export_current_hfield_project_json");
}

export async function exportCurrentHfieldPacketContractJson(): Promise<ExportFileReport> {
  return await invoke<ExportFileReport>("export_current_hfield_packet_contract_json");
}

export async function exportCurrentHfieldRuntimeCarrierPacketJson(): Promise<ExportFileReport> {
  return await invoke<ExportFileReport>("export_current_hfield_runtime_carrier_packet_json");
}

export async function exportCurrentHfieldCymaticSurfaceJson(): Promise<ExportFileReport> {
  return await invoke<ExportFileReport>("export_current_hfield_cymatic_surface_json");
}

export async function exportCurrentHfieldRustRenderManifestJson(): Promise<ExportFileReport> {
  return await invoke<ExportFileReport>("export_current_hfield_rust_render_manifest_json");
}

export async function exportCurrentHfieldReaderBundleJson(): Promise<ExportFileReport> {
  return await invoke<ExportFileReport>("export_current_hfield_reader_bundle_json");
}

export async function exportCurrentHfieldCombinedWav(): Promise<WavRenderReport> {
  return await invoke<WavRenderReport>("export_current_hfield_combined_wav");
}


export async function exportCurrentHfieldCanonicalBundleManifestJson(): Promise<HfieldCanonicalBundleManifestExportReport> {
  return await invoke<HfieldCanonicalBundleManifestExportReport>("export_current_hfield_canonical_bundle_manifest_json");
}

export async function exportCurrentHfieldCanonicalBundleManifestV2Json(): Promise<HfieldCanonicalBundleManifestExportReport> {
  return await invoke<HfieldCanonicalBundleManifestExportReport>("export_current_hfield_canonical_bundle_manifest_v2_json");
}



export async function getHcsSqliteMotifProjectLibraryV1Report(): Promise<HcsSqliteMotifProjectLibraryV1Report> {
  return await invoke<HcsSqliteMotifProjectLibraryV1Report>("get_hcs_sqlite_motif_project_library_v1_report");
}

export async function saveCurrentHcsSqliteProjectLibraryV1(): Promise<HcsSqliteMotifProjectLibraryV1Report> {
  return await invoke<HcsSqliteMotifProjectLibraryV1Report>("save_current_hcs_sqlite_project_library_v1");
}

export async function listHcsSqliteProjectLibraryV1(): Promise<HcsSqliteMotifProjectLibraryV1Report> {
  return await invoke<HcsSqliteMotifProjectLibraryV1Report>("list_hcs_sqlite_project_library_v1");
}

export async function openHcsSqliteProjectFromLibraryV1(projectId: string): Promise<HcsSqliteMotifProjectLibraryV1Report> {
  return await invoke<HcsSqliteMotifProjectLibraryV1Report>("open_hcs_sqlite_project_from_library_v1", { projectId });
}

export async function saveCurrentHcsSqliteMotifsV1(): Promise<HcsSqliteMotifProjectLibraryV1Report> {
  return await invoke<HcsSqliteMotifProjectLibraryV1Report>("save_current_hcs_sqlite_motifs_v1");
}

export async function listHcsSqliteMotifsV1(): Promise<HcsSqliteMotifProjectLibraryV1Report> {
  return await invoke<HcsSqliteMotifProjectLibraryV1Report>("list_hcs_sqlite_motifs_v1");
}

export async function saveCurrentHcsSqliteReceiptV1(): Promise<HcsSqliteMotifProjectLibraryV1Report> {
  return await invoke<HcsSqliteMotifProjectLibraryV1Report>("save_current_hcs_sqlite_receipt_v1");
}



export async function getHcsStudioCreationBackendAndPlaceholderPurgeV1Report(): Promise<HcsStudioCreationBackendAndPlaceholderPurgeV1Report> {
  return await invoke<HcsStudioCreationBackendAndPlaceholderPurgeV1Report>("get_hcs_studio_creation_backend_and_placeholder_purge_v1_report");
}

export async function getHcsProductionPackagingV1Report(): Promise<HcsProductionPackagingV1Report> {
  return await invoke<HcsProductionPackagingV1Report>("get_hcs_production_packaging_v1_report");
}

export async function verifyLatestHfieldExportReplayManifestJson(): Promise<HfieldExportReplayVerifierReport> {
  return await invoke<HfieldExportReplayVerifierReport>("verify_latest_hfield_export_replay_manifest_json");
}

export async function verifyHfieldExportReplayManifestJsonByPath(manifestPath: string): Promise<HfieldExportReplayVerifierReport> {
  return await invoke<HfieldExportReplayVerifierReport>("verify_hfield_export_replay_manifest_json_by_path", { manifestPath });
}


export async function getHfieldSchemaVersionMigrationRegistryJson(): Promise<HfieldSchemaVersionMigrationRegistryReport> {
  return await invoke<HfieldSchemaVersionMigrationRegistryReport>("get_hfield_schema_version_migration_registry_json");
}

export async function inspectCurrentHfieldSchemaMigrationRegistryJson(): Promise<HfieldSchemaVersionMigrationRegistryReport> {
  return await invoke<HfieldSchemaVersionMigrationRegistryReport>("inspect_current_hfield_schema_migration_registry_json");
}


export async function getCurrentNineGestureConductorEngineReport(): Promise<HfieldNineGestureConductorEngineReport> {
  return await invoke<HfieldNineGestureConductorEngineReport>("get_current_nine_gesture_conductor_engine_report");
}


export async function getCurrentHarmonicFieldScoreV1UpgradeReport(): Promise<HfieldHarmonicFieldScoreV1UpgradeReport> {
  return await invoke<HfieldHarmonicFieldScoreV1UpgradeReport>("get_current_harmonic_field_score_v1_upgrade_report");
}


export async function getCurrentCouplingProfileEngineV1Report(): Promise<HfieldCouplingProfileEngineV1Report> {
  return await invoke<HfieldCouplingProfileEngineV1Report>("get_current_coupling_profile_engine_v1_report");
}


export async function getCurrentMotifLibraryAnnotationLayerV1Report(): Promise<HfieldMotifLibraryAnnotationLayerV1Report> {
  return await invoke<HfieldMotifLibraryAnnotationLayerV1Report>("get_current_motif_library_annotation_layer_v1_report");
}



export async function getCurrentDeterministicAudioEngineV2Report(): Promise<HfieldDeterministicAudioEngineV2Report> {
  return await invoke<HfieldDeterministicAudioEngineV2Report>("get_current_deterministic_audio_engine_v2_report");
}

export async function exportCurrentDeterministicAudioEngineV2Wav(): Promise<WavRenderReport> {
  return await invoke<WavRenderReport>("export_current_deterministic_audio_engine_v2_wav");
}


export async function getCurrentTrueConductorGestureReferenceManifestV1Report(): Promise<HfieldTrueConductorGestureReferenceManifestV1Report> {
  return await invoke<HfieldTrueConductorGestureReferenceManifestV1Report>("get_current_true_conductor_gesture_reference_manifest_v1_report");
}

export async function exportCurrentTrueConductorGestureReferenceManifestV1Json(): Promise<ExportFileReport> {
  return await invoke<ExportFileReport>("export_current_true_conductor_gesture_reference_manifest_v1_json");
}


export async function getCurrentGestureAwareFieldRendererV2Report(): Promise<HfieldGestureAwareFieldRendererV2Report> {
  return await invoke<HfieldGestureAwareFieldRendererV2Report>("get_current_gesture_aware_field_renderer_v2_report");
}

export async function exportCurrentGestureAwareFieldRendererV2Json(): Promise<ExportFileReport> {
  return await invoke<ExportFileReport>("export_current_gesture_aware_field_renderer_v2_json");
}


export async function getCurrentCymaticFieldModelV2Report(): Promise<HfieldCymaticFieldModelV2Report> {
  return await invoke<HfieldCymaticFieldModelV2Report>("get_current_cymatic_field_model_v2_report");
}

export async function exportCurrentCymaticFieldModelV2Json(): Promise<ExportFileReport> {
  return await invoke<ExportFileReport>("export_current_cymatic_field_model_v2_json");
}


export async function getCurrentSyllableShapedExpressionV1Report(): Promise<HfieldSyllableShapedExpressionV1Report> {
  return await invoke<HfieldSyllableShapedExpressionV1Report>("get_current_syllable_shaped_expression_v1_report");
}

export async function exportCurrentSyllableShapedExpressionV1Json(): Promise<ExportFileReport> {
  return await invoke<ExportFileReport>("export_current_syllable_shaped_expression_v1_json");
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



export async function getHcsKeyFrequencyRegistryV1Report(): Promise<HcsKeyFrequencyRegistryV1Report> {
  return await invoke<HcsKeyFrequencyRegistryV1Report>("get_hcs_key_frequency_registry_v1_report");
}

export async function lookupHcsKeyFrequencyV1(midiNote: number): Promise<HcsKeyFrequencyRegistryV1Record> {
  return await invoke<HcsKeyFrequencyRegistryV1Record>("lookup_hcs_key_frequency_v1", { midiNote });
}




export async function getHcsInstrumentRackAndTrackSoundV1Report(): Promise<HcsInstrumentRackAndTrackSoundV1Report> {
  return await invoke<HcsInstrumentRackAndTrackSoundV1Report>("get_hcs_instrument_rack_and_track_sound_v1_report");
}

export async function getHcsWaveformTo3DFieldBodyV1Report(): Promise<HcsWaveformTo3DFieldBodyV1Report> {
  return await invoke<HcsWaveformTo3DFieldBodyV1Report>("get_hcs_waveform_to_3d_field_body_v1_report");
}

export async function playHcsFluidSynthSoundFontMixV1(assignments: Record<string, unknown>): Promise<HcsFluidSynthSoundFontPlaybackReportV1> {
  return await invoke<HcsFluidSynthSoundFontPlaybackReportV1>("play_hcs_fluidsynth_soundfont_mix_v1", { assignments });
}

export async function getHcsComposerStudioCanvasRebuildV1Report(): Promise<HcsComposerStudioCanvasRebuildV1Report> {
  return await invoke<HcsComposerStudioCanvasRebuildV1Report>("get_hcs_composer_studio_canvas_rebuild_v1_report");
}

export async function getHcsComposerFirstWorkflowAndSoundFontFoundationV1Report(): Promise<HcsComposerFirstWorkflowAndSoundFontFoundationV1Report> {
  return await invoke<HcsComposerFirstWorkflowAndSoundFontFoundationV1Report>("get_hcs_composer_first_workflow_and_soundfont_foundation_v1_report");
}

export async function getHcsProductionNotationRenderSyncV1Report(): Promise<HcsProductionNotationRenderSyncV1Report> {
  return await invoke<HcsProductionNotationRenderSyncV1Report>("get_hcs_production_notation_render_sync_v1_report");
}

export async function getHcsVirtualKeyboardAndRealtimeNoteEntryV1Report(): Promise<HcsVirtualKeyboardAndRealtimeNoteEntryV1Report> {
  return await invoke<HcsVirtualKeyboardAndRealtimeNoteEntryV1Report>("get_hcs_virtual_keyboard_and_realtime_note_entry_v1_report");
}

export async function getHcsTrackEditorAndPianoRollV1Report(): Promise<HcsTrackEditorAndPianoRollV1Report> {
  return await invoke<HcsTrackEditorAndPianoRollV1Report>("get_hcs_track_editor_and_piano_roll_v1_report");
}

export async function importHcsStudioScoreJsonV1(scoreJson: string): Promise<HcsTrackEditorAndPianoRollV1Report> {
  return await invoke<HcsTrackEditorAndPianoRollV1Report>("import_hcs_studio_score_json_v1", { scoreJson });
}

export async function loadHcsStudioScorePresetV1(presetId: string): Promise<HcsTrackEditorAndPianoRollV1Report> {
  return await invoke<HcsTrackEditorAndPianoRollV1Report>("load_hcs_studio_score_preset_v1", { presetId });
}

export async function setHcsPianoRollNoteV1(
  trackId: string,
  stepIndex: number,
  midiNote: number,
  durationSteps: number,
  velocity: number,
  stepMs: number
): Promise<HcsTrackEditorAndPianoRollV1Report> {
  return await invoke<HcsTrackEditorAndPianoRollV1Report>("set_hcs_piano_roll_note_v1", {
    trackId,
    stepIndex,
    midiNote,
    durationSteps,
    velocity,
    stepMs
  });
}

export async function clearCurrentStudioScoreV1(): Promise<HcsTrackEditorAndPianoRollV1Report> {
  return await invoke<HcsTrackEditorAndPianoRollV1Report>("clear_current_studio_score_v1");
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

export async function getPlaybackClockReport(): Promise<PlaybackClockReport> {
  return await invoke<PlaybackClockReport>("get_playback_clock_report");
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

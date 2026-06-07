import { useEffect, useMemo, useRef, useState } from "react";
import HfieldPhaseFieldViewport from "./components/HfieldPhaseFieldViewport";
import {
  getCurrentHfieldIdentityVaultReferenceReport,
  bindCurrentHfieldIdentityVaultReference,
  getCurrentHfieldPacketContractReport,
  getCurrentHfieldFieldSynthesisReport,
  getCurrentForgePacketBridgeStubReport,
  getCurrentPlayheadCursorReport,
  getCurrentLoopPhraseReport,
  playCurrentProjectPhraseCombinedAudio,
  exportCurrentHfieldProjectJson,
  exportCurrentHfieldPacketContractJson,
  exportCurrentHfieldRuntimeCarrierPacketJson,
  exportCurrentHfieldCymaticSurfaceJson,
  exportCurrentHfieldRustRenderManifestJson,
  exportCurrentHfieldReaderBundleJson,
  exportCurrentHfieldCombinedWav,
  exportCurrentHfieldCanonicalBundleManifestJson,
  exportCurrentHfieldCanonicalBundleManifestV2Json,
  getHcsSqliteMotifProjectLibraryV1Report,
  saveCurrentHcsSqliteProjectLibraryV1,
  listHcsSqliteProjectLibraryV1,
  saveCurrentHcsSqliteMotifsV1,
  listHcsSqliteMotifsV1,
  saveCurrentHcsSqliteReceiptV1,
  getHcsProductionPackagingV1Report,
  getHcsTrackEditorAndPianoRollV1Report,
  importHcsStudioScoreJsonV1,
  loadHcsStudioScorePresetV1,
  setHcsPianoRollNoteV1,
  clearCurrentStudioScoreV1,
  getHcsStudioCreationBackendAndPlaceholderPurgeV1Report,
  verifyLatestHfieldExportReplayManifestJson,
  getHfieldSchemaVersionMigrationRegistryJson,
  inspectCurrentHfieldSchemaMigrationRegistryJson,
  getCurrentNineGestureConductorEngineReport,
  getCurrentHarmonicFieldScoreV1UpgradeReport,
  getCurrentCouplingProfileEngineV1Report,
  getCurrentMotifLibraryAnnotationLayerV1Report,
  getCurrentDeterministicAudioEngineV2Report,
  exportCurrentDeterministicAudioEngineV2Wav,
  getCurrentTrueConductorGestureReferenceManifestV1Report,
  exportCurrentTrueConductorGestureReferenceManifestV1Json,
  getCurrentGestureAwareFieldRendererV2Report,
  exportCurrentGestureAwareFieldRendererV2Json,
  getCurrentCymaticFieldModelV2Report,
  exportCurrentCymaticFieldModelV2Json,
  getCurrentSyllableShapedExpressionV1Report,
  exportCurrentSyllableShapedExpressionV1Json,
  listSavedProjects,
  saveCurrentProjectAs,
  openProjectByFileName,
  previewScoreReport,
  previewSeedMusicReport,
  getCurrentResonanceLevelBundle,
  getCurrentConductorMotionReport,
  getGeneratedConductorMotionReport,
  getCurrentConductorMappingReport,
  applyGeneratedConductorMappingToCurrentScore,
  playGeneratedConductorMappingAudio,
  playGeneratedMappedCombinedAudio,
  renderGeneratedMappedCombinedWav,
  loadSeedMusicProject,
  getCurrentProjectScore,
  getCurrentNotationLayout,
  selectCurrentNotationNote,
  editCurrentNotationNote,
  positionCurrentNotationNoteStartMs,
  positionCurrentNotationNoteMeasureBeat,
  nudgeCurrentNotationNoteBeats,
  deleteCurrentNotationNote,
  getCurrentMusicTimeline,
  appendNoteToCurrentTrack,
  clearCurrentMusicTrack,
  resetCurrentMusicToSeed,
  playCurrentProjectMusicAudio,
  renderCurrentProjectMusicWav,
  getCurrentGestureTimeline,
  appendGestureToCurrentScore,
  clearCurrentGestureTimeline,
  resetCurrentGestureTimelineToStandardPath,
  playCurrentProjectConductorAudio,
  playCurrentProjectCombinedAudio,
  renderCurrentProjectCombinedWav,
  renderFirstGestureWav,
  renderSeedMusicWav,
  renderSeedCombinedWav,
  playFirstGestureAudio,
  playSeedMusicAudio,
  playSeedCombinedAudio,
  getPlaybackClockReport,
  stopPlayback,
  getAudioDeviceReport,
  getGestureVocabulary,
  createDefaultScore,
  type PreviewReport,
  type MusicPreviewReport,
  type WavRenderReport,
  type ExportFileReport,
  type HfieldCanonicalBundleManifestExportReport,
  type HfieldNineGestureConductorEngineReport,
  type HfieldHarmonicFieldScoreV1UpgradeReport,
  type HfieldCouplingProfileEngineV1Report,
  type HfieldMotifLibraryAnnotationLayerV1Report,
  type HfieldDeterministicAudioEngineV2Report,
  type HfieldTrueConductorGestureReferenceManifestV1Report,
  type HfieldGestureAwareFieldRendererV2Report,
  type HfieldCymaticFieldModelV2Report,
  type HfieldSyllableShapedExpressionV1Report,
  type HfieldSchemaVersionMigrationRegistryReport,
  type HcsSqliteMotifProjectLibraryV1Report,
  type HcsProductionPackagingV1Report,
  type HcsTrackEditorAndPianoRollV1Report,
  type HcsStudioCreationBackendAndPlaceholderPurgeV1Report,
  type HfieldExportReplayVerifierReport,
  type PlaybackReport,
  type StopReport,
  type PlaybackClockReport,
  type HfieldIdentityVaultReferenceBindingReport,
  type HfieldPacketContractReport,
  type HfieldFieldSynthesisReport,
  type ForgePacketBridgeStubReport,
  type PlayheadCursorReport,
  type LoopPhraseReport,
  type ProjectFileReport,
  type ProjectListReport,
  type NotationLayoutReport,
  type NotationEditReport,
  type ConductorMotionPoint,
  type ConductorMotionReport,
  type ConductorMappingReport,
  type MusicTimelineReport,
  type GestureTimelineReport,
  type ResonanceLevelBundle,
} from "./bridge/tauriCommands";

type OperatorTab = "compose" | "conduct" | "rehearse" | "perform" | "field" | "project" | "diagnostics";

const HCS_DESKTOP_LAUNCHER_STUDIO_STARTUP_FIX_V1_CONTRACT_ID = "aiweb.hfield.desktop_launcher_studio_startup_fix.v1";
type DiagnosticKey =
  | "projectReport"
  | "projectList"
  | "packetContract"
  | "identityVaultReference"
  | "fieldSynthesis"
  | "forgeBridgeStub"
  | "playheadCursor"
  | "loopPhraseReport"
  | "motionReport"
  | "mappingReport"
  | "musicTimeline"
  | "notationLayout"
  | "notationEditReport"
  | "gestureTimeline"
  | "playbackReport"
  | "playbackClockReport"
  | "stopReport"
  | "musicReport"
  | "rustPreview"
  | "audioDevice"
  | "gestureWav"
  | "musicWav"
  | "combinedWav"
  | "currentProjectMusicWav"
  | "currentProjectCombinedWav"
  | "hfieldProjectJsonExport"
  | "hfieldReaderBundleExport"
  | "hfieldRenderManifestExport"
  | "hfieldCymaticSurfaceExport"
  | "hfieldRuntimeCarrierExport"
  | "hfieldPacketContractExport"
  | "hfieldCombinedWavExport"
  | "hfieldCanonicalBundleManifestExport"
  | "hfieldExportReplayVerifier"
  | "hfieldSchemaMigrationRegistry"
  | "nineGestureConductorEngine"
  | "harmonicFieldScoreV1Upgrade"
  | "couplingProfileEngineV1"
  | "motifLibraryAnnotationLayerV1"
  | "deterministicAudioEngineV2"
  | "trueConductorGestureReferenceManifestV1"
  | "gestureAwareFieldRendererV2"
  | "cymaticFieldModelV2"
  | "syllableShapedExpressionV1"
  | "hcsSqliteMotifProjectLibraryV1"
  | "hcsProductionPackagingV1"
  | "hcsStudioCreationBackendAndPlaceholderPurgeV1"
  | "mappedWav"
  | "currentScore"
  | "defaultScore"
  | "vocabulary";

const musicAppendPlan = [
  { label: "Lead C4", trackId: "lead_voice", midiNote: 60, durationMs: 714, velocity: 0.82 },
  { label: "Lead D4", trackId: "lead_voice", midiNote: 62, durationMs: 714, velocity: 0.84 },
  { label: "Lead E4", trackId: "lead_voice", midiNote: 64, durationMs: 714, velocity: 0.86 },
  { label: "Lead F4", trackId: "lead_voice", midiNote: 65, durationMs: 714, velocity: 0.84 },
  { label: "Lead G4", trackId: "lead_voice", midiNote: 67, durationMs: 714, velocity: 0.88 },
  { label: "Depth C3", trackId: "depth_voice", midiNote: 48, durationMs: 1428, velocity: 0.52 },
  { label: "Field C4", trackId: "field_voice", midiNote: 60, durationMs: 2856, velocity: 0.28 }
];

const gestureAppendPlan = [
  { id: "g2", operator: "prepare", durationMs: 360, intensity: 0.42 },
  { id: "g1", operator: "ictus", durationMs: 420, intensity: 0.5 },
  { id: "g3", operator: "emerge", durationMs: 360, intensity: 0.56 },
  { id: "g4", operator: "descend", durationMs: 420, intensity: 0.62 },
  { id: "g5", operator: "hold", durationMs: 520, intensity: 0.7 },
  { id: "g6", operator: "release", durationMs: 420, intensity: 0.62 },
  { id: "g7", operator: "gather", durationMs: 360, intensity: 0.56 },
  { id: "g9", operator: "formed_hold", durationMs: 520, intensity: 0.62 },
  { id: "g8", operator: "emit", durationMs: 480, intensity: 0.52 }
];

const diagnosticOptions: Array<{ key: DiagnosticKey; label: string }> = [
  { key: "projectReport", label: "Project File Report" },
  { key: "projectList", label: "Project List" },
  { key: "packetContract", label: ".hfield Packet Contract" },
  { key: "identityVaultReference", label: "Identity Vault Reference" },
  { key: "fieldSynthesis", label: ".hfield Field Synthesis" },
  { key: "forgeBridgeStub", label: "Forge Bridge Stub" },
  { key: "playheadCursor", label: "Playhead Cursor" },
  { key: "loopPhraseReport", label: "Loop Phrase" },
  { key: "motionReport", label: "Conductor Motion" },
  { key: "mappingReport", label: "Conductor Mapping" },
  { key: "musicTimeline", label: "Music Timeline" },
  { key: "notationLayout", label: "Notation Layout" },
  { key: "notationEditReport", label: "Notation Note Edit" },
  { key: "gestureTimeline", label: "Gesture Timeline" },
  { key: "playbackReport", label: "Playback" },
  { key: "playbackClockReport", label: "Playback Clock" },
  { key: "stopReport", label: "Stop Report" },
  { key: "musicReport", label: "Music Preview" },
  { key: "rustPreview", label: "Rust Preview" },
  { key: "audioDevice", label: "Audio Device" },
  { key: "gestureWav", label: "Gesture WAV" },
  { key: "musicWav", label: "Music WAV" },
  { key: "combinedWav", label: "Combined WAV" },
  { key: "currentProjectMusicWav", label: "Current Music WAV" },
  { key: "currentProjectCombinedWav", label: "Current Combined WAV" },
  { key: "hfieldProjectJsonExport", label: ".hfield Project JSON Export" },
  { key: "hfieldReaderBundleExport", label: "Reader Bundle Export" },
  { key: "hfieldRenderManifestExport", label: "Rust Render Manifest Export" },
  { key: "hfieldCymaticSurfaceExport", label: "Cymatic Surface Export" },
  { key: "hfieldRuntimeCarrierExport", label: "Runtime Carrier Export" },
  { key: "hfieldPacketContractExport", label: "Packet Contract Export" },
  { key: "hfieldCombinedWavExport", label: ".hfield Combined WAV Export" },
  { key: "hfieldCanonicalBundleManifestExport", label: "Canonical Bundle Manifest Export" },
  { key: "hfieldExportReplayVerifier", label: "Export Replay Verifier" },
  { key: "hfieldSchemaMigrationRegistry", label: "Schema Migration Registry" },
  { key: "nineGestureConductorEngine", label: "Nine-Gesture Conductor Engine" },
  { key: "harmonicFieldScoreV1Upgrade", label: "Harmonic Field Score v1 Upgrade" },
  { key: "couplingProfileEngineV1", label: "Coupling Profile Engine v1" },
  { key: "motifLibraryAnnotationLayerV1", label: "Motif Library + Annotation Layer v1" },
  { key: "deterministicAudioEngineV2", label: "Deterministic Audio Engine v2" },
  { key: "trueConductorGestureReferenceManifestV1", label: "True Gesture Reference Manifest v1" },
  { key: "gestureAwareFieldRendererV2", label: "Gesture-Aware Field Renderer v2" },
  { key: "cymaticFieldModelV2", label: "Cymatic Field Model v2" },
  { key: "syllableShapedExpressionV1", label: "Syllable-Shaped Expression v1" },
  { key: "hcsSqliteMotifProjectLibraryV1", label: "SQLite Motif / Project Library v1" },
  { key: "hcsProductionPackagingV1", label: "Production Packaging v1" },
  { key: "hcsStudioCreationBackendAndPlaceholderPurgeV1", label: "Studio Creation Backend v1" },
  { key: "mappedWav", label: "Generated Mapped WAV" },
  { key: "currentScore", label: "Current .hfield Score" },
  { key: "defaultScore", label: "Default .hfield Score" },
  { key: "vocabulary", label: "Nine-Gesture Vocabulary" }
];

function getMotionPoint(report: ConductorMotionReport | null, timeMs: number): ConductorMotionPoint | null {
  if (!report || report.sampled_points.length === 0) {
    return null;
  }

  const points = report.sampled_points;
  if (timeMs <= points[0].time_ms) {
    return points[0];
  }

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const next = points[index];

    if (timeMs <= next.time_ms) {
      const span = Math.max(1, next.time_ms - previous.time_ms);
      const amount = (timeMs - previous.time_ms) / span;

      return {
        ...next,
        time_ms: timeMs,
        time_seconds: Math.round((timeMs / 1000) * 1000) / 1000,
        x: previous.x + (next.x - previous.x) * amount,
        y: previous.y + (next.y - previous.y) * amount,
        intensity: previous.intensity + (next.intensity - previous.intensity) * amount
      };
    }
  }

  return points[points.length - 1];
}

function getActiveEvent(report: ConductorMotionReport | null, timeMs: number) {
  if (!report) {
    return null;
  }

  return (
    report.event_views.find((event) => timeMs >= event.start_ms && timeMs <= event.end_ms) ??
    report.event_views[report.event_views.length - 1] ??
    null
  );
}

function conductorPointToSvg(point: ConductorMotionPoint | null) {
  return {
    x: (point?.x ?? 0.5) * 1000,
    y: (point?.y ?? 0.5) * 600
  };
}

function formatMs(ms: number | undefined) {
  if (!ms) {
    return "0.000s";
  }

  return `${(ms / 1000).toFixed(3)}s`;
}

function TabButton({
  tab,
  activeTab,
  setActiveTab,
  children
}: {
  tab: OperatorTab;
  activeTab: OperatorTab;
  setActiveTab: (tab: OperatorTab) => void;
  children: string;
}) {
  return (
    <button
      className={activeTab === tab ? "tab-button active" : "tab-button"}
      onClick={() => setActiveTab(tab)}
      type="button"
    >
      {children}
    </button>
  );
}



function NotationRenderSyncV1({
  report,
  selectedNoteKey,
  onSelectNote
}: {
  report: HcsTrackEditorAndPianoRollV1Report | null;
  selectedNoteKey: string | null;
  onSelectNote: (trackId: string, eventIndex: number) => void;
}) {
  const timeline = (report as any)?.music_timeline ?? null;
  const tracks = (timeline?.tracks ?? []) as any[];
  const totalDurationMs = Math.max(1, Number(timeline?.total_duration_ms ?? report?.total_duration_ms ?? 1));
  const tempoBpm = Math.max(20, Number(report?.tempo_bpm ?? 96));
  const meterText = String(report?.meter ?? "4/4");
  const beatsPerMeasure = Math.max(1, Number(meterText.split("/")[0]) || 4);
  const beatMs = 60000 / tempoBpm;
  const measureMs = beatMs * beatsPerMeasure;
  const measureCount = Math.max(1, Math.ceil(totalDurationMs / measureMs));
  const svgWidth = 1240;
  const leftPad = 132;
  const rightPad = 34;
  const usableWidth = svgWidth - leftPad - rightPad;
  const headerY = 34;
  const trackHeight = 126;
  const trackCount = Math.max(1, tracks.length);
  const svgHeight = headerY + trackCount * trackHeight + 28;
  const staffLines = [0, 1, 2, 3, 4];
  const measureLines = Array.from({ length: measureCount + 1 }, (_, index) => index);

  function noteX(startMs: number): number {
    return leftPad + Math.max(0, Math.min(1, startMs / totalDurationMs)) * usableWidth;
  }

  function noteWidth(durationMs: number): number {
    return Math.max(18, Math.min(180, (durationMs / totalDurationMs) * usableWidth));
  }

  function noteY(midiNote: number, staffBaseY: number): number {
    const clamped = Math.max(36, Math.min(84, Number(midiNote) || 60));
    return staffBaseY + 38 - (clamped - 60) * 1.65;
  }

  return (
    <section className="notation-render-sync-v1" aria-label="Production notation render sync v1">
      <div className="board-title-row">
        <div>
          <h3>Notation Render Sync</h3>
          <p className="note">Generated from the same score notes used by the keyboard, piano roll, audio engine, and Glass Reader. There is no separate fake staff state.</p>
        </div>
        <span>{report ? `${report.note_count} notes · ${report.meter} · ${Math.round(report.tempo_bpm)} BPM` : "waiting for score"}</span>
      </div>
      <div className="notation-sync-law-v1">
        <strong>Single source:</strong>
        <span>music.tracks[*].notes → notation → piano roll → deterministic audio → Glass Reader field</span>
      </div>
      <div className="notation-scroll-v1" role="img" aria-label="Synchronized sheet music generated from current HCS score">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="notation-svg-v1">
          <rect x="0" y="0" width={svgWidth} height={svgHeight} rx="18" className="notation-page-bg-v1" />
          <text x="24" y="24" className="notation-title-v1">{report?.title ?? "Untitled HCS Score"}</text>
          <text x={svgWidth - 310} y="24" className="notation-meta-v1">{meterText} · {Math.round(tempoBpm)} BPM · synced</text>
          {measureLines.map((measure) => {
            const x = leftPad + Math.min(1, (measure * measureMs) / totalDurationMs) * usableWidth;
            return (
              <g key={`measure-${measure}`}>
                <line x1={x} y1={headerY} x2={x} y2={svgHeight - 24} className="notation-measure-line-v1" />
                {measure < measureCount && <text x={x + 4} y={headerY - 8} className="notation-measure-label-v1">{measure + 1}</text>}
              </g>
            );
          })}
          {tracks.map((track, trackIndex) => {
            const staffTop = headerY + trackIndex * trackHeight + 24;
            const staffBase = staffTop + 38;
            const notes = (track.notes ?? []) as any[];
            return (
              <g key={`staff-${track.track_id ?? trackIndex}`}>
                <text x="24" y={staffBase - 8} className="notation-track-label-v1">{String(track.track_id ?? `track_${trackIndex + 1}`)}</text>
                <text x="24" y={staffBase + 12} className="notation-track-role-v1">{String(track.role ?? "score lane")}</text>
                <text x="98" y={staffBase + 4} className="notation-clef-v1">𝄞</text>
                {staffLines.map((line) => (
                  <line
                    key={`staff-line-${track.track_id}-${line}`}
                    x1={leftPad}
                    y1={staffTop + line * 10}
                    x2={svgWidth - rightPad}
                    y2={staffTop + line * 10}
                    className="notation-staff-line-v1"
                  />
                ))}
                {notes.map((note) => {
                  const eventIndex = Number(note.event_index ?? 0);
                  const noteKey = `${String(note.track_id ?? track.track_id)}:${eventIndex}`;
                  const x = noteX(Number(note.start_ms ?? 0));
                  const y = noteY(Number(note.midi_note ?? 60), staffBase);
                  const width = noteWidth(Number(note.duration_ms ?? beatMs));
                  const selected = selectedNoteKey === noteKey;
                  const frequency = Number(note.frequency_hz ?? 0);
                  return (
                    <g
                      key={`notation-note-${noteKey}-${note.start_ms}-${note.midi_note}`}
                      className={selected ? "notation-note-group-v1 selected" : "notation-note-group-v1"}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectNote(String(note.track_id ?? track.track_id), eventIndex)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          onSelectNote(String(note.track_id ?? track.track_id), eventIndex);
                        }
                      }}
                      aria-label={`Select ${String(note.note_name ?? note.midi_note)} at ${Number(note.start_ms ?? 0)} milliseconds`}
                    >
                      <line x1={x + 12} y1={y} x2={x + 12} y2={y - 38} className="notation-stem-v1" />
                      <ellipse cx={x} cy={y} rx="12" ry="7" transform={`rotate(-18 ${x} ${y})`} className="notation-notehead-v1" />
                      <line x1={x - 1} y1={y + 18} x2={x + width} y2={y + 18} className="notation-duration-tie-v1" />
                      <text x={x - 14} y={y + 34} className="notation-note-label-v1">{String(note.note_name ?? note.midi_note)}</text>
                      {frequency > 0 && <text x={x - 16} y={y + 48} className="notation-frequency-label-v1">{frequency.toFixed(2)} Hz</text>}
                    </g>
                  );
                })}
                {notes.length === 0 && <text x={leftPad + 16} y={staffBase + 34} className="notation-empty-v1">No notes yet. Play keys or import a score to write this staff.</text>}
              </g>
            );
          })}
          {tracks.length === 0 && <text x={leftPad + 16} y={headerY + 72} className="notation-empty-v1">Load a score, import JSON, or press the keyboard to generate notation.</text>}
        </svg>
      </div>
    </section>
  );
}



type HcsTrackSoundProfileStateV1 = {
  instrumentId: string;
  level: number;
  muted: boolean;
  soloed: boolean;
};

type HcsStarterInstrumentV1 = {
  instrumentId: string;
  displayName: string;
  family: string;
  waveform: OscillatorType;
  attackMs: number;
  releaseMs: number;
  defaultLevel: number;
  partials: Array<{ ratio: number; gain: number }>;
  description: string;
};

const hcsStarterInstrumentCatalogV1: HcsStarterInstrumentV1[] = [
  {
    instrumentId: "glass_piano",
    displayName: "Glass Piano",
    family: "keys",
    waveform: "triangle",
    attackMs: 8,
    releaseMs: 180,
    defaultLevel: 0.78,
    partials: [{ ratio: 1, gain: 1 }, { ratio: 2, gain: 0.18 }],
    description: "Bright playable keyboard voice for lead writing."
  },
  {
    instrumentId: "warm_electric_piano",
    displayName: "Warm Electric Piano",
    family: "keys",
    waveform: "sine",
    attackMs: 14,
    releaseMs: 260,
    defaultLevel: 0.74,
    partials: [{ ratio: 1, gain: 1 }, { ratio: 2, gain: 0.12 }, { ratio: 3, gain: 0.06 }],
    description: "Soft harmonic keyboard tone for chords and melody."
  },
  {
    instrumentId: "deep_bass",
    displayName: "Deep Bass",
    family: "bass",
    waveform: "sine",
    attackMs: 22,
    releaseMs: 260,
    defaultLevel: 0.68,
    partials: [{ ratio: 1, gain: 1 }, { ratio: 0.5, gain: 0.35 }],
    description: "Low-frequency depth layer for carrier grounding."
  },
  {
    instrumentId: "glass_pad",
    displayName: "Glass Pad",
    family: "pad",
    waveform: "sine",
    attackMs: 180,
    releaseMs: 900,
    defaultLevel: 0.52,
    partials: [{ ratio: 1, gain: 0.9 }, { ratio: 1.5, gain: 0.16 }, { ratio: 2, gain: 0.12 }],
    description: "Slow field support layer for sustained resonance."
  },
  {
    instrumentId: "mallet_bell",
    displayName: "Mallet Bell",
    family: "percussion",
    waveform: "triangle",
    attackMs: 3,
    releaseMs: 520,
    defaultLevel: 0.66,
    partials: [{ ratio: 1, gain: 1 }, { ratio: 2.4, gain: 0.2 }],
    description: "Percussive bell-like attack for cue and motif testing."
  },
  {
    instrumentId: "pulse_lead",
    displayName: "Pulse Lead",
    family: "synth",
    waveform: "sawtooth",
    attackMs: 6,
    releaseMs: 110,
    defaultLevel: 0.6,
    partials: [{ ratio: 1, gain: 0.86 }, { ratio: 2, gain: 0.11 }],
    description: "Clear synthetic lead for timing and phrase work."
  }
];

function hcsRackFrequencyFromMidiV1(midiNote: number): number {
  return 440 * Math.pow(2, (Math.max(0, Math.min(127, Math.round(midiNote))) - 69) / 12);
}

function hcsDefaultInstrumentForTrackV1(trackId: string, role: string): string {
  const text = `${trackId} ${role}`.toLowerCase();
  if (text.includes("depth") || text.includes("bass")) return "deep_bass";
  if (text.includes("field") || text.includes("pad")) return "glass_pad";
  if (text.includes("bell") || text.includes("cue")) return "mallet_bell";
  return "glass_piano";
}

function hcsDefaultTrackSoundProfileV1(track: any): HcsTrackSoundProfileStateV1 {
  const instrumentId = hcsDefaultInstrumentForTrackV1(String(track?.track_id ?? "track"), String(track?.role ?? ""));
  const instrument = hcsStarterInstrumentCatalogV1.find((item) => item.instrumentId === instrumentId) ?? hcsStarterInstrumentCatalogV1[0];
  return {
    instrumentId: instrument.instrumentId,
    level: instrument.defaultLevel,
    muted: false,
    soloed: false
  };
}

function hcsScheduleInstrumentNoteV1(
  audioContext: AudioContext,
  destination: AudioNode,
  instrument: HcsStarterInstrumentV1,
  note: any,
  profile: HcsTrackSoundProfileStateV1,
  baseStartSeconds: number
): number {
  const startMs = Number(note?.start_ms ?? 0);
  const durationMs = Math.max(40, Number(note?.duration_ms ?? 500));
  const midiNote = Number(note?.midi_note ?? 60);
  const frequency = Number(note?.frequency_hz ?? 0) > 0 ? Number(note.frequency_hz) : hcsRackFrequencyFromMidiV1(midiNote);
  const velocity = Math.max(0.05, Math.min(1, Number(note?.velocity ?? 0.78)));
  const startAt = baseStartSeconds + startMs / 1000;
  const endAt = startAt + durationMs / 1000;
  const releaseSeconds = instrument.releaseMs / 1000;
  const attackSeconds = Math.max(0.002, instrument.attackMs / 1000);

  for (const partial of instrument.partials) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = instrument.waveform;
    oscillator.frequency.setValueAtTime(frequency * partial.ratio, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(Math.max(0.0002, profile.level * velocity * partial.gain * 0.22), startAt + attackSeconds);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt + releaseSeconds);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(startAt);
    oscillator.stop(endAt + releaseSeconds + 0.05);
  }

  return endAt + releaseSeconds;
}

function InstrumentRackAndTrackSoundV1({ report }: { report: HcsTrackEditorAndPianoRollV1Report | null }) {
  const [profiles, setProfiles] = useState<Record<string, HcsTrackSoundProfileStateV1>>({});
  const [lastPreview, setLastPreview] = useState<string>("No instrument mix played yet.");
  const tracks = (((report as any)?.music_timeline?.tracks ?? []) as any[]);
  const hasSolo = tracks.some((track) => {
    const trackId = String(track?.track_id ?? "track");
    const profile = profiles[trackId] ?? hcsDefaultTrackSoundProfileV1(track);
    return profile.soloed;
  });

  function getProfile(track: any): HcsTrackSoundProfileStateV1 {
    const trackId = String(track?.track_id ?? "track");
    return profiles[trackId] ?? hcsDefaultTrackSoundProfileV1(track);
  }

  function updateProfile(track: any, patch: Partial<HcsTrackSoundProfileStateV1>) {
    const trackId = String(track?.track_id ?? "track");
    setProfiles((current) => ({
      ...current,
      [trackId]: {
        ...hcsDefaultTrackSoundProfileV1(track),
        ...(current[trackId] ?? {}),
        ...patch
      }
    }));
  }

  async function playInstrumentMix(filterTrackId?: string) {
    const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextCtor) {
      setLastPreview("This browser shell does not expose Web Audio playback.");
      return;
    }

    const audioContext = new AudioContextCtor() as AudioContext;
    const master = audioContext.createGain();
    master.gain.value = 0.82;
    master.connect(audioContext.destination);
    const baseStart = audioContext.currentTime + 0.055;
    let scheduled = 0;
    let maxStop = baseStart + 0.2;

    for (const track of tracks) {
      const trackId = String(track?.track_id ?? "track");
      if (filterTrackId && filterTrackId !== trackId) continue;
      const profile = getProfile(track);
      const shouldPlay = filterTrackId ? !profile.muted : !profile.muted && (!hasSolo || profile.soloed);
      if (!shouldPlay) continue;
      const instrument = hcsStarterInstrumentCatalogV1.find((item) => item.instrumentId === profile.instrumentId) ?? hcsStarterInstrumentCatalogV1[0];
      const notes = ((track?.notes ?? []) as any[]);
      for (const note of notes) {
        maxStop = Math.max(maxStop, hcsScheduleInstrumentNoteV1(audioContext, master, instrument, note, profile, baseStart));
        scheduled += 1;
      }
    }

    if (scheduled === 0) {
      setLastPreview("No audible notes were scheduled. Check mute/solo or add notes to the score.");
      void audioContext.close();
      return;
    }

    setLastPreview(`Playing ${scheduled} source-backed notes through instrument rack profiles.`);
    window.setTimeout(() => {
      void audioContext.close();
    }, Math.max(600, (maxStop - audioContext.currentTime + 0.25) * 1000));
  }

  return (
    <section className="instrument-rack-v1" aria-label="Instrument Rack and Track Sound v1">
      <div className="board-title-row">
        <div>
          <p className="eyebrow">Instrument Rack and Track Sound v1</p>
          <h3>Assign real sounds to tracks, then play the studio mix</h3>
          <p className="note">Track sound profiles are downstream render settings. The source remains current_score.music.tracks[*].notes, and pitch stays tied to the locked MIDI frequency registry.</p>
        </div>
        <button onClick={() => void playInstrumentMix()} type="button">Play Instrument Mix</button>
      </div>

      <div className="rack-sync-law-v1">
        <strong>Sound chain:</strong>
        <span>score notes → track instrument → mute/solo/level → Web Audio preview → waveform/field inspection</span>
      </div>

      <div className="instrument-catalog-strip-v1" aria-label="Starter instrument set">
        {hcsStarterInstrumentCatalogV1.map((instrument) => (
          <span key={instrument.instrumentId}>{instrument.displayName}</span>
        ))}
      </div>

      <div className="instrument-rack-grid-v1">
        {tracks.map((track) => {
          const trackId = String(track?.track_id ?? "track");
          const role = String(track?.role ?? "score lane");
          const notes = ((track?.notes ?? []) as any[]);
          const profile = getProfile(track);
          const instrument = hcsStarterInstrumentCatalogV1.find((item) => item.instrumentId === profile.instrumentId) ?? hcsStarterInstrumentCatalogV1[0];
          const audible = !profile.muted && (!hasSolo || profile.soloed);
          return (
            <article key={`instrument-rack-${trackId}`} className={audible ? "track-sound-card-v1" : "track-sound-card-v1 muted"}>
              <div className="track-sound-header-v1">
                <div>
                  <strong>{trackId}</strong>
                  <span>{role} · {notes.length} notes</span>
                </div>
                <button onClick={() => void playInstrumentMix(trackId)} type="button">Preview Track</button>
              </div>

              <label className="rack-field-v1">
                <span>Instrument</span>
                <select
                  value={profile.instrumentId}
                  onChange={(event) => updateProfile(track, { instrumentId: event.target.value })}
                >
                  {hcsStarterInstrumentCatalogV1.map((item) => (
                    <option key={item.instrumentId} value={item.instrumentId}>{item.displayName}</option>
                  ))}
                </select>
              </label>

              <p className="instrument-description-v1">{instrument.description}</p>

              <label className="rack-field-v1">
                <span>Level {Math.round(profile.level * 100)}%</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={profile.level}
                  onChange={(event) => updateProfile(track, { level: Number(event.target.value) })}
                />
              </label>

              <div className="rack-toggle-row-v1">
                <button
                  className={profile.muted ? "active" : ""}
                  onClick={() => updateProfile(track, { muted: !profile.muted })}
                  type="button"
                >
                  {profile.muted ? "Muted" : "Mute"}
                </button>
                <button
                  className={profile.soloed ? "active" : ""}
                  onClick={() => updateProfile(track, { soloed: !profile.soloed })}
                  type="button"
                >
                  {profile.soloed ? "Soloed" : "Solo"}
                </button>
                <span>{audible ? "audible" : "silent"}</span>
              </div>
            </article>
          );
        })}
        {tracks.length === 0 && (
          <article className="track-sound-card-v1">
            <strong>No tracks yet</strong>
            <span>Import a score or press the keyboard to create tracks for the rack.</span>
          </article>
        )}
      </div>

      <p className="rack-preview-status-v1">{lastPreview}</p>
    </section>
  );
}

type StudioTrackEditorAndPianoRollV1Props = {
  musicTimeline: MusicTimelineReport | null;
  selectedNoteKey: string | null;
  onSelectNote: (trackId: string, eventIndex: number) => void;
  onSetPianoRollNote: (trackId: string, stepIndex: number, midiNote: number, durationSteps: number, velocity: number, stepMs: number) => Promise<void>;
  onImportScoreJson: (scoreJson: string) => Promise<void>;
  onLoadPreset: (presetId: string) => Promise<void>;
  onClearScore: () => Promise<void>;
  onPlayStudio: () => Promise<void>;
  onStop: () => Promise<void>;
  onExportAudio: () => Promise<void>;
  onRefresh: () => Promise<void>;
  report: HcsTrackEditorAndPianoRollV1Report | null;
};


// HCS Production Notation Render Sync v1 proof: No separate fake staff state; notation renders from current_score.music.tracks[*].notes.
const HCS_KEY_FREQUENCY_REGISTRY_V1_CONTRACT_ID = "aiweb.hfield.key_frequency_registry.v1";
const HCS_VIRTUAL_KEYBOARD_AND_REALTIME_NOTE_ENTRY_V1_CONTRACT_ID = "aiweb.hfield.virtual_keyboard_and_realtime_note_entry.v1";
const HCS_KEY_FREQUENCY_REGISTRY_V1_A4_HZ = 440;
const HCS_KEY_FREQUENCY_REGISTRY_V1_A4_MIDI = 69;
const hcsKeyFrequencyNamesV1 = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function hcsCanonicalMidiFrequencyHzV1(midiNote: number): number {
  return HCS_KEY_FREQUENCY_REGISTRY_V1_A4_HZ * Math.pow(2, (midiNote - HCS_KEY_FREQUENCY_REGISTRY_V1_A4_MIDI) / 12);
}

function hcsMidiNoteLabelV1(midiNote: number): string {
  const normalized = Math.max(0, Math.min(127, Math.round(midiNote)));
  const name = hcsKeyFrequencyNamesV1[normalized % 12];
  const octave = Math.floor(normalized / 12) - 1;
  return `${name}${octave}`;
}

const studioKeyboardSemitones = [
  { label: "C", offset: 0, black: false },
  { label: "C#", offset: 1, black: true },
  { label: "D", offset: 2, black: false },
  { label: "D#", offset: 3, black: true },
  { label: "E", offset: 4, black: false },
  { label: "F", offset: 5, black: false },
  { label: "F#", offset: 6, black: true },
  { label: "G", offset: 7, black: false },
  { label: "G#", offset: 8, black: true },
  { label: "A", offset: 9, black: false },
  { label: "A#", offset: 10, black: true },
  { label: "B", offset: 11, black: false }
];

const studioSampleScoreJsonV1 = `{
  "title": "My First HCS Score",
  "tempo_bpm": 96,
  "meter": "4/4",
  "tracks": [
    {
      "track_id": "lead_voice",
      "role": "melody",
      "notes": [
        { "pitch": "C4", "start_beat": 0, "duration_beats": 1, "velocity": 0.86 },
        { "pitch": "E4", "start_beat": 1, "duration_beats": 1, "velocity": 0.86 },
        { "pitch": "G4", "start_beat": 2, "duration_beats": 1, "velocity": 0.86 },
        { "pitch": "C5", "start_beat": 3, "duration_beats": 2, "velocity": 0.82 }
      ]
    },
    {
      "track_id": "depth_voice",
      "role": "bass_depth",
      "notes": [
        { "pitch": "C3", "start_beat": 0, "duration_beats": 4, "velocity": 0.5 },
        { "pitch": "G2", "start_beat": 4, "duration_beats": 4, "velocity": 0.46 }
      ]
    },
    {
      "track_id": "field_voice",
      "role": "harmonic_field_support",
      "notes": [
        { "pitch": "C4", "start_beat": 0, "duration_beats": 8, "velocity": 0.22 },
        { "pitch": "G4", "start_beat": 0, "duration_beats": 8, "velocity": 0.16 }
      ]
    }
  ]
}`;


function StudioTrackEditorAndPianoRollV1({
  musicTimeline,
  selectedNoteKey,
  onSelectNote,
  onSetPianoRollNote,
  onImportScoreJson,
  onLoadPreset,
  onClearScore,
  onPlayStudio,
  onStop,
  onExportAudio,
  onRefresh,
  report
}: StudioTrackEditorAndPianoRollV1Props) {
  const tracks = musicTimeline?.tracks ?? [];
  const firstTrackId = tracks[0]?.track_id ?? "lead_voice";
  const [activeTrackId, setActiveTrackId] = useState(firstTrackId);
  const [activeMidiNote, setActiveMidiNote] = useState(60);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [durationSteps, setDurationSteps] = useState(1);
  const [velocity, setVelocity] = useState(0.84);
  const [stepMs, setStepMs] = useState(500);
  const [keyboardOctave, setKeyboardOctave] = useState(4);
  const [scoreJson, setScoreJson] = useState(studioSampleScoreJsonV1);
  const [entryMode, setEntryMode] = useState<"play_and_insert" | "play_only" | "insert_only">("play_and_insert");
  const [computerKeyboardEnabled, setComputerKeyboardEnabled] = useState(true);
  const [autoAdvanceStep, setAutoAdvanceStep] = useState(true);
  const [lastRealtimeEntry, setLastRealtimeEntry] = useState("No realtime note entered yet.");
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (tracks.length > 0 && !tracks.some((track) => track.track_id === activeTrackId)) {
      setActiveTrackId(tracks[0].track_id);
    }
  }, [activeTrackId, tracks]);

  const totalDurationMs = Math.max(1, musicTimeline?.total_duration_ms ?? 1);
  const gridSteps = Array.from({ length: 32 }, (_, index) => index);
  const keyboardNotes = [keyboardOctave, keyboardOctave + 1].flatMap((octave) =>
    studioKeyboardSemitones.map((note) => ({
      ...note,
      octave,
      midi: (octave + 1) * 12 + note.offset,
      frequencyHz: hcsCanonicalMidiFrequencyHzV1((octave + 1) * 12 + note.offset),
      fullLabel: `${note.label}${octave}`
    }))
  );

  const qwertyMap: Record<string, number> = {
    a: 0,
    w: 1,
    s: 2,
    e: 3,
    d: 4,
    f: 5,
    t: 6,
    g: 7,
    y: 8,
    h: 9,
    u: 10,
    j: 11,
    k: 12,
    o: 13,
    l: 14,
    p: 15,
    ";": 16,
    "'": 17
  };

  function getPreviewAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const audioWindow = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AudioContextCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor();
    }
    return audioContextRef.current;
  }

  function playRealtimeKeyPreview(midiNote: number) {
    const context = getPreviewAudioContext();
    if (!context) {
      setLastRealtimeEntry("Audio preview unavailable in this window, but score entry remains backed.");
      return;
    }
    if (context.state === "suspended") {
      void context.resume();
    }

    const frequencyHz = hcsCanonicalMidiFrequencyHzV1(midiNote);
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const previewSeconds = Math.max(0.08, Math.min(1.2, (Number(stepMs) || 500) / 1000 * Math.max(1, Number(durationSteps) || 1) * 0.45));

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequencyHz, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.02, Math.min(0.18, Number(velocity) || 0.84) * 0.2), now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + previewSeconds);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + previewSeconds + 0.02);
  }

  async function writeRealtimeKeyboardNote(midiNote: number, source: "mouse" | "computer_keyboard") {
    const safeMidi = Math.max(0, Math.min(127, Math.round(midiNote)));
    const safeStep = Math.max(0, Math.min(255, Math.round(Number(activeStepIndex) || 0)));
    const safeDurationSteps = Math.max(1, Math.min(64, Math.round(Number(durationSteps) || 1)));
    const safeVelocity = Math.max(0, Math.min(1, Number(velocity) || 0.84));
    const safeStepMs = Math.max(40, Math.min(8000, Math.round(Number(stepMs) || 500)));
    const frequencyHz = hcsCanonicalMidiFrequencyHzV1(safeMidi);
    const pitchLabel = hcsMidiNoteLabelV1(safeMidi);

    setActiveMidiNote(safeMidi);

    if (entryMode === "play_and_insert" || entryMode === "play_only") {
      playRealtimeKeyPreview(safeMidi);
    }

    if (entryMode === "play_and_insert" || entryMode === "insert_only") {
      await onSetPianoRollNote(activeTrackId, safeStep, safeMidi, safeDurationSteps, safeVelocity, safeStepMs);
      if (autoAdvanceStep) {
        setActiveStepIndex(Math.min(255, safeStep + safeDurationSteps));
      }
      setLastRealtimeEntry(`${source === "mouse" ? "Clicked" : "Typed"} ${pitchLabel} · MIDI ${safeMidi} · ${frequencyHz.toFixed(2)} Hz into ${activeTrackId} step ${safeStep}.`);
    } else {
      setLastRealtimeEntry(`${source === "mouse" ? "Clicked" : "Typed"} ${pitchLabel} · MIDI ${safeMidi} · ${frequencyHz.toFixed(2)} Hz preview only.`);
    }
  }

  useEffect(() => {
    if (!computerKeyboardEnabled) return undefined;

    function handleComputerKeyboard(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || tagName === "select" || target?.isContentEditable) return;
      const key = event.key.toLowerCase();
      if (key === "z") {
        setKeyboardOctave((octave) => Math.max(0, octave - 1));
        event.preventDefault();
        return;
      }
      if (key === "x") {
        setKeyboardOctave((octave) => Math.min(8, octave + 1));
        event.preventDefault();
        return;
      }
      if (key === "[" || key === "arrowleft") {
        setActiveStepIndex((step) => Math.max(0, step - 1));
        event.preventDefault();
        return;
      }
      if (key === "]" || key === "arrowright") {
        setActiveStepIndex((step) => Math.min(255, step + 1));
        event.preventDefault();
        return;
      }
      if (key === " ") {
        void onPlayStudio();
        event.preventDefault();
        return;
      }
      const offset = qwertyMap[key];
      if (offset === undefined) return;
      const midi = (keyboardOctave + 1) * 12 + offset;
      event.preventDefault();
      void writeRealtimeKeyboardNote(midi, "computer_keyboard");
    }

    window.addEventListener("keydown", handleComputerKeyboard);
    return () => window.removeEventListener("keydown", handleComputerKeyboard);
  }, [activeStepIndex, activeTrackId, autoAdvanceStep, computerKeyboardEnabled, durationSteps, entryMode, keyboardOctave, onPlayStudio, stepMs, velocity]);

  return (
    <section className="studio-track-editor-v1 realtime-keyboard-v1-surface" aria-label="HCS Virtual Keyboard and Realtime Note Entry v1">
      <div className="studio-track-editor-header">
        <div>
          <p className="eyebrow">Virtual Keyboard and Realtime Note Entry v1</p>
          <h2>Press keys, compose into the score, and hear each frequency as you write</h2>
          <p className="note">Mouse clicks and optional computer-keyboard input now resolve through the canonical MIDI frequency registry, preview the real frequency, and write notes directly into music.tracks[*].notes through the backed piano-roll command.</p>
        </div>
        <div className="button-row compact-row">
          <button onClick={() => onLoadPreset("glass_reader_arpeggio")} type="button">Load Arpeggio</button>
          <button onClick={() => onLoadPreset("midnight_sonnet_seed")} type="button">Load Midnight Seed</button>
          <button onClick={onPlayStudio} type="button">Play Studio Mix</button>
          <button className="danger" onClick={onStop} type="button">Stop</button>
        </div>
      </div>

      <div className="realtime-entry-authority-v1">
        <strong>{hcsMidiNoteLabelV1(activeMidiNote)} · MIDI {activeMidiNote} · {hcsCanonicalMidiFrequencyHzV1(activeMidiNote).toFixed(2)} Hz</strong>
        <span>Authority: {HCS_KEY_FREQUENCY_REGISTRY_V1_CONTRACT_ID} · {HCS_VIRTUAL_KEYBOARD_AND_REALTIME_NOTE_ENTRY_V1_CONTRACT_ID} · A4 = {HCS_KEY_FREQUENCY_REGISTRY_V1_A4_HZ} Hz · 12-TET · not simulated</span>
      </div>

      <div className="studio-compose-grid-v1">
        <section className="score-import-panel-v1">
          <div className="board-title-row">
            <h3>Score Input</h3>
            <span>{report?.action ?? "ready"}</span>
          </div>
          <p className="note">Paste full FieldScore JSON or the simple HCS score format. Once imported, the same notes appear in the piano roll, track lanes, audio path, and Glass Reader field.</p>
          <textarea
            value={scoreJson}
            onChange={(event) => setScoreJson(event.target.value)}
            spellCheck={false}
            aria-label="Import score JSON"
          />
          <div className="button-row">
            <button onClick={() => setScoreJson(studioSampleScoreJsonV1)} type="button">Sample Score JSON</button>
            <button onClick={() => onImportScoreJson(scoreJson)} type="button">Import and Playable</button>
            <button onClick={onClearScore} type="button">New Empty Score</button>
          </div>
        </section>

        <section className="virtual-keyboard-panel-v1 realtime-keyboard-panel-v1">
          <div className="board-title-row">
            <h3>Virtual Piano</h3>
            <span>{entryMode.replace(/_/g, " ")}</span>
          </div>
          <div className="keyboard-controls-v1 realtime-controls-v1">
            <label>
              <span>Track</span>
              <select value={activeTrackId} onChange={(event) => setActiveTrackId(event.target.value)}>
                {tracks.map((track) => <option key={track.track_id} value={track.track_id}>{track.track_id}</option>)}
                {tracks.length === 0 && <option value="lead_voice">lead_voice</option>}
              </select>
            </label>
            <label>
              <span>Step</span>
              <input value={activeStepIndex} onChange={(event) => setActiveStepIndex(Number(event.target.value))} inputMode="numeric" />
            </label>
            <label>
              <span>Duration steps</span>
              <input value={durationSteps} onChange={(event) => setDurationSteps(Number(event.target.value))} inputMode="numeric" />
            </label>
            <label>
              <span>Velocity</span>
              <input value={velocity} onChange={(event) => setVelocity(Number(event.target.value))} inputMode="decimal" />
            </label>
            <label>
              <span>Step ms</span>
              <input value={stepMs} onChange={(event) => setStepMs(Number(event.target.value))} inputMode="numeric" />
            </label>
            <label>
              <span>Octave</span>
              <input value={keyboardOctave} onChange={(event) => setKeyboardOctave(Number(event.target.value))} inputMode="numeric" />
            </label>
          </div>

          <div className="realtime-entry-options-v1">
            <label>
              <span>Entry mode</span>
              <select value={entryMode} onChange={(event) => setEntryMode(event.target.value as "play_and_insert" | "play_only" | "insert_only")}>
                <option value="play_and_insert">Play + insert</option>
                <option value="play_only">Play only</option>
                <option value="insert_only">Insert only</option>
              </select>
            </label>
            <label className="checkbox-line-v1">
              <input checked={computerKeyboardEnabled} onChange={(event) => setComputerKeyboardEnabled(event.target.checked)} type="checkbox" />
              <span>Computer keyboard input</span>
            </label>
            <label className="checkbox-line-v1">
              <input checked={autoAdvanceStep} onChange={(event) => setAutoAdvanceStep(event.target.checked)} type="checkbox" />
              <span>Auto-advance step</span>
            </label>
          </div>

          <div className="computer-keyboard-map-v1">
            <strong>Computer keys:</strong>
            <span>A W S E D F T G Y H U J K O L P ; '</span>
            <span>Z/X octave · [/] or arrows step · Space play</span>
          </div>

          <div className="virtual-keyboard-v1" aria-label="Playable score keyboard">
            {keyboardNotes.map((note) => (
              <button
                key={`${note.fullLabel}-${note.midi}`}
                className={note.black ? "piano-key black-key" : "piano-key white-key"}
                onClick={() => void writeRealtimeKeyboardNote(note.midi, "mouse")}
                type="button"
                title={`Play/write ${note.fullLabel} · ${note.frequencyHz.toFixed(2)} Hz · MIDI ${note.midi} to ${activeTrackId} step ${activeStepIndex}`}
              >
                <span>{note.fullLabel}</span>
                <small>{note.frequencyHz.toFixed(2)} Hz</small>
              </button>
            ))}
          </div>
          <div className="realtime-entry-status-v1">{lastRealtimeEntry}</div>
        </section>
      </div>

      <NotationRenderSyncV1 report={report} selectedNoteKey={selectedNoteKey} onSelectNote={onSelectNote} />

      <InstrumentRackAndTrackSoundV1 report={report} />

      <section className="piano-roll-grid-v1">
        <div className="board-title-row">
          <h3>Piano Roll Grid and Track Lanes</h3>
          <span>{musicTimeline?.track_count ?? 0} tracks · {musicTimeline?.total_note_count ?? 0} notes</span>
        </div>
        <div className="piano-roll-ruler-v1">
          {gridSteps.map((step) => (
            <button
              key={step}
              className={step === activeStepIndex ? "active" : ""}
              onClick={() => setActiveStepIndex(step)}
              type="button"
            >
              {step + 1}
            </button>
          ))}
        </div>
        <div className="piano-roll-lanes-v1">
          {tracks.map((track) => (
            <div key={track.track_id} className="piano-roll-track-v1">
              <div className="track-label-v1">
                <strong>{track.track_id}</strong>
                <span>{track.role}</span>
              </div>
              <div className="track-lane-grid-v1">
                {track.notes.map((note) => {
                  const noteKey = `${note.track_id}:${note.event_index}`;
                  const left = Math.min(96, Math.max(0, (note.start_ms / totalDurationMs) * 100));
                  const width = Math.max(2.5, Math.min(35, (note.duration_ms / totalDurationMs) * 100));
                  const top = Math.max(6, Math.min(78, 82 - ((note.midi_note - 36) / 48) * 72));
                  const classes = ["piano-roll-note-v1", note.resonance_lane];
                  if (selectedNoteKey === noteKey) classes.push("selected");
                  return (
                    <button
                      key={`${track.track_id}-${note.event_index}-${note.start_ms}-${note.midi_note}`}
                      className={classes.join(" ")}
                      style={{ left: `${left}%`, width: `${width}%`, top: `${top}%` }}
                      onClick={() => onSelectNote(note.track_id, note.event_index)}
                      type="button"
                      title={`${note.note_name} · ${note.start_ms}ms · ${note.frequency_hz.toFixed(2)}Hz`}
                    >
                      {note.note_name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {tracks.length === 0 && <p className="note">Import a score or load a preset to create track lanes.</p>}
        </div>
      </section>

      <div className="studio-action-strip-v1">
        <button onClick={onRefresh} type="button">Refresh Editor</button>
        <button onClick={onExportAudio} type="button">Export Audio</button>
        <button onClick={() => onLoadPreset("empty_studio_score")} type="button">Blank Preset</button>
        <span>{report ? `${report.title} · ${report.note_count} notes · hash ${report.score_hash.slice(0, 12)}` : "No editor report yet"}</span>
      </div>
    </section>
  );
}

function StatusChip({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="status-chip">
      <strong>{label}</strong>
      <em>{value}</em>
    </span>
  );
}


function NotationSpine({
  notationLayout,
  musicTimeline,
  gestureTimeline,
  motionReport,
  motionTimeMs,
  loopPhraseReport,
  playheadReport,
  modeLabel,
  selectedNoteKey,
  onSelectNote,
  variant = "full"
}: {
  notationLayout?: NotationLayoutReport | null;
  musicTimeline: MusicTimelineReport | null;
  gestureTimeline: GestureTimelineReport | null;
  motionReport: ConductorMotionReport | null;
  motionTimeMs: number;
  playheadReport?: PlayheadCursorReport | null;
  loopPhraseReport?: LoopPhraseReport | null;
  modeLabel: string;
  selectedNoteKey?: string | null;
  onSelectNote?: (trackId: string, eventIndex: number) => void;
  variant?: "full" | "compact" | "performance" | "compose";
}) {
  const fallbackVoices = (musicTimeline?.tracks ?? []).map((track, trackIndex) => ({
    track_id: track.track_id,
    role: track.role,
    display_name: track.track_id === "lead_voice" ? "Lead" : track.track_id === "depth_voice" ? "Depth" : track.track_id === "field_voice" ? "Field" : track.track_id,
    staff_y_percent: [24, 54, 78][trackIndex] ?? 88,
    note_count: track.note_count,
    notes: track.notes.map((note, noteIndex) => ({
      ...note,
      event_index: noteIndex + 1,
      track_id: track.track_id,
      role: track.role,
      measure_index: Math.floor(note.start_beat / 4) + 1,
      beat_in_measure: (note.start_beat % 4) + 1,
      x_percent: Math.min(96, Math.max(2, note.start_beat * 6)),
      width_percent: Math.max(3.8, Math.min(18, note.duration_beats * 5.2)),
      y_percent: Math.min(84, Math.max(14, 66 - (note.midi_note - 60) * 3.6))
    }))
  }));

  const fallbackCueStrip = (gestureTimeline?.events ?? []).map((cue) => ({
    event_index: cue.event_index,
    gesture_id: cue.gesture_id,
    gesture_name: cue.gesture_name,
    operator: cue.operator,
    field_region: cue.field_region,
    anchor: cue.anchor,
    start_ms: cue.start_ms,
    duration_ms: cue.duration_ms,
    end_ms: cue.end_ms,
    start_beat: cue.start_seconds * 1.4,
    duration_beats: cue.duration_seconds * 1.4,
    measure_index: Math.floor((cue.start_seconds * 1.4) / 4) + 1,
    beat_in_measure: ((cue.start_seconds * 1.4) % 4) + 1,
    x_percent: Math.min(96, Math.max(0, (cue.start_ms / Math.max(1, gestureTimeline?.total_duration_ms ?? 1)) * 100)),
    width_percent: Math.max(1.2, Math.min(18, (cue.duration_ms / Math.max(1, gestureTimeline?.total_duration_ms ?? 1)) * 100)),
    cue_text: cue.cue_text
  }));

  const voices = notationLayout?.voices ?? fallbackVoices;
  const cueBlocks = notationLayout?.cue_strip ?? fallbackCueStrip;
  const durationMs = Math.max(1, notationLayout?.total_duration_ms ?? motionReport?.total_duration_ms ?? musicTimeline?.total_duration_ms ?? 1);
  const activeEvent = getActiveEvent(motionReport, motionTimeMs);
  const cursorPercent = Math.min(99, Math.max(0, playheadReport?.score_cursor_x_percent ?? (motionTimeMs / durationMs) * 100));
  const activeNotes = playheadReport?.active_notes ?? [];
  const allNotationNotes = voices.flatMap((voice) => voice.notes);
  const findNotationNote = (trackId: string, eventIndex: number) =>
    allNotationNotes.find((note) => note.track_id === trackId && note.event_index === eventIndex) ?? null;
  const activeGeometryNote = activeNotes
    .map((note) => findNotationNote(note.track_id, note.event_index))
    .find((note): note is NonNullable<typeof note> => Boolean(note));
  const nextGeometryNote = playheadReport?.next_note
    ? findNotationNote(playheadReport.next_note.track_id, playheadReport.next_note.event_index)
    : null;
  const geometryCursorPercent = activeGeometryNote?.x_percent ?? nextGeometryNote?.x_percent ?? null;
  const activeNoteKeys = new Set(activeNotes.map((note) => `${note.track_id}:${note.event_index}`));
  const activeCueIndex = playheadReport?.active_conductor_cue?.event_index ?? null;
  const activeCueLabel = playheadReport?.active_gesture_id ?? activeEvent?.gesture_id ?? "—";
  const playheadLabel = playheadReport ? `M${playheadReport.current_measure} · beat ${playheadReport.current_beat_in_measure}` : `${Math.round(motionTimeMs)}ms`;
  const phraseStartPercent = Math.max(0, Math.min(100, loopPhraseReport?.start_cursor_x_percent ?? 0));
  const phraseEndPercent = Math.max(phraseStartPercent, Math.min(100, loopPhraseReport?.end_cursor_x_percent ?? 0));
  const phraseWidthPercent = Math.max(0.5, phraseEndPercent - phraseStartPercent);
  const measureCount = Math.max(4, notationLayout?.measure_count ?? Math.ceil((musicTimeline?.total_duration_seconds ?? 0) / 2.856));
  const ruler = Array.from({ length: Math.min(12, measureCount) }, (_, index) => index + 1);
  const meter = notationLayout?.meter ?? musicTimeline?.meter ?? "4/4";
  const tempo = notationLayout?.tempo_bpm ?? musicTimeline?.tempo_bpm ?? 84;
  const noteCount = notationLayout?.note_count ?? musicTimeline?.total_note_count ?? 0;
  const syncedCursorPercent = Math.min(99, Math.max(0, geometryCursorPercent ?? cursorPercent));

  return (
    <section className={`notation-spine notation-spine-${variant}`} aria-label={`${modeLabel} notation spine`}>
      <div className="notation-spine-header">
        <div>
          <p className="eyebrow">Persistent Score Spine</p>
          <h3>{modeLabel} Music Reading View</h3>
        </div>
        <div className="notation-meta-strip">
          <StatusChip label="Meter" value={meter} />
          <StatusChip label="Tempo" value={`${tempo} BPM`} />
          <StatusChip label="Notes" value={noteCount} />
          <StatusChip label="Cue" value={activeCueLabel} />
          <StatusChip label="Playhead" value={playheadLabel} />
        </div>
      </div>

      <div className="notation-score-window">
        <div className="notation-measure-ruler">{ruler.map((measure) => <span key={measure}>M{measure}</span>)}</div>
        <div className="notation-staff-stack">
          {voices.map((voice) => (
            <div key={voice.track_id} className="notation-voice-row">
              <div className="notation-voice-label"><strong>{voice.display_name}</strong><span>{voice.role}</span></div>
              <div className="notation-staff-lane">
                {[0, 1, 2, 3, 4].map((line) => <span key={line} className="notation-staff-line" />)}
                {loopPhraseReport && (
                  <span
                    className="notation-loop-window"
                    style={{ left: `${phraseStartPercent}%`, width: `${phraseWidthPercent}%` }}
                    aria-hidden="true"
                  />
                )}
                <span className="notation-lane-playhead" style={{ left: `${syncedCursorPercent}%` }} aria-hidden="true" />
                {voice.notes.slice(0, 32).map((note) => {
                  const noteKey = `${note.track_id}:${note.event_index}`;
                  const noteClasses = ["notation-note", note.resonance_lane];
                  if (selectedNoteKey === noteKey) {
                    noteClasses.push("selected");
                  }
                  if (activeNoteKeys.has(noteKey)) {
                    noteClasses.push("playing");
                  }

                  return (
                    <button
                      key={`${voice.track_id}-${note.event_index}-${note.start_ms}-${note.midi_note}`}
                      className={noteClasses.join(" ")}
                      style={{ left: `${note.x_percent}%`, top: `${note.y_percent}%`, width: `${note.width_percent}%` }}
                      title={`${note.note_name} · M${note.measure_index} beat ${note.beat_in_measure} · ${note.frequency_hz.toFixed(2)} Hz`}
                      onClick={() => onSelectNote?.(note.track_id, note.event_index)}
                      type="button"
                    >
                      {note.note_name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="notation-playhead" style={{ left: `${syncedCursorPercent}%` }}><span>{playheadLabel}</span></div>
      </div>

      <div className="notation-cue-strip">
        {cueBlocks.slice(0, 24).map((cue) => {
          const cueActive = activeCueIndex === cue.event_index || activeEvent?.gesture_id === cue.gesture_id;
          return (
            <span
              key={`${cue.event_index}-${cue.gesture_id}-${cue.start_ms}`}
              className={cueActive ? "notation-cue active" : "notation-cue"}
              style={{ left: `${cue.x_percent}%`, width: `${cue.width_percent}%` }}
              title={`${cue.cue_text} · M${cue.measure_index} beat ${cue.beat_in_measure}`}
            >
              {cue.gesture_id} · {cue.gesture_name}
            </span>
          );
        })}
        {cueBlocks.length === 0 && <span className="notation-cue empty">Load or map a conductor path to show cues.</span>}
      </div>
    </section>
  );
}

function VisibleConductorMotion({
  report,
  timeMs,
  isPlaying,
  onPlay,
  onStop,
  onReset
}: {
  report: ConductorMotionReport | null;
  timeMs: number;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onReset: () => void;
}) {
  const activePoint = useMemo(() => getMotionPoint(report, timeMs), [report, timeMs]);
  const activeEvent = useMemo(() => getActiveEvent(report, timeMs), [report, timeMs]);
  const marker = conductorPointToSvg(activePoint);

  const pathPoints =
    report?.sampled_points
      .map((point) => `${Math.round(point.x * 1000)},${Math.round(point.y * 600)}`)
      .join(" ") ?? "";

  return (
    <div className="motion-stage performance-motion-stage">
      <div className="motion-toolbar compact-toolbar">
        <button onClick={onPlay} disabled={!report || report.event_count === 0 || isPlaying} type="button">
          Animate
        </button>
        <button onClick={onStop} disabled={!isPlaying} type="button">
          Stop Motion
        </button>
        <button onClick={onReset} type="button">
          Reset
        </button>
      </div>

      <svg viewBox="0 0 1000 600" role="img" aria-label="Visible conductor motion field">
        <rect className="motion-bg" x="0" y="0" width="1000" height="600" rx="26" />
        <line className="motion-guide" x1="160" y1="90" x2="840" y2="90" />
        <line className="motion-guide" x1="160" y1="300" x2="840" y2="300" />
        <line className="motion-guide" x1="160" y1="510" x2="840" y2="510" />

        <circle className="motion-anchor" cx="500" cy="90" r="42" />
        <text className="motion-label" x="500" y="99" textAnchor="middle">9</text>

        <circle className="motion-anchor" cx="500" cy="300" r="42" />
        <text className="motion-label" x="500" y="309" textAnchor="middle">1</text>

        <circle className="motion-anchor" cx="500" cy="510" r="42" />
        <text className="motion-label" x="500" y="519" textAnchor="middle">5</text>

        {report?.event_views.map((event) => (
          <circle
            key={`${event.event_index}-${event.gesture_id}`}
            className={activeEvent?.event_index === event.event_index ? "motion-event active" : "motion-event"}
            cx={event.target_x * 1000}
            cy={event.target_y * 600}
            r={10 + event.intensity * 12}
          />
        ))}

        {pathPoints && <polyline className="motion-path" points={pathPoints} />}

        <circle className="motion-hand-glow" cx={marker.x} cy={marker.y} r="42" />
        <circle className="motion-hand" cx={marker.x} cy={marker.y} r="18" />
        <text className="motion-hand-label" x={marker.x} y={marker.y + 5} textAnchor="middle">
          {activePoint?.gesture_id ?? "g1"}
        </text>
      </svg>

      <div className="motion-readout">
        <strong>{activeEvent ? `${activeEvent.gesture_id} — ${activeEvent.gesture_name}` : "No motion loaded"}</strong>
        <span>{activeEvent?.motion_label ?? "Load or generate a conductor motion report."}</span>
        <span>
          time {Math.round(timeMs)} ms / {report?.total_duration_ms ?? 0} ms
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<OperatorTab>("field");

  useEffect(() => {
    setActiveTab("field");
    try {
      window.localStorage?.removeItem("hcs.activeTab");
      window.sessionStorage?.setItem("hcs.desktopLauncherStartupMode", "studio");
      window.sessionStorage?.setItem("hcs.desktopLauncherStartupContract", HCS_DESKTOP_LAUNCHER_STUDIO_STARTUP_FIX_V1_CONTRACT_ID);
    } catch {
      // Startup mode should never block the studio if browser storage is unavailable.
    }
  }, []);
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<DiagnosticKey>("motionReport");
  const [report, setReport] = useState<PreviewReport | null>(null);
  const [musicReport, setMusicReport] = useState<MusicPreviewReport | null>(null);
  const [resonanceBundle, setResonanceBundle] = useState<ResonanceLevelBundle | null>(null);
  const [musicTimeline, setMusicTimeline] = useState<MusicTimelineReport | null>(null);
  const [notationLayout, setNotationLayout] = useState<NotationLayoutReport | null>(null);
  const [notationEditReport, setNotationEditReport] = useState<NotationEditReport | null>(null);
  const [selectedNotationNote, setSelectedNotationNote] = useState<NotationLayoutReport["selected_note"]>(null);
  const [noteEditMidi, setNoteEditMidi] = useState("64");
  const [noteEditDurationMs, setNoteEditDurationMs] = useState("714");
  const [noteEditVelocity, setNoteEditVelocity] = useState("0.8");
  const [noteEditTrackId, setNoteEditTrackId] = useState("lead_voice");
  const [noteEditStartMs, setNoteEditStartMs] = useState("0");
  const [noteEditMeasureIndex, setNoteEditMeasureIndex] = useState("1");
  const [noteEditBeatInMeasure, setNoteEditBeatInMeasure] = useState("1");
  const [gestureTimeline, setGestureTimeline] = useState<GestureTimelineReport | null>(null);
  const [mappingReport, setMappingReport] = useState<ConductorMappingReport | null>(null);
  const [motionReport, setMotionReport] = useState<ConductorMotionReport | null>(null);
  const [motionTimeMs, setMotionTimeMs] = useState(0);
  const [projectFileName, setProjectFileName] = useState("ode_to_joy_mapped_v1.hfield");
  const [projectReport, setProjectReport] = useState<ProjectFileReport | null>(null);
  const [projectList, setProjectList] = useState<ProjectListReport | null>(null);
  const [packetContractReport, setPacketContractReport] = useState<HfieldPacketContractReport | null>(null);
  const [identityVaultReferenceReport, setIdentityVaultReferenceReport] = useState<HfieldIdentityVaultReferenceBindingReport | null>(null);
  const [fieldSynthesisReport, setFieldSynthesisReport] = useState<HfieldFieldSynthesisReport | null>(null);
  const [forgeBridgeStubReport, setForgeBridgeStubReport] = useState<ForgePacketBridgeStubReport | null>(null);
  const [playheadCursorReport, setPlayheadCursorReport] = useState<PlayheadCursorReport | null>(null);
  const [loopStartMeasure, setLoopStartMeasure] = useState(1);
  const [loopEndMeasure, setLoopEndMeasure] = useState(2);
  const [loopPhraseReport, setLoopPhraseReport] = useState<LoopPhraseReport | null>(null);
  const [motionPlaybackEndMs, setMotionPlaybackEndMs] = useState<number | null>(null);
  const [isMotionPlaying, setIsMotionPlaying] = useState(false);
  const motionStartRef = useRef(0);
  const playheadReportRequestRef = useRef(-10000);
  const wallClockStartRef = useRef(0);

  const [wavReport, setWavReport] = useState<WavRenderReport | null>(null);
  const [musicWavReport, setMusicWavReport] = useState<WavRenderReport | null>(null);
  const [combinedWavReport, setCombinedWavReport] = useState<WavRenderReport | null>(null);
  const [currentProjectWavReport, setCurrentProjectWavReport] = useState<WavRenderReport | null>(null);
  const [currentProjectMusicWavReport, setCurrentProjectMusicWavReport] = useState<WavRenderReport | null>(null);
  const [hfieldProjectJsonExportReport, setHfieldProjectJsonExportReport] = useState<ExportFileReport | null>(null);
  const [hfieldReaderBundleExportReport, setHfieldReaderBundleExportReport] = useState<ExportFileReport | null>(null);
  const [hfieldRenderManifestExportReport, setHfieldRenderManifestExportReport] = useState<ExportFileReport | null>(null);
  const [hfieldCymaticSurfaceExportReport, setHfieldCymaticSurfaceExportReport] = useState<ExportFileReport | null>(null);
  const [hfieldRuntimeCarrierExportReport, setHfieldRuntimeCarrierExportReport] = useState<ExportFileReport | null>(null);
  const [hfieldPacketContractExportReport, setHfieldPacketContractExportReport] = useState<ExportFileReport | null>(null);
  const [hfieldCombinedWavExportReport, setHfieldCombinedWavExportReport] = useState<WavRenderReport | null>(null);
  const [hfieldCanonicalBundleManifestExportReport, setHfieldCanonicalBundleManifestExportReport] = useState<HfieldCanonicalBundleManifestExportReport | null>(null);
  const [hfieldExportReplayVerifierReport, setHfieldExportReplayVerifierReport] = useState<HfieldExportReplayVerifierReport | null>(null);
  const [hfieldSchemaMigrationRegistryReport, setHfieldSchemaMigrationRegistryReport] = useState<HfieldSchemaVersionMigrationRegistryReport | null>(null);
  const [nineGestureConductorEngineReport, setNineGestureConductorEngineReport] = useState<HfieldNineGestureConductorEngineReport | null>(null);
  const [harmonicFieldScoreV1UpgradeReport, setHarmonicFieldScoreV1UpgradeReport] = useState<HfieldHarmonicFieldScoreV1UpgradeReport | null>(null);
  const [couplingProfileEngineV1Report, setCouplingProfileEngineV1Report] = useState<HfieldCouplingProfileEngineV1Report | null>(null);
  const [motifLibraryAnnotationLayerV1Report, setMotifLibraryAnnotationLayerV1Report] = useState<HfieldMotifLibraryAnnotationLayerV1Report | null>(null);
  const [deterministicAudioEngineV2Report, setDeterministicAudioEngineV2Report] = useState<HfieldDeterministicAudioEngineV2Report | null>(null);
  const [trueConductorGestureReferenceManifestReport, setTrueConductorGestureReferenceManifestReport] = useState<HfieldTrueConductorGestureReferenceManifestV1Report | null>(null);
  const [trueConductorGestureReferenceManifestExportReport, setTrueConductorGestureReferenceManifestExportReport] = useState<ExportFileReport | null>(null);
  const [gestureAwareFieldRendererV2Report, setGestureAwareFieldRendererV2Report] = useState<HfieldGestureAwareFieldRendererV2Report | null>(null);
  const [gestureAwareFieldRendererV2ExportReport, setGestureAwareFieldRendererV2ExportReport] = useState<ExportFileReport | null>(null);
  const [cymaticFieldModelV2Report, setCymaticFieldModelV2Report] = useState<HfieldCymaticFieldModelV2Report | null>(null);
  const [cymaticFieldModelV2ExportReport, setCymaticFieldModelV2ExportReport] = useState<ExportFileReport | null>(null);
  const [syllableShapedExpressionV1Report, setSyllableShapedExpressionV1Report] = useState<HfieldSyllableShapedExpressionV1Report | null>(null);
  const [syllableShapedExpressionV1ExportReport, setSyllableShapedExpressionV1ExportReport] = useState<ExportFileReport | null>(null);
  const [hcsSqliteLibraryV1Report, setHcsSqliteLibraryV1Report] = useState<HcsSqliteMotifProjectLibraryV1Report | null>(null);
  const [hcsProductionPackagingV1Report, setHcsProductionPackagingV1Report] = useState<HcsProductionPackagingV1Report | null>(null);
  const [trackEditorAndPianoRollV1Report, setTrackEditorAndPianoRollV1Report] = useState<HcsTrackEditorAndPianoRollV1Report | null>(null);
  const [hcsStudioCreationBackendAndPlaceholderPurgeV1Report, setHcsStudioCreationBackendAndPlaceholderPurgeV1Report] = useState<HcsStudioCreationBackendAndPlaceholderPurgeV1Report | null>(null);
  const [mappedWavReport, setMappedWavReport] = useState<WavRenderReport | null>(null);
  const [playbackReport, setPlaybackReport] = useState<PlaybackReport | null>(null);
  const [playbackClockReport, setPlaybackClockReport] = useState<PlaybackClockReport | null>(null);
  const [stopReport, setStopReport] = useState<StopReport | null>(null);
  const [deviceReport, setDeviceReport] = useState<unknown>(null);
  const [vocabulary, setVocabulary] = useState<unknown>(null);
  const [score, setScore] = useState<unknown>(null);
  const [seedMusicScore, setSeedMusicScore] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isMotionPlaying || !motionReport) {
      return undefined;
    }

    let animationFrame = 0;

    const tick = (now: number) => {
      const elapsed = now - wallClockStartRef.current;
      const playbackLimitMs = motionPlaybackEndMs ?? motionReport.total_duration_ms;
      const nextTime = Math.min(motionStartRef.current + elapsed, playbackLimitMs);
      setMotionTimeMs(nextTime);

      if (nextTime >= playbackLimitMs) {
        setIsMotionPlaying(false);
        return;
      }

      animationFrame = requestAnimationFrame(tick);
    };

    wallClockStartRef.current = performance.now();
    animationFrame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [isMotionPlaying, motionReport, motionPlaybackEndMs]);

  // Rust-owned playhead cursor sync. The UI clock supplies time; Rust computes
  // measure, beat, active notes, and active conductor cue for that instant.
  useEffect(() => {
    if (!notationLayout && !musicTimeline) {
      return;
    }

    const roundedTime = Math.round(motionTimeMs);
    if (isMotionPlaying && Math.abs(roundedTime - playheadReportRequestRef.current) < 120) {
      return;
    }

    playheadReportRequestRef.current = roundedTime;
    let cancelled = false;

    getCurrentPlayheadCursorReport(roundedTime)
      .then((nextReport) => {
        if (!cancelled) {
          setPlayheadCursorReport(nextReport);
        }
      })
      .catch(() => {
        // Keep playback smooth if the diagnostic cursor endpoint is temporarily unavailable.
      });

    return () => {
      cancelled = true;
    };
  }, [motionTimeMs, isMotionPlaying, notationLayout?.total_duration_ms, musicTimeline?.total_duration_ms]);

  function startMotionAnimation() {
    motionStartRef.current = motionTimeMs;
    setMotionPlaybackEndMs(null);
    setIsMotionPlaying(true);
  }


  // Backend audio clock is the authority for score cursor, playhead report, and field scan.
  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    async function pullPlaybackClock() {
      try {
        const clock = await getPlaybackClockReport();

        if (cancelled) {
          return;
        }

        setPlaybackClockReport(clock);

        if (clock.status === "playing" || clock.status === "ended") {
          const nextTimeMs = Math.max(0, Math.round(clock.current_time_ms));
          setMotionTimeMs(nextTimeMs);

          if (Math.abs(nextTimeMs - playheadReportRequestRef.current) >= 40 || clock.status === "ended") {
            playheadReportRequestRef.current = nextTimeMs;
            const nextPlayhead = await getCurrentPlayheadCursorReport(nextTimeMs);

            if (!cancelled) {
              setPlayheadCursorReport(nextPlayhead);
            }
          }

          if (clock.status === "ended") {
            setIsMotionPlaying(false);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("playback clock sync failed", error);
        }
      }
    }

    const shouldPollClock =
      isMotionPlaying ||
      (playbackReport?.status === "ok" && playbackClockReport?.status !== "ended");

    if (shouldPollClock) {
      void pullPlaybackClock();
      intervalId = window.setInterval(() => {
        void pullPlaybackClock();
      }, 60);
    }

    return () => {
      cancelled = true;
      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }
    };
  }, [isMotionPlaying, playbackReport?.status, playbackClockReport?.status]);

  function stopMotionAnimation() {
    motionStartRef.current = motionTimeMs;
    setIsMotionPlaying(false);
  }

  function resetMotionAnimation() {
    motionStartRef.current = 0;
    setMotionTimeMs(0);
    setMotionPlaybackEndMs(null);
    setIsMotionPlaying(false);
  }

  function setSelectedNoteForEditing(note: NotationLayoutReport["selected_note"]) {
    setSelectedNotationNote(note);
    if (!note) {
      return;
    }

    setNoteEditMidi(String(note.midi_note));
    setNoteEditDurationMs(String(note.duration_ms));
    setNoteEditVelocity(String(Math.round(note.velocity * 100) / 100));
    setNoteEditTrackId(note.track_id);
    setNoteEditStartMs(String(note.start_ms));
    setNoteEditMeasureIndex(String(note.measure_index));
    setNoteEditBeatInMeasure(String(note.beat_in_measure));
  }

  async function refreshAllCurrentProjectViews() {
    const currentScore = await getCurrentProjectScore();
    setSeedMusicScore(currentScore);
    setResonanceBundle(await getCurrentResonanceLevelBundle());
    setMusicTimeline(await getCurrentMusicTimeline());
    setTrackEditorAndPianoRollV1Report(await getHcsTrackEditorAndPianoRollV1Report());
    const nextNotationLayout = await getCurrentNotationLayout();
    setNotationLayout(nextNotationLayout);
    setSelectedNoteForEditing(nextNotationLayout.selected_note);
    setGestureTimeline(await getCurrentGestureTimeline());
    setMappingReport(await getCurrentConductorMappingReport());
    setMotionReport(await getCurrentConductorMotionReport());
    setPacketContractReport(await getCurrentHfieldPacketContractReport());
    setFieldSynthesisReport(await getCurrentHfieldFieldSynthesisReport());
    setForgeBridgeStubReport(await getCurrentForgePacketBridgeStubReport());
    setPlayheadCursorReport(await getCurrentPlayheadCursorReport(0));
    setLoopPhraseReport(await getCurrentLoopPhraseReport(loopStartMeasure, loopEndMeasure));
    resetMotionAnimation();
  }

  async function refreshFieldSynthesis() {
    setError(null);
    try {
      setFieldSynthesisReport(await getCurrentHfieldFieldSynthesisReport());
      setSelectedDiagnostic("fieldSynthesis");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function refreshProjectList() {
    setError(null);
    try {
      setProjectList(await listSavedProjects());
      setSelectedDiagnostic("projectList");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function saveProject() {
    setError(null);
    try {
      const saved = await saveCurrentProjectAs(projectFileName);
      setProjectReport(saved);
      setProjectList(await listSavedProjects());
      setSelectedDiagnostic("projectReport");
      await refreshAllCurrentProjectViews();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function openProject(fileName?: string) {
    setError(null);
    try {
      const target = fileName ?? projectFileName;
      const opened = await openProjectByFileName(target);
      setProjectFileName(opened.file_name);
      setProjectReport(opened);
      setProjectList(await listSavedProjects());
      setSelectedDiagnostic("projectReport");
      await refreshAllCurrentProjectViews();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function runPreview() {
    setError(null);
    try {
      setScore(await createDefaultScore());
      setVocabulary(await getGestureVocabulary());
      setReport(await previewScoreReport());
      setDeviceReport(await getAudioDeviceReport());
      setSelectedDiagnostic("rustPreview");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function loadSeedMusic() {
    setError(null);
    try {
      setSeedMusicScore(await loadSeedMusicProject());
      setMusicReport(await previewSeedMusicReport());
      await refreshAllCurrentProjectViews();
      setProjectList(await listSavedProjects());
      setSelectedDiagnostic("musicReport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function refreshMusicTimeline() {
    setError(null);
    try {
      setMusicTimeline(await getCurrentMusicTimeline());
      setSelectedDiagnostic("musicTimeline");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }



  async function refreshTrackEditorAndPianoRollV1() {
    setError(null);
    try {
      setTrackEditorAndPianoRollV1Report(await getHcsTrackEditorAndPianoRollV1Report());
      setMusicTimeline(await getCurrentMusicTimeline());
      const nextNotationLayout = await getCurrentNotationLayout();
      setNotationLayout(nextNotationLayout);
      setSelectedNoteForEditing(nextNotationLayout.selected_note);
      setPlayheadCursorReport(await getCurrentPlayheadCursorReport(Math.round(motionTimeMs)));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function importStudioScoreJsonV1(scoreJson: string) {
    setError(null);
    try {
      const imported = await importHcsStudioScoreJsonV1(scoreJson);
      setTrackEditorAndPianoRollV1Report(imported);
      setMusicTimeline(imported.music_timeline);
      setNotationLayout(imported.notation_layout);
      setSelectedNoteForEditing(imported.notation_layout.selected_note);
      setMotionTimeMs(0);
      setPlayheadCursorReport(await getCurrentPlayheadCursorReport(0));
      setFieldSynthesisReport(await getCurrentHfieldFieldSynthesisReport());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function loadStudioScorePresetV1(presetId: string) {
    setError(null);
    try {
      const loaded = await loadHcsStudioScorePresetV1(presetId);
      setTrackEditorAndPianoRollV1Report(loaded);
      setMusicTimeline(loaded.music_timeline);
      setNotationLayout(loaded.notation_layout);
      setSelectedNoteForEditing(loaded.notation_layout.selected_note);
      setMotionTimeMs(0);
      setPlayheadCursorReport(await getCurrentPlayheadCursorReport(0));
      setFieldSynthesisReport(await getCurrentHfieldFieldSynthesisReport());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function setPianoRollNoteV1(trackId: string, stepIndex: number, midiNote: number, durationSteps: number, velocity: number, stepMs: number) {
    setError(null);
    try {
      const updated = await setHcsPianoRollNoteV1(trackId, stepIndex, midiNote, durationSteps, velocity, stepMs);
      setTrackEditorAndPianoRollV1Report(updated);
      setMusicTimeline(updated.music_timeline);
      setNotationLayout(updated.notation_layout);
      setSelectedNoteForEditing(updated.notation_layout.selected_note);
      setPlayheadCursorReport(await getCurrentPlayheadCursorReport(Math.round(motionTimeMs)));
      setFieldSynthesisReport(await getCurrentHfieldFieldSynthesisReport());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function clearStudioScoreV1() {
    setError(null);
    try {
      const cleared = await clearCurrentStudioScoreV1();
      setTrackEditorAndPianoRollV1Report(cleared);
      setMusicTimeline(cleared.music_timeline);
      setNotationLayout(cleared.notation_layout);
      setSelectedNoteForEditing(cleared.notation_layout.selected_note);
      setMotionTimeMs(0);
      setPlayheadCursorReport(await getCurrentPlayheadCursorReport(0));
      setFieldSynthesisReport(await getCurrentHfieldFieldSynthesisReport());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function selectNotationNote(trackId: string, eventIndex: number) {
    setError(null);
    try {
      const selected = await selectCurrentNotationNote(trackId, eventIndex);
      setSelectedNoteForEditing(selected);
      setSelectedDiagnostic("notationEditReport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function refreshAfterNotationEdit(editReport: NotationEditReport) {
    setNotationEditReport(editReport);
    setNotationLayout(editReport.layout);
    setSelectedNoteForEditing(editReport.selected_note ?? editReport.layout.selected_note);
    setMusicTimeline(await getCurrentMusicTimeline());
    setMappingReport(await getCurrentConductorMappingReport());
    setMotionReport(await getCurrentConductorMotionReport());
    setSeedMusicScore(await getCurrentProjectScore());
    setPlayheadCursorReport(await getCurrentPlayheadCursorReport(editReport.selected_note?.start_ms ?? 0));
    setFieldSynthesisReport(await getCurrentHfieldFieldSynthesisReport());
    setSelectedDiagnostic("notationEditReport");
  }

  async function editSelectedNotationNote() {
    setError(null);
    if (!selectedNotationNote) {
      setError("Select a notation note before editing.");
      return;
    }

    try {
      const editReport = await editCurrentNotationNote(
        selectedNotationNote.track_id,
        selectedNotationNote.event_index,
        Number(noteEditMidi),
        Number(noteEditDurationMs),
        Number(noteEditVelocity),
        noteEditTrackId
      );

      await refreshAfterNotationEdit(editReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }


  async function positionSelectedNotationNoteStartMs() {
    setError(null);
    if (!selectedNotationNote) {
      setError("Select a notation note before positioning.");
      return;
    }

    try {
      const editReport = await positionCurrentNotationNoteStartMs(
        selectedNotationNote.track_id,
        selectedNotationNote.event_index,
        Number(noteEditStartMs)
      );

      await refreshAfterNotationEdit(editReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function positionSelectedNotationNoteMeasureBeat() {
    setError(null);
    if (!selectedNotationNote) {
      setError("Select a notation note before positioning.");
      return;
    }

    try {
      const editReport = await positionCurrentNotationNoteMeasureBeat(
        selectedNotationNote.track_id,
        selectedNotationNote.event_index,
        Number(noteEditMeasureIndex),
        Number(noteEditBeatInMeasure)
      );

      await refreshAfterNotationEdit(editReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function nudgeSelectedNotationNote(beatDelta: number) {
    setError(null);
    if (!selectedNotationNote) {
      setError("Select a notation note before nudging.");
      return;
    }

    try {
      const editReport = await nudgeCurrentNotationNoteBeats(
        selectedNotationNote.track_id,
        selectedNotationNote.event_index,
        beatDelta
      );

      await refreshAfterNotationEdit(editReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function deleteSelectedNotationNote() {
    setError(null);
    if (!selectedNotationNote) {
      setError("Select a notation note before deleting.");
      return;
    }

    try {
      const editReport = await deleteCurrentNotationNote(
        selectedNotationNote.track_id,
        selectedNotationNote.event_index
      );

      await refreshAfterNotationEdit(editReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function appendMusicNote(trackId: string, midiNote: number, durationMs: number, velocity: number) {
    setError(null);
    try {
      setMusicTimeline(await appendNoteToCurrentTrack(trackId, midiNote, durationMs, velocity));
      setMappingReport(await getCurrentConductorMappingReport());
      setMotionReport(await getCurrentConductorMotionReport());
      setSeedMusicScore(await getCurrentProjectScore());
      const nextNotationLayout = await getCurrentNotationLayout();
      setNotationLayout(nextNotationLayout);
      setSelectedNoteForEditing(nextNotationLayout.selected_note);
      setSelectedDiagnostic("musicTimeline");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }


  async function appendNoteFromEditor() {
    const midi = Number(noteEditMidi);
    const duration = Number(noteEditDurationMs);
    const velocity = Number(noteEditVelocity);

    if (!Number.isFinite(midi) || midi < 0 || midi > 127) {
      setError("MIDI pitch must be a number from 0 to 127.");
      return;
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      setError("Duration must be a positive number of milliseconds.");
      return;
    }
    if (!Number.isFinite(velocity) || velocity < 0 || velocity > 1) {
      setError("Velocity must be between 0 and 1.");
      return;
    }

    await appendMusicNote(noteEditTrackId, Math.round(midi), Math.round(duration), velocity);
  }

  async function clearMusicTrack(trackId: string) {
    setError(null);
    try {
      setMusicTimeline(await clearCurrentMusicTrack(trackId));
      setMappingReport(await getCurrentConductorMappingReport());
      setMotionReport(await getCurrentConductorMotionReport());
      setSeedMusicScore(await getCurrentProjectScore());
      const nextNotationLayout = await getCurrentNotationLayout();
      setNotationLayout(nextNotationLayout);
      setSelectedNoteForEditing(nextNotationLayout.selected_note);
      setSelectedDiagnostic("musicTimeline");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function resetMusicNotes() {
    setError(null);
    try {
      setMusicTimeline(await resetCurrentMusicToSeed());
      setMappingReport(await getCurrentConductorMappingReport());
      setMotionReport(await getCurrentConductorMotionReport());
      setSeedMusicScore(await getCurrentProjectScore());
      const nextNotationLayout = await getCurrentNotationLayout();
      setNotationLayout(nextNotationLayout);
      setSelectedNoteForEditing(nextNotationLayout.selected_note);
      setSelectedDiagnostic("musicTimeline");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function refreshTimeline() {
    setError(null);
    try {
      setGestureTimeline(await getCurrentGestureTimeline());
      setMotionReport(await getCurrentConductorMotionReport());
      setSelectedDiagnostic("gestureTimeline");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function appendGesture(gestureId: string, durationMs: number, intensity: number, operator: string) {
    setError(null);
    try {
      setGestureTimeline(await appendGestureToCurrentScore(gestureId, durationMs, intensity, operator));
      setMotionReport(await getCurrentConductorMotionReport());
      setSeedMusicScore(await getCurrentProjectScore());
      setNotationLayout(await getCurrentNotationLayout());
      setSelectedDiagnostic("gestureTimeline");
      resetMotionAnimation();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function clearTimeline() {
    setError(null);
    try {
      setGestureTimeline(await clearCurrentGestureTimeline());
      setMotionReport(await getCurrentConductorMotionReport());
      setSeedMusicScore(await getCurrentProjectScore());
      setNotationLayout(await getCurrentNotationLayout());
      setSelectedDiagnostic("gestureTimeline");
      resetMotionAnimation();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function resetTimeline() {
    setError(null);
    try {
      setGestureTimeline(await resetCurrentGestureTimelineToStandardPath());
      setMotionReport(await getCurrentConductorMotionReport());
      setSeedMusicScore(await getCurrentProjectScore());
      setNotationLayout(await getCurrentNotationLayout());
      setSelectedDiagnostic("gestureTimeline");
      resetMotionAnimation();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function generateMappingReport() {
    setError(null);
    try {
      setMappingReport(await getCurrentConductorMappingReport());
      setSelectedDiagnostic("mappingReport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function applyGeneratedMapping() {
    setError(null);
    try {
      setMappingReport(await applyGeneratedConductorMappingToCurrentScore());
      await refreshAllCurrentProjectViews();
      setSelectedDiagnostic("mappingReport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function refreshCurrentMotion() {
    setError(null);
    try {
      setMotionReport(await getCurrentConductorMotionReport());
      setSelectedDiagnostic("motionReport");
      resetMotionAnimation();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function previewGeneratedMotion() {
    setError(null);
    try {
      setMotionReport(await getGeneratedConductorMotionReport());
      setSelectedDiagnostic("motionReport");
      resetMotionAnimation();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function playGeneratedConductor() {
    setError(null);
    try {
      setMotionPlaybackEndMs(null);
      setPlaybackReport(await playGeneratedConductorMappingAudio());
      setMotionReport(await getGeneratedConductorMotionReport());
      setSelectedDiagnostic("playbackReport");
      resetMotionAnimation();
      setIsMotionPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function playGeneratedCombined() {
    setError(null);
    try {
      setMotionPlaybackEndMs(null);
      setPlaybackReport(await playGeneratedMappedCombinedAudio());
      setMotionReport(await getGeneratedConductorMotionReport());
      setSelectedDiagnostic("playbackReport");
      resetMotionAnimation();
      setIsMotionPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function renderGeneratedMappedWav() {
    setError(null);
    try {
      setMappedWavReport(await renderGeneratedMappedCombinedWav());
      setSelectedDiagnostic("mappedWav");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function renderWav() {
    setError(null);
    try {
      setWavReport(await renderFirstGestureWav());
      setSelectedDiagnostic("gestureWav");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function renderMusicWav() {
    setError(null);
    try {
      setMusicWavReport(await renderSeedMusicWav());
      setSelectedDiagnostic("musicWav");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function renderCombinedWav() {
    setError(null);
    try {
      setCombinedWavReport(await renderSeedCombinedWav());
      setSelectedDiagnostic("combinedWav");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }



  async function refreshIdentityVaultReference() {
    setError(null);
    try {
      setIdentityVaultReferenceReport(await getCurrentHfieldIdentityVaultReferenceReport());
      setSelectedDiagnostic("identityVaultReference");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function bindIdentityVaultReferenceOnly() {
    setError(null);
    try {
      const nextReport = await bindCurrentHfieldIdentityVaultReference();
      setIdentityVaultReferenceReport(nextReport);
      setPacketContractReport(await getCurrentHfieldPacketContractReport());
      setSelectedDiagnostic("identityVaultReference");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function exportHfieldProjectJson() {
    setError(null);
    try {
      setHfieldProjectJsonExportReport(await exportCurrentHfieldProjectJson());
      setSelectedDiagnostic("hfieldProjectJsonExport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function exportHfieldReaderBundle() {
    setError(null);
    try {
      setHfieldReaderBundleExportReport(await exportCurrentHfieldReaderBundleJson());
      setSelectedDiagnostic("hfieldReaderBundleExport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function exportHfieldRenderManifest() {
    setError(null);
    try {
      setHfieldRenderManifestExportReport(await exportCurrentHfieldRustRenderManifestJson());
      setSelectedDiagnostic("hfieldRenderManifestExport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function exportHfieldCymaticSurface() {
    setError(null);
    try {
      setHfieldCymaticSurfaceExportReport(await exportCurrentHfieldCymaticSurfaceJson());
      setSelectedDiagnostic("hfieldCymaticSurfaceExport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function exportHfieldRuntimeCarrier() {
    setError(null);
    try {
      setHfieldRuntimeCarrierExportReport(await exportCurrentHfieldRuntimeCarrierPacketJson());
      setSelectedDiagnostic("hfieldRuntimeCarrierExport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function exportHfieldPacketContract() {
    setError(null);
    try {
      setHfieldPacketContractExportReport(await exportCurrentHfieldPacketContractJson());
      setSelectedDiagnostic("hfieldPacketContractExport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function exportHfieldCombinedWav() {
    setError(null);
    try {
      setHfieldCombinedWavExportReport(await exportCurrentHfieldCombinedWav());
      setSelectedDiagnostic("hfieldCombinedWavExport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }


  async function exportHfieldCanonicalBundleManifest() {
    setError(null);
    try {
      setHfieldCanonicalBundleManifestExportReport(await exportCurrentHfieldCanonicalBundleManifestJson());
      setSelectedDiagnostic("hfieldCanonicalBundleManifestExport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function exportHfieldCanonicalBundleManifestV2() {
    setError(null);
    try {
      setHfieldCanonicalBundleManifestExportReport(await exportCurrentHfieldCanonicalBundleManifestV2Json());
      setSelectedDiagnostic("hfieldCanonicalBundleManifestExport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }



  async function verifyHfieldExportReplayManifest() {
    setError(null);
    try {
      setHfieldExportReplayVerifierReport(await verifyLatestHfieldExportReplayManifestJson());
      setSelectedDiagnostic("hfieldExportReplayVerifier");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }


  async function inspectHfieldSchemaMigrationRegistry() {
    setError(null);
    try {
      const registry = await getHfieldSchemaVersionMigrationRegistryJson();
      const inspection = await inspectCurrentHfieldSchemaMigrationRegistryJson();
      setHfieldSchemaMigrationRegistryReport({
        ...inspection,
        registry,
      });
      setSelectedDiagnostic("hfieldSchemaMigrationRegistry");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }


  async function inspectNineGestureConductorEngine() {
    setError(null);
    try {
      setNineGestureConductorEngineReport(await getCurrentNineGestureConductorEngineReport());
      setSelectedDiagnostic("nineGestureConductorEngine");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }


  async function inspectHarmonicFieldScoreV1Upgrade() {
    setError(null);
    try {
      setHarmonicFieldScoreV1UpgradeReport(await getCurrentHarmonicFieldScoreV1UpgradeReport());
      setSelectedDiagnostic("harmonicFieldScoreV1Upgrade");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }


  async function inspectCouplingProfileEngineV1() {
    setError(null);
    try {
      setCouplingProfileEngineV1Report(await getCurrentCouplingProfileEngineV1Report());
      setSelectedDiagnostic("couplingProfileEngineV1");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }


  async function inspectMotifLibraryAnnotationLayerV1() {
    setError(null);
    try {
      setMotifLibraryAnnotationLayerV1Report(await getCurrentMotifLibraryAnnotationLayerV1Report());
      setSelectedDiagnostic("motifLibraryAnnotationLayerV1");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }





  async function inspectDeterministicAudioEngineV2() {
    setError(null);
    try {
      setDeterministicAudioEngineV2Report(await getCurrentDeterministicAudioEngineV2Report());
      setSelectedDiagnostic("deterministicAudioEngineV2");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function exportDeterministicAudioEngineV2Wav() {
    setError(null);
    try {
      setMappedWavReport(await exportCurrentDeterministicAudioEngineV2Wav());
      setSelectedDiagnostic("mappedWav");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function inspectTrueConductorGestureReferenceManifestV1() {
    setError(null);
    try {
      setTrueConductorGestureReferenceManifestReport(await getCurrentTrueConductorGestureReferenceManifestV1Report());
      setSelectedDiagnostic("trueConductorGestureReferenceManifestV1");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function exportTrueConductorGestureReferenceManifestV1Json() {
    setError(null);
    try {
      setTrueConductorGestureReferenceManifestExportReport(await exportCurrentTrueConductorGestureReferenceManifestV1Json());
      setSelectedDiagnostic("trueConductorGestureReferenceManifestV1");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }



  async function inspectGestureAwareFieldRendererV2() {
    setError(null);
    try {
      setGestureAwareFieldRendererV2Report(await getCurrentGestureAwareFieldRendererV2Report());
      setSelectedDiagnostic("gestureAwareFieldRendererV2");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function exportGestureAwareFieldRendererV2Json() {
    setError(null);
    try {
      setGestureAwareFieldRendererV2ExportReport(await exportCurrentGestureAwareFieldRendererV2Json());
      setSelectedDiagnostic("gestureAwareFieldRendererV2");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }



  async function inspectCymaticFieldModelV2() {
    setError(null);
    try {
      setCymaticFieldModelV2Report(await getCurrentCymaticFieldModelV2Report());
      setSelectedDiagnostic("cymaticFieldModelV2");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function exportCymaticFieldModelV2Json() {
    setError(null);
    try {
      setCymaticFieldModelV2ExportReport(await exportCurrentCymaticFieldModelV2Json());
      setSelectedDiagnostic("cymaticFieldModelV2");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }


  async function inspectSyllableShapedExpressionV1() {
    setError(null);
    try {
      setSyllableShapedExpressionV1Report(await getCurrentSyllableShapedExpressionV1Report());
      setSelectedDiagnostic("syllableShapedExpressionV1");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function exportSyllableShapedExpressionV1Json() {
    setError(null);
    try {
      setSyllableShapedExpressionV1ExportReport(await exportCurrentSyllableShapedExpressionV1Json());
      setSelectedDiagnostic("syllableShapedExpressionV1");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  
  async function inspectHcsSqliteMotifProjectLibraryV1() {
    setError(null);
    try {
      setHcsSqliteLibraryV1Report(await getHcsSqliteMotifProjectLibraryV1Report());
      setSelectedDiagnostic("hcsSqliteMotifProjectLibraryV1");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function saveCurrentProjectToHcsSqliteLibraryV1() {
    setError(null);
    try {
      setHcsSqliteLibraryV1Report(await saveCurrentHcsSqliteProjectLibraryV1());
      setSelectedDiagnostic("hcsSqliteMotifProjectLibraryV1");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function listHcsSqliteProjectsV1() {
    setError(null);
    try {
      setHcsSqliteLibraryV1Report(await listHcsSqliteProjectLibraryV1());
      setSelectedDiagnostic("hcsSqliteMotifProjectLibraryV1");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function saveCurrentMotifsToHcsSqliteLibraryV1() {
    setError(null);
    try {
      setHcsSqliteLibraryV1Report(await saveCurrentHcsSqliteMotifsV1());
      setSelectedDiagnostic("hcsSqliteMotifProjectLibraryV1");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function listHcsSqliteMotifBatchesV1() {
    setError(null);
    try {
      setHcsSqliteLibraryV1Report(await listHcsSqliteMotifsV1());
      setSelectedDiagnostic("hcsSqliteMotifProjectLibraryV1");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function saveCurrentReceiptToHcsSqliteLibraryV1() {
    setError(null);
    try {
      setHcsSqliteLibraryV1Report(await saveCurrentHcsSqliteReceiptV1());
      setSelectedDiagnostic("hcsSqliteMotifProjectLibraryV1");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }


  async function inspectHcsStudioCreationBackendAndPlaceholderPurgeV1() {
    setError(null);
    try {
      setHcsStudioCreationBackendAndPlaceholderPurgeV1Report(await getHcsStudioCreationBackendAndPlaceholderPurgeV1Report());
      setSelectedDiagnostic("hcsStudioCreationBackendAndPlaceholderPurgeV1");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function inspectHcsProductionPackagingV1() {
    setError(null);
    try {
      setHcsProductionPackagingV1Report(await getHcsProductionPackagingV1Report());
      setSelectedDiagnostic("hcsProductionPackagingV1");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function renderCurrentProjectWav() {
    setError(null);
    try {
      setCurrentProjectWavReport(await renderCurrentProjectCombinedWav());
      setSelectedDiagnostic("currentProjectCombinedWav");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function renderCurrentMusicWav() {
    setError(null);
    try {
      setCurrentProjectMusicWavReport(await renderCurrentProjectMusicWav());
      setSelectedDiagnostic("currentProjectMusicWav");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function playAudio() {
    setError(null);
    try {
      setPlaybackReport(await playFirstGestureAudio());
      setSelectedDiagnostic("playbackReport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function playMusicAudio() {
    setError(null);
    try {
      setPlaybackReport(await playSeedMusicAudio());
      setSelectedDiagnostic("playbackReport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function playCombinedAudio() {
    setError(null);
    try {
      setPlaybackReport(await playSeedCombinedAudio());
      setSelectedDiagnostic("playbackReport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function playCurrentMusicAudio() {
    setError(null);
    try {
      setMotionPlaybackEndMs(null);
      setPlaybackReport(await playCurrentProjectMusicAudio());
      setMotionReport(await getCurrentConductorMotionReport());
      setPlayheadCursorReport(await getCurrentPlayheadCursorReport(0));
      setSelectedDiagnostic("playbackReport");
      resetMotionAnimation();
      setIsMotionPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function playCurrentConductorAudio() {
    setError(null);
    try {
      setMotionPlaybackEndMs(null);
      setPlaybackReport(await playCurrentProjectConductorAudio());
      setMotionReport(await getCurrentConductorMotionReport());
      setPlayheadCursorReport(await getCurrentPlayheadCursorReport(0));
      setSelectedDiagnostic("playbackReport");
      resetMotionAnimation();
      setIsMotionPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function playCurrentCombinedAudio() {
    setError(null);
    try {
      setMotionPlaybackEndMs(null);
      setPlaybackReport(await playCurrentProjectCombinedAudio());
      setMotionReport(await getCurrentConductorMotionReport());
      setPlayheadCursorReport(await getCurrentPlayheadCursorReport(0));
      setSelectedDiagnostic("playbackReport");
      resetMotionAnimation();
      setIsMotionPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }



  async function refreshLoopPhrase() {
    setError(null);
    try {
      const nextReport = await getCurrentLoopPhraseReport(loopStartMeasure, loopEndMeasure);
      setLoopPhraseReport(nextReport);
      setSelectedDiagnostic("loopPhraseReport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function playLoopPhraseCombined() {
    setError(null);
    try {
      const nextReport = await getCurrentLoopPhraseReport(loopStartMeasure, loopEndMeasure);
      setLoopPhraseReport(nextReport);
      setPlaybackReport(await playCurrentProjectPhraseCombinedAudio(loopStartMeasure, loopEndMeasure));
      setMotionReport(await getCurrentConductorMotionReport());
      setPlayheadCursorReport(await getCurrentPlayheadCursorReport(nextReport.start_ms));
      setSelectedDiagnostic("loopPhraseReport");
      motionStartRef.current = nextReport.start_ms;
      setMotionTimeMs(nextReport.start_ms);
      setMotionPlaybackEndMs(nextReport.end_ms);
      setIsMotionPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }
  async function stopAudio() {
    setError(null);
    try {
      setStopReport(await stopPlayback());
      setPlaybackClockReport(await getPlaybackClockReport());
      setPlayheadCursorReport(await getCurrentPlayheadCursorReport(Math.round(motionTimeMs)));
      setSelectedDiagnostic("stopReport");
      stopMotionAnimation();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const currentDuration = motionReport?.total_duration_ms ?? musicTimeline?.total_duration_ms ?? 0;
  const currentProjectTitle = projectReport?.title ?? musicReport?.title ?? "No project loaded";
  const currentProjectStatus = projectReport ? `${projectReport.file_name}` : "unsaved session";
  const currentNoteCount = musicTimeline?.total_note_count ?? projectReport?.note_count ?? 0;
  const currentGestureCount = gestureTimeline?.event_count ?? projectReport?.conductor_event_count ?? motionReport?.event_count ?? 0;
  const alignmentStatus = mappingReport?.alignment_status ?? "not generated";
  const packetStatus = packetContractReport?.status ?? "not checked";
  const currentMeasureBeat = playheadCursorReport ? `M${playheadCursorReport.current_measure} beat ${playheadCursorReport.current_beat_in_measure}` : "—";
  const currentLoopLabel = loopPhraseReport ? `${loopPhraseReport.phrase_id}` : `M${loopStartMeasure}-M${loopEndMeasure}`;

  function diagnosticPayload() {
    switch (selectedDiagnostic) {
      case "projectReport":
        return projectReport;
      case "projectList":
        return projectList;
      case "packetContract":
        return packetContractReport;
      case "identityVaultReference":
        return identityVaultReferenceReport;
      case "fieldSynthesis":
        return fieldSynthesisReport;
      case "forgeBridgeStub":
        return forgeBridgeStubReport;
      case "playheadCursor":
        return playheadCursorReport;
      case "loopPhraseReport":
        return loopPhraseReport;
      case "motionReport":
        return motionReport;
      case "mappingReport":
        return mappingReport;
      case "musicTimeline":
        return musicTimeline;
      case "notationLayout":
        return notationLayout;
      case "notationEditReport":
        return notationEditReport;
      case "gestureTimeline":
        return gestureTimeline;
      case "playbackReport":
        return playbackReport;
      case "playbackClockReport":
        return playbackClockReport;
      case "stopReport":
        return stopReport;
      case "musicReport":
        return musicReport;
      case "rustPreview":
        return report;
      case "audioDevice":
        return deviceReport;
      case "gestureWav":
        return wavReport;
      case "musicWav":
        return musicWavReport;
      case "combinedWav":
        return combinedWavReport;
      case "currentProjectMusicWav":
        return currentProjectMusicWavReport;
      case "currentProjectCombinedWav":
        return currentProjectWavReport;
      case "hfieldProjectJsonExport":
        return hfieldProjectJsonExportReport;
      case "hfieldReaderBundleExport":
        return hfieldReaderBundleExportReport;
      case "hfieldRenderManifestExport":
        return hfieldRenderManifestExportReport;
      case "hfieldCymaticSurfaceExport":
        return hfieldCymaticSurfaceExportReport;
      case "hfieldRuntimeCarrierExport":
        return hfieldRuntimeCarrierExportReport;
      case "hfieldPacketContractExport":
        return hfieldPacketContractExportReport;
      case "hfieldCombinedWavExport":
        return hfieldCombinedWavExportReport;
      case "hfieldCanonicalBundleManifestExport":
        return hfieldCanonicalBundleManifestExportReport;
      case "hfieldExportReplayVerifier":
        return hfieldExportReplayVerifierReport;
      case "hfieldSchemaMigrationRegistry":
        return hfieldSchemaMigrationRegistryReport;
      case "nineGestureConductorEngine":
        return nineGestureConductorEngineReport;
      case "harmonicFieldScoreV1Upgrade":
        return harmonicFieldScoreV1UpgradeReport;
      case "couplingProfileEngineV1":
        return couplingProfileEngineV1Report;
      case "motifLibraryAnnotationLayerV1":
        return motifLibraryAnnotationLayerV1Report;
      case "deterministicAudioEngineV2":
        return deterministicAudioEngineV2Report;
      case "trueConductorGestureReferenceManifestV1":
        return trueConductorGestureReferenceManifestExportReport ?? trueConductorGestureReferenceManifestReport;
      case "gestureAwareFieldRendererV2":
        return gestureAwareFieldRendererV2ExportReport ?? gestureAwareFieldRendererV2Report;
      case "cymaticFieldModelV2":
        return cymaticFieldModelV2ExportReport ?? cymaticFieldModelV2Report;
      case "syllableShapedExpressionV1":
        return syllableShapedExpressionV1ExportReport ?? syllableShapedExpressionV1Report;
      case "hcsSqliteMotifProjectLibraryV1":
        return hcsSqliteLibraryV1Report;
      case "hcsProductionPackagingV1":
        return hcsProductionPackagingV1Report;
      case "hcsStudioCreationBackendAndPlaceholderPurgeV1":
        return hcsStudioCreationBackendAndPlaceholderPurgeV1Report;
      case "mappedWav":
        return mappedWavReport;
      case "currentScore":
        return seedMusicScore;
      case "defaultScore":
        return score;
      case "vocabulary":
        return vocabulary;
      default:
        return null;
    }
  }

  const activeDiagnosticLabel =
    diagnosticOptions.find((option) => option.key === selectedDiagnostic)?.label ?? "Diagnostic";


  const activeModeLabel =
    activeTab === "compose" ? "Score" :
    activeTab === "conduct" ? "Conductor" :
    activeTab === "rehearse" ? "Practice" :
    activeTab === "perform" ? "Perform" :
    activeTab === "field" ? "Studio" :
    activeTab === "project" ? "Library" : "Advanced";

  const leadTrack = musicTimeline?.tracks.find((track) => track.track_id === "lead_voice") ?? null;
  const depthTrack = musicTimeline?.tracks.find((track) => track.track_id === "depth_voice") ?? null;
  const fieldTrack = musicTimeline?.tracks.find((track) => track.track_id === "field_voice") ?? null;
  const activeEvent = getActiveEvent(motionReport, motionTimeMs);
  const firstNotationNote = notationLayout?.voices.flatMap((voice) => voice.notes)[0] ?? null;
  const selectedNote = selectedNotationNote ?? notationLayout?.selected_note ?? firstNotationNote;
  const selectedNoteKey = selectedNotationNote ? `${selectedNotationNote.track_id}:${selectedNotationNote.event_index}` : null;
  const beginnerBlocks = resonanceBundle?.beginner_view.slice(0, 8) ?? [];
  const conductorCues = resonanceBundle?.conductor_view.slice(0, 8) ?? [];

  return (
    <main className={`app-shell workstation-shell shell-v2 mode-${activeTab}`}>
      <header className="top-status-bar">
        <div className="brand-block">
          <p className="eyebrow">AI.Web Native Desktop Application</p>
          <h1>Harmonic Conductor Studio</h1>
          <p>Studio-first harmonic music workspace for score, conductor cues, deterministic audio, Glass Reader cymatics, and sealed .hfield custody.</p>
        </div>

        <div className="global-status-strip" aria-label="Project status">
          <StatusChip label="Mode" value={activeModeLabel} />
          <StatusChip label="Project" value={currentProjectStatus} />
          <StatusChip label="Duration" value={formatMs(currentDuration)} />
          <StatusChip label="Playhead" value={currentMeasureBeat} />
          <StatusChip label="Loop" value={currentLoopLabel} />
          <StatusChip label="Notes" value={currentNoteCount} />
          <StatusChip label="Gestures" value={currentGestureCount} />
          <StatusChip label="Alignment" value={alignmentStatus} />
          <StatusChip label="Packet" value={packetStatus} />
        </div>

        <div className="global-transport">
          <button onClick={loadSeedMusic} type="button">Load Demo</button>
          <button onClick={applyGeneratedMapping} type="button">Map Cues</button>
          <button onClick={playCurrentCombinedAudio} type="button">Play Studio</button>
          <button onClick={playLoopPhraseCombined} type="button">Loop Phrase</button>
          <button className="danger" onClick={stopAudio} type="button">Stop</button>
        </div>
      </header>

      <section className="workstation-frame">
        <nav className="mode-rail" aria-label="Workspace modes">
          <button className={activeTab === "compose" ? "mode-button active" : "mode-button"} onClick={() => setActiveTab("compose")} type="button">Score</button>
          <button className={activeTab === "conduct" ? "mode-button active" : "mode-button"} onClick={() => setActiveTab("conduct")} type="button">Conductor</button>
          <button className={activeTab === "rehearse" ? "mode-button active" : "mode-button"} onClick={() => setActiveTab("rehearse")} type="button">Practice</button>
          <button className={activeTab === "perform" ? "mode-button active" : "mode-button"} onClick={() => setActiveTab("perform")} type="button">Perform</button>
          <button className={activeTab === "field" ? "mode-button active" : "mode-button"} onClick={() => setActiveTab("field")} type="button">Studio</button>
          <button className={activeTab === "project" ? "mode-button active" : "mode-button"} onClick={() => setActiveTab("project")} type="button">Library</button>
          <button className={activeTab === "diagnostics" ? "mode-button active" : "mode-button"} onClick={() => setActiveTab("diagnostics")} type="button">Advanced</button>
        </nav>

        <section className="main-workspace" aria-label={`${activeModeLabel} workspace`}>
          {error && <pre className="error workspace-error">{error}</pre>}


          <section className="control-section phrase-loop-section">
            <h3>Loop / Phrase</h3>
            <div className="phrase-loop-grid">
              <label>
                <span>Start M</span>
                <input
                  value={loopStartMeasure}
                  onChange={(event) => setLoopStartMeasure(Number(event.target.value))}
                  inputMode="numeric"
                />
              </label>
              <label>
                <span>End M</span>
                <input
                  value={loopEndMeasure}
                  onChange={(event) => setLoopEndMeasure(Number(event.target.value))}
                  inputMode="numeric"
                />
              </label>
            </div>
            <div className="button-row">
              <button onClick={refreshLoopPhrase} type="button">Set Phrase</button>
              <button onClick={playLoopPhraseCombined} type="button">Play Phrase</button>
            </div>
            <div className="property-list compact-property-list">
              <span><strong>Phrase</strong>{loopPhraseReport?.phrase_id ?? currentLoopLabel}</span>
              <span><strong>Window</strong>{loopPhraseReport ? `${loopPhraseReport.start_ms}–${loopPhraseReport.end_ms} ms` : "—"}</span>
              <span><strong>Notes</strong>{loopPhraseReport?.included_note_count ?? "—"}</span>
              <span><strong>Cues</strong>{loopPhraseReport?.included_conductor_cue_count ?? "—"}</span>
            </div>
          </section>

          {activeTab === "compose" && (
            <div className="workspace-panel compose-workspace">
              <div className="workspace-header-row">
                <div>
                  <p className="eyebrow">Score Workspace</p>
                  <h2>Music Timeline and Track Lanes</h2>
                  <p className="note">Production-ready score editing starts here: choose notes, move timing, adjust lanes, then hear the same score through the Studio field.</p>
                </div>
                <div className="button-row compact-row">
                  <button onClick={loadSeedMusic} type="button">Load Demo Score</button>
                  <button onClick={refreshMusicTimeline} type="button">Refresh Score</button>
                  <button onClick={playCurrentMusicAudio} type="button">Play Music</button>
                </div>
              </div>

              <NotationSpine
                musicTimeline={musicTimeline}
                gestureTimeline={gestureTimeline}
                motionReport={motionReport}
                motionTimeMs={motionTimeMs}
                playheadReport={playheadCursorReport}
                loopPhraseReport={loopPhraseReport}
                notationLayout={notationLayout}
                selectedNoteKey={selectedNoteKey}
                onSelectNote={selectNotationNote}
                modeLabel="Compose"
                variant="compose"
              />

              

              <StudioTrackEditorAndPianoRollV1
                musicTimeline={musicTimeline}
                selectedNoteKey={selectedNoteKey}
                onSelectNote={selectNotationNote}
                onSetPianoRollNote={setPianoRollNoteV1}
                onImportScoreJson={importStudioScoreJsonV1}
                onLoadPreset={loadStudioScorePresetV1}
                onClearScore={clearStudioScoreV1}
                onPlayStudio={playCurrentCombinedAudio}
                onStop={stopAudio}
                onExportAudio={renderCurrentProjectWav}
                onRefresh={refreshTrackEditorAndPianoRollV1}
                report={trackEditorAndPianoRollV1Report}
              />
<section className="composer-tool-dock" aria-label="Composer workstation tool dock">
                <div className="tool-card primary-tool-card">
                  <p className="eyebrow">Backed Score Tools</p>
                  <h3>Live Score Editor</h3>
                  <p className="note">Only backed controls remain in the normal studio path: score timeline, piano-roll lanes, selected-note editor, track-lane controls, deterministic playback, local save, audio export, and Bundle Manifest v2 sealing.</p>
                </div>
                <div className="tool-card"><strong>Notation</strong><span>staff, clef, rests, ties, slurs, dynamics</span></div>
                <div className="tool-card"><strong>Piano Roll</strong><span>pitch grid, duration, velocity, lanes</span></div>
                <div className="tool-card"><strong>Tracks</strong><span>lead, depth, field, conductor cue strip</span></div>
                <div className="tool-card"><strong>Palette</strong><span>articulations, markings, symbols, rehearsal marks</span></div>
                <div className="tool-card"><strong>Mixer</strong><span>voice balance, conductor layer, instrument buses</span></div>
                <div className="tool-card"><strong>Import / Export</strong><span>MIDI, MusicXML, WAV, .hfield custody</span></div>
              </section>

              <div className="composition-grid">
                <section className="notation-board">
                  <div className="board-title-row">
                    <h3>Measure Overview</h3>
                    <span>{musicTimeline?.meter ?? "4/4"} · {musicTimeline?.tempo_bpm ?? 84} BPM · {musicTimeline?.tuning_mode ?? "12-TET"}</span>
                  </div>
                  <div className="staff-system" aria-label="Score timeline preview">
                    {[0, 1, 2, 3, 4].map((line) => <span key={line} className="staff-line" />)}
                    {(leadTrack?.notes ?? []).slice(0, 15).map((note, index) => (
                      <span
                        key={`${note.start_ms}-${note.midi_note}-${index}`}
                        className="staff-note"
                        style={{ left: `${5 + index * 6}%`, top: `${60 - ((note.midi_note - 60) * 4)}%` }}
                        title={`${note.note_name} beat ${note.start_beat}`}
                      >
                        {note.note_name}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="piano-roll-board">
                  <div className="board-title-row">
                    <h3>Piano Roll</h3>
                    <span>Lead · Depth · Field</span>
                  </div>

                  {[leadTrack, depthTrack, fieldTrack].map((track) => (
                    <div key={track?.track_id ?? "empty-track"} className="track-lane">
                      <strong>{track?.track_id ?? "empty"}</strong>
                      <div className="lane-notes">
                        {(track?.notes ?? []).slice(0, 18).map((note, index) => (
                          <span
                            key={`${track?.track_id}-${note.start_ms}-${note.midi_note}-${index}`}
                            className={`lane-note ${note.resonance_lane}`}
                            style={{ width: `${Math.max(5, note.duration_beats * 8)}%` }}
                            title={`${note.note_name} · ${note.frequency_hz.toFixed(2)} Hz`}
                          >
                            {note.note_name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </section>
              </div>

              <section className="bottom-timeline-strip">
                <div className="timeline-ruler">
                  {[1, 2, 3, 4].map((measure) => <span key={measure}>M{measure}</span>)}
                </div>
                <div className="cue-strip">
                  {(gestureTimeline?.events ?? []).slice(0, 15).map((gesture) => (
                    <span key={`${gesture.event_index}-${gesture.gesture_id}`} className="cue-chip">
                      {gesture.gesture_id} · {gesture.gesture_name}
                    </span>
                  ))}
                </div>
              </section>
            </div>
          )}

          {activeTab === "conduct" && (
            <div className="workspace-panel conduct-workspace">
              <div className="workspace-header-row">
                <div>
                  <p className="eyebrow">Conduct Workspace</p>
                  <h2>Motion Field and Gesture Path</h2>
                  <p className="note">Music-to-conductor mapping, nine-field gesture motion, and visible path verification.</p>
                </div>
                <div className="button-row compact-row">
                  <button onClick={previewGeneratedMotion} type="button">Preview Generated</button>
                  <button onClick={applyGeneratedMapping} type="button">Apply Mapping</button>
                  <button onClick={playGeneratedCombined} type="button">Play Generated</button>
                </div>
              </div>

              <NotationSpine
                musicTimeline={musicTimeline}
                gestureTimeline={gestureTimeline}
                motionReport={motionReport}
                motionTimeMs={motionTimeMs}
                playheadReport={playheadCursorReport}
                loopPhraseReport={loopPhraseReport}
                notationLayout={notationLayout}
                selectedNoteKey={selectedNoteKey}
                onSelectNote={selectNotationNote}
                modeLabel="Conduct"
                variant="compact"
              />

              <NotationSpine
                musicTimeline={musicTimeline}
                gestureTimeline={gestureTimeline}
                motionReport={motionReport}
                motionTimeMs={motionTimeMs}
                playheadReport={playheadCursorReport}
                loopPhraseReport={loopPhraseReport}
                notationLayout={notationLayout}
                selectedNoteKey={selectedNoteKey}
                onSelectNote={selectNotationNote}
                modeLabel="Perform"
                variant="performance"
              />

              <VisibleConductorMotion
                report={motionReport}
                timeMs={motionTimeMs}
                isPlaying={isMotionPlaying}
                onPlay={startMotionAnimation}
                onStop={stopMotionAnimation}
                onReset={resetMotionAnimation}
              />

              <div className="mapping-summary-grid">
                <StatusChip label="Mapping" value={alignmentStatus} />
                <StatusChip label="Generated" value={mappingReport?.generated_event_count ?? 0} />
                <StatusChip label="Delta" value={`${mappingReport?.alignment_delta_ms ?? 0} ms`} />
                <StatusChip label="Motion Events" value={motionReport?.event_count ?? 0} />
              </div>
            </div>
          )}

          {activeTab === "rehearse" && (
            <div className="workspace-panel rehearse-workspace">
              <div className="workspace-header-row">
                <div>
                  <p className="eyebrow">Rehearsal Workspace</p>
                  <h2>Same Song, Multiple Entry Levels</h2>
                  <p className="note">Beginner blocks, note names, conductor cues, and accessibility guidance stay attached to the same .hfield source.</p>
                </div>
                <div className="button-row compact-row">
                  <button onClick={loadSeedMusic} type="button">Load Lesson</button>
                  <button onClick={playCurrentMusicAudio} type="button">Play Current Music</button>
                  <button onClick={playCurrentCombinedAudio} type="button">Play With Conductor</button>
                </div>
              </div>

              <NotationSpine
                musicTimeline={musicTimeline}
                gestureTimeline={gestureTimeline}
                motionReport={motionReport}
                motionTimeMs={motionTimeMs}
                playheadReport={playheadCursorReport}
                loopPhraseReport={loopPhraseReport}
                notationLayout={notationLayout}
                selectedNoteKey={selectedNoteKey}
                onSelectNote={selectNotationNote}
                modeLabel="Rehearse"
                variant="compact"
              />

              <div className="rehearsal-grid">
                <section className="rehearsal-card">
                  <h3>Beginner View</h3>
                  {beginnerBlocks.length === 0 && <p className="note">Load a project to see beginner guidance.</p>}
                  {beginnerBlocks.map((block) => (
                    <div key={block.block_index} className="lesson-row">
                      <strong>{block.note_label}</strong>
                      <span>{block.beginner_instruction}</span>
                    </div>
                  ))}
                </section>

                <section className="rehearsal-card">
                  <h3>Conductor Cues</h3>
                  {conductorCues.length === 0 && <p className="note">Load or map a conductor path to see cues.</p>}
                  {conductorCues.map((cue) => (
                    <div key={cue.cue_index} className="lesson-row">
                      <strong>{cue.gesture_id}</strong>
                      <span>{cue.cue_text}</span>
                    </div>
                  ))}
                </section>

                <section className="rehearsal-card wide-card">
                  <h3>Accessibility Guidance</h3>
                  {(resonanceBundle?.accessibility_guidance ?? ["Load a project to see accessibility guidance."]).map((item) => (
                    <p key={item} className="note">{item}</p>
                  ))}
                </section>
              </div>
            </div>
          )}

          {activeTab === "perform" && (
            <div className="workspace-panel perform-workspace">
              <div className="performance-stage-header">
                <div>
                  <p className="eyebrow">Live Performance</p>
                  <h2>{currentProjectTitle}</h2>
                  <p className="note">Minimal controls. Maximum visibility.</p>
                </div>
                <div className="button-row compact-row">
                  <button onClick={playCurrentCombinedAudio} type="button">Play</button>
                  <button className="danger" onClick={stopAudio} type="button">Stop</button>
                  <button onClick={resetMotionAnimation} type="button">Reset</button>
                </div>
              </div>

              <VisibleConductorMotion
                report={motionReport}
                timeMs={motionTimeMs}
                isPlaying={isMotionPlaying}
                onPlay={startMotionAnimation}
                onStop={stopMotionAnimation}
                onReset={resetMotionAnimation}
              />

              <div className="perform-readout-grid">
                <section><strong>Current Gesture</strong><span>{activeEvent?.gesture_name ?? "No active gesture"}</span></section>
                <section><strong>Time</strong><span>{Math.round(motionTimeMs)} / {currentDuration} ms</span></section>
                <section><strong>Audio</strong><span>{playbackReport?.status ?? "idle"}</span></section>
              </div>
            </div>
          )}

          {activeTab === "field" && (
            <div className="workspace-panel field-workspace">
              <div className="workspace-header-row">
                <div>
                  <p className="eyebrow">Studio Workbench</p>
                  <h2>Glass Reader Plane and Runtime Carrier Cymatics</h2>
                  <p className="note">Start here. Load or save music, play the deterministic studio mix, watch conductor cues move through the score, and see the same .hfield packet expressed as the 3D Glass Reader field.</p>
                </div>
                <div className="button-row compact-row">
                  <button onClick={refreshFieldSynthesis} type="button">Refresh Studio Field</button>
                  <button onClick={playCurrentCombinedAudio} type="button">Play</button>
                  <button className="danger" onClick={stopAudio} type="button">Stop</button>
                </div>
              </div>

              <section className="studio-start-deck" aria-label="Start here studio workflow">
                <article className="studio-step-card studio-step-primary">
                  <p className="eyebrow">Start Here</p>
                  <h3>1. Create or load music</h3>
                  <p className="note">Use the demo score, open a saved project, or move to Score when you want to edit notes and timing.</p>
                  <div className="button-row studio-action-row">
                    <button onClick={loadSeedMusic} type="button">Load Demo Score</button>
                    <button onClick={() => setActiveTab("compose")} type="button">Edit Score</button>
                    <button onClick={listHcsSqliteProjectsV1} type="button">Recent Projects</button>
                  </div>
                </article>
                <article className="studio-step-card">
                  <p className="eyebrow">Hear It</p>
                  <h3>2. Play the studio mix</h3>
                  <p className="note">Deterministic audio plays from the current score and conductor layer, while the Glass Reader field gives the visual carrier path.</p>
                  <div className="button-row studio-action-row">
                    <button onClick={playCurrentCombinedAudio} type="button">Play Studio Mix</button>
                    <button onClick={playLoopPhraseCombined} type="button">Loop Phrase</button>
                    <button className="danger" onClick={stopAudio} type="button">Stop</button>
                  </div>
                </article>
                <article className="studio-step-card">
                  <p className="eyebrow">Keep It</p>
                  <h3>3. Save and seal</h3>
                  <p className="note">Save actual multi-track music locally, then seal Bundle Manifest v2 when the project needs custody/replay proof.</p>
                  <div className="button-row studio-action-row">
                    <button onClick={saveCurrentProjectToHcsSqliteLibraryV1} type="button">Save Project</button>
                    <button onClick={renderCurrentProjectWav} type="button">Export Audio</button>
                    <button onClick={renderCurrentProjectWav} type="button">Export Audio</button>
                    <button onClick={exportHfieldCanonicalBundleManifestV2} type="button">Seal Bundle v2</button>
                    <button onClick={() => setActiveTab("diagnostics")} type="button">Advanced</button>
                  </div>
                </article>
              </section>

              <section className="studio-signal-chain" aria-label="Studio signal chain">
                <span>Music score</span>
                <strong>→</strong>
                <span>Conductor cues</span>
                <strong>→</strong>
                <span>Deterministic audio</span>
                <strong>→</strong>
                <span>Waveform / field</span>
                <strong>→</strong>
                <span>Glass Reader cymatics</span>
                <strong>→</strong>
                <span>Sealed bundle</span>
              </section>

              <NotationSpine
                musicTimeline={musicTimeline}
                gestureTimeline={gestureTimeline}
                motionReport={motionReport}
                motionTimeMs={motionTimeMs}
                playheadReport={playheadCursorReport}
                notationLayout={notationLayout}
                selectedNoteKey={selectedNoteKey}
                onSelectNote={selectNotationNote}
                modeLabel="Studio"
                variant="compact"
              />

              <HfieldPhaseFieldViewport
                report={fieldSynthesisReport}
                playheadReport={playheadCursorReport}
                isPlaying={isMotionPlaying}
                onRefresh={refreshFieldSynthesis}
                onPlay={playCurrentCombinedAudio}
                onStop={stopAudio}
              />
            </div>
          )}

          {activeTab === "project" && (
            <div className="workspace-panel project-workspace">
              <div className="workspace-header-row">
                <div>
                  <p className="eyebrow">Studio Library</p>
                  <h2>Projects, Local Library, and Sealed Bundles</h2>
                  <p className="note">Normal workflow stays simple: save the current project, reopen recent work, and seal Bundle Manifest v2 when the piece is ready.</p>
                </div>
              </div>

              <NotationSpine
                musicTimeline={musicTimeline}
                gestureTimeline={gestureTimeline}
                motionReport={motionReport}
                motionTimeMs={motionTimeMs}
                playheadReport={playheadCursorReport}
                loopPhraseReport={loopPhraseReport}
                notationLayout={notationLayout}
                selectedNoteKey={selectedNoteKey}
                onSelectNote={selectNotationNote}
                modeLabel="Project"
                variant="compact"
              />

              <section className="library-quick-actions" aria-label="Studio library quick actions">
                <article>
                  <p className="eyebrow">Local Library</p>
                  <h3>Save actual music</h3>
                  <p className="note">Stores the full FieldScore JSON, including music.tracks[*].notes, in the local SQLite library.</p>
                  <div className="button-row">
                    <button onClick={saveCurrentProjectToHcsSqliteLibraryV1} type="button">Save Project</button>
                    <button onClick={listHcsSqliteProjectsV1} type="button">Recent Projects</button>
                  </div>
                </article>
                <article>
                  <p className="eyebrow">Seal</p>
                  <h3>Bundle Manifest v2</h3>
                  <p className="note">Creates the current replay/custody bundle after the score, audio, renderer, cymatic, and syllable reports are locked.</p>
                  <div className="button-row">
                    <button onClick={exportHfieldCanonicalBundleManifestV2} type="button">Seal Bundle v2</button>
                    <button onClick={verifyHfieldExportReplayManifest} type="button">Verify Latest</button>
                  </div>
                </article>
              </section>

              <div className="project-custody-card legacy-file-card">
                <label htmlFor="project-file-name">Advanced file name</label>
                <div className="project-row console-project-row">
                  <input
                    id="project-file-name"
                    value={projectFileName}
                    onChange={(event) => setProjectFileName(event.target.value)}
                    aria-label="Project file name"
                    placeholder="project_name.hfield"
                  />
                  <button onClick={saveProject} type="button">Save File</button>
                  <button onClick={() => openProject()} type="button">Open File</button>
                  <button onClick={refreshProjectList} type="button">Recent Files</button>
                </div>
              </div>

              <section className="report-card hfield-identity-vault-panel">
                <h3>Identity Vault Reference Binding</h3>
                <p className="note">Binds reference-only custody metadata into the .hfield packet. No private identity is exported, no live Identity Vault write is performed, and Forge is not mutated.</p>
                <div className="project-row export-button-row">
                  <button onClick={bindIdentityVaultReferenceOnly} type="button">Bind Reference Only</button>
                  <button onClick={refreshIdentityVaultReference} type="button">Refresh Reference Report</button>
                </div>
                <div className="property-list compact-property-list">
                  <span><strong>Status</strong>{identityVaultReferenceReport?.status ?? "not checked"}</span>
                  <span><strong>Vault ref</strong>{identityVaultReferenceReport?.vault_record_ref ?? "unbound"}</span>
                  <span><strong>Creator</strong>{identityVaultReferenceReport?.creator_principal_id ?? "unbound"}</span>
                  <span><strong>Private export</strong>{identityVaultReferenceReport?.private_identity_export_disabled === false ? "blocked" : "disabled"}</span>
                  <span><strong>Live write</strong>{identityVaultReferenceReport?.live_identity_vault_write_performed ? "performed" : "not performed"}</span>
                  <span><strong>Forge mutation</strong>{identityVaultReferenceReport?.forge_mutation_performed ? "performed" : "not performed"}</span>
                </div>
                <pre>{JSON.stringify(identityVaultReferenceReport ?? "No Identity Vault reference report yet.", null, 2)}</pre>
              </section>

              <details className="advanced-export-drawer report-card hfield-export-panel">
                <summary>Advanced Export and Verification Tools</summary>
                <section className="advanced-export-content">
                  <h3>Advanced Export and Verification Tools</h3>
                  <p className="note">Developer and custody tools. These remain available, but they are no longer the main studio workflow. These exports do not mutate Forge.</p>
                <div className="project-row export-button-row">
                  <button onClick={exportHfieldProjectJson} type="button">Export Project JSON</button>
                  <button onClick={exportHfieldReaderBundle} type="button">Export Reader Bundle</button>
                  <button onClick={exportHfieldRenderManifest} type="button">Export Render Manifest</button>
                  <button onClick={exportHfieldCymaticSurface} type="button">Export Cymatic Surface</button>
                  <button onClick={exportHfieldRuntimeCarrier} type="button">Export Carrier Packet</button>
                  <button onClick={exportHfieldPacketContract} type="button">Export Packet Contract</button>
                  <button onClick={exportHfieldCombinedWav} type="button">Export Combined WAV</button>
                  <button onClick={exportHfieldCanonicalBundleManifest} type="button">Legacy Bundle Manifest v1</button>
                  <button onClick={exportHfieldCanonicalBundleManifestV2} type="button">Seal Bundle v2</button>
                  <button onClick={inspectHcsSqliteMotifProjectLibraryV1} type="button">Inspect SQLite Library</button>
                  <button onClick={saveCurrentProjectToHcsSqliteLibraryV1} type="button">Save Project to SQLite</button>
                  <button onClick={listHcsSqliteProjectsV1} type="button">List SQLite Projects</button>
                  <button onClick={saveCurrentMotifsToHcsSqliteLibraryV1} type="button">Save Motifs to SQLite</button>
                  <button onClick={listHcsSqliteMotifBatchesV1} type="button">List SQLite Motifs</button>
                  <button onClick={saveCurrentReceiptToHcsSqliteLibraryV1} type="button">Save SQLite Receipt</button>
                  <button onClick={inspectHcsStudioCreationBackendAndPlaceholderPurgeV1} type="button">Inspect Studio Creation Backend</button>
                  <button onClick={inspectHcsProductionPackagingV1} type="button">Inspect Production Packaging</button>
                  <button onClick={verifyHfieldExportReplayManifest} type="button">Verify Latest Bundle</button>
                  <button onClick={inspectHfieldSchemaMigrationRegistry} type="button">Inspect Schema Registry</button>
                  <button onClick={inspectNineGestureConductorEngine} type="button">Inspect Nine-Gesture Engine</button>
                  <button onClick={inspectHarmonicFieldScoreV1Upgrade} type="button">Inspect Field Score v1</button>
                  <button onClick={inspectCouplingProfileEngineV1} type="button">Inspect Coupling Profile</button>
                  <button onClick={inspectMotifLibraryAnnotationLayerV1} type="button">Inspect Motif Layer</button>
                  <button onClick={inspectDeterministicAudioEngineV2} type="button">Inspect Audio Engine v2</button>
                  <button onClick={exportDeterministicAudioEngineV2Wav} type="button">Export Audio v2 WAV</button>
                  <button onClick={inspectTrueConductorGestureReferenceManifestV1} type="button">Inspect True Gesture Manifest</button>
                  <button onClick={exportTrueConductorGestureReferenceManifestV1Json} type="button">Export True Gesture JSON</button>
                  <button onClick={inspectGestureAwareFieldRendererV2} type="button">Inspect Gesture-Aware Renderer</button>
                  <button onClick={exportGestureAwareFieldRendererV2Json} type="button">Export Gesture Renderer JSON</button>
                  <button onClick={inspectCymaticFieldModelV2} type="button">Inspect Cymatic Model v2</button>
                  <button onClick={exportCymaticFieldModelV2Json} type="button">Export Cymatic Model JSON</button>
                  <button onClick={inspectSyllableShapedExpressionV1} type="button">Inspect Syllable Expression</button>
                  <button onClick={exportSyllableShapedExpressionV1Json} type="button">Export Syllable Expression JSON</button>
                </div>
                  <pre>{JSON.stringify(hcsStudioCreationBackendAndPlaceholderPurgeV1Report ?? hcsProductionPackagingV1Report ?? hcsSqliteLibraryV1Report ?? syllableShapedExpressionV1ExportReport ?? syllableShapedExpressionV1Report ?? cymaticFieldModelV2ExportReport ?? cymaticFieldModelV2Report ?? gestureAwareFieldRendererV2ExportReport ?? gestureAwareFieldRendererV2Report ?? trueConductorGestureReferenceManifestExportReport ?? trueConductorGestureReferenceManifestReport ?? deterministicAudioEngineV2Report ?? motifLibraryAnnotationLayerV1Report ?? couplingProfileEngineV1Report ?? harmonicFieldScoreV1UpgradeReport ?? nineGestureConductorEngineReport ?? hfieldSchemaMigrationRegistryReport ?? hfieldExportReplayVerifierReport ?? hfieldCanonicalBundleManifestExportReport ?? hfieldReaderBundleExportReport ?? hfieldProjectJsonExportReport ?? hfieldCombinedWavExportReport ?? "No reader packet export yet.", null, 2)}</pre>
                </section>
              </details>

              <div className="project-grid">
                <section className="report-card">
                  <h3>Saved Projects</h3>
                  <div className="project-list compact-project-list">
                    {projectList?.projects.length === 0 && <span className="note">No saved .hfield projects found.</span>}
                    {(projectList?.projects ?? []).map((project) => (
                      <button key={project.file_name} onClick={() => openProject(project.file_name)} title={project.path} type="button">
                        {project.file_name}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="report-card">
                  <h3>Last Project Report</h3>
                  <pre>{JSON.stringify(projectReport ?? "No project save/open report yet.", null, 2)}</pre>
                </section>
              </div>
            </div>
          )}

          {activeTab === "diagnostics" && (
            <div className="workspace-panel diagnostics-workspace">
              <div className="workspace-header-row">
                <div>
                  <p className="eyebrow">Advanced</p>
                  <h2>Developer Reports and Verification</h2>
                  <p className="note">Engineering reports, custody receipts, legacy exports, and verification tools live here so the main Studio view stays usable.</p>
                </div>
                <div className="diagnostics-selector-row">
                  <label htmlFor="diagnostic-select">Report</label>
                  <select id="diagnostic-select" value={selectedDiagnostic} onChange={(event) => setSelectedDiagnostic(event.target.value as DiagnosticKey)}>
                    {diagnosticOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
                  </select>
                </div>
              </div>

              <NotationSpine
                musicTimeline={musicTimeline}
                gestureTimeline={gestureTimeline}
                motionReport={motionReport}
                motionTimeMs={motionTimeMs}
                playheadReport={playheadCursorReport}
                loopPhraseReport={loopPhraseReport}
                notationLayout={notationLayout}
                selectedNoteKey={selectedNoteKey}
                onSelectNote={selectNotationNote}
                modeLabel="Diagnostics"
                variant="compact"
              />

              <section className="report-card diagnostics-report-card">
                <h3>{activeDiagnosticLabel}</h3>
                <pre>{JSON.stringify(diagnosticPayload() ?? "No data loaded for this report yet.", null, 2)}</pre>
              </section>
            </div>
          )}
        </section>

        <aside className="right-inspector" aria-label="Context inspector">
          <div className="inspector-header">
            <p className="eyebrow">Inspector</p>
            <h2>{activeModeLabel}</h2>
          </div>

          {activeTab === "compose" && (
            <div className="inspector-stack">
              <section className="control-section">
                <h3>Selected Note</h3>
                <div className="property-list">
                  <span><strong>Pitch</strong>{selectedNote?.note_name ?? "none"}</span>
                  <span><strong>Track</strong>{selectedNote?.track_id ?? "—"}</span>
                  <span><strong>Event</strong>{selectedNotationNote?.event_index ?? "—"}</span>
                  <span><strong>MIDI</strong>{selectedNote?.midi_note ?? "—"}</span>
                  <span><strong>Frequency</strong>{selectedNote ? `${selectedNote.frequency_hz.toFixed(2)} Hz` : "—"}</span>
                  <span><strong>Start</strong>{selectedNote ? `${selectedNote.start_ms} ms` : "—"}</span>
                  <span><strong>Measure</strong>{selectedNote ? `M${selectedNote.measure_index}` : "—"}</span>
                  <span><strong>Beat</strong>{selectedNote ? selectedNote.beat_in_measure : "—"}</span>
                  <span><strong>Lane</strong>{selectedNote?.resonance_lane ?? "—"}</span>
                </div>
              </section>


              <section className="control-section note-edit-section">
                <h3>Create / Edit Note</h3>
                <div className="note-edit-grid">
                  <label>
                    <span>MIDI Pitch</span>
                    <input value={noteEditMidi} onChange={(event) => setNoteEditMidi(event.target.value)} inputMode="numeric" />
                  </label>
                  <label>
                    <span>Duration ms</span>
                    <input value={noteEditDurationMs} onChange={(event) => setNoteEditDurationMs(event.target.value)} inputMode="numeric" />
                  </label>
                  <label>
                    <span>Velocity</span>
                    <input value={noteEditVelocity} onChange={(event) => setNoteEditVelocity(event.target.value)} inputMode="decimal" />
                  </label>
                  <label>
                    <span>Track</span>
                    <select value={noteEditTrackId} onChange={(event) => setNoteEditTrackId(event.target.value)}>
                      <option value="lead_voice">Lead</option>
                      <option value="depth_voice">Depth</option>
                      <option value="field_voice">Field</option>
                    </select>
                  </label>
                </div>
                <div className="note-timing-grid">
                  <label>
                    <span>Start ms</span>
                    <input value={noteEditStartMs} onChange={(event) => setNoteEditStartMs(event.target.value)} inputMode="numeric" />
                  </label>
                  <label>
                    <span>Measure</span>
                    <input value={noteEditMeasureIndex} onChange={(event) => setNoteEditMeasureIndex(event.target.value)} inputMode="numeric" />
                  </label>
                  <label>
                    <span>Beat</span>
                    <input value={noteEditBeatInMeasure} onChange={(event) => setNoteEditBeatInMeasure(event.target.value)} inputMode="decimal" />
                  </label>
                </div>
                <div className="button-row timing-button-row">
                  <button onClick={positionSelectedNotationNoteStartMs} disabled={!selectedNotationNote} type="button">Apply Start</button>
                  <button onClick={positionSelectedNotationNoteMeasureBeat} disabled={!selectedNotationNote} type="button">Apply Measure / Beat</button>
                </div>
                <div className="button-row timing-button-row">
                  <button onClick={() => nudgeSelectedNotationNote(-4)} disabled={!selectedNotationNote} type="button">- Measure</button>
                  <button onClick={() => nudgeSelectedNotationNote(-1)} disabled={!selectedNotationNote} type="button">- Beat</button>
                  <button onClick={() => nudgeSelectedNotationNote(1)} disabled={!selectedNotationNote} type="button">+ Beat</button>
                  <button onClick={() => nudgeSelectedNotationNote(4)} disabled={!selectedNotationNote} type="button">+ Measure</button>
                </div>
                <div className="button-row">
                  <button onClick={appendNoteFromEditor} type="button">Add as New Note</button>
                  <button onClick={editSelectedNotationNote} disabled={!selectedNotationNote} type="button">Update Selected Note</button>
                  <button className="danger" onClick={deleteSelectedNotationNote} disabled={!selectedNotationNote} type="button">Delete Note</button>
                </div>
              </section>

              <section className="control-section composer-bench-section">
                <h3>Legacy Composer Placeholders</h3>
                <div className="composer-bench-grid" aria-label="Legacy composer placeholders hidden from normal workflow">
                  <span>Score</span>
                  <span>Palette</span>
                  <span>Mixer</span>
                  <span>Tracks</span>
                  <span>Shortcuts</span>
                  <span>Export</span>
                </div>
              </section>

              <section className="control-section legacy-quick-add-section" aria-hidden="true">
                <h3>Legacy Quick Add Notes</h3>
                <div className="button-grid small-button-grid legacy-quick-add-grid">
                  {musicAppendPlan.map((note) => (
                    <button key={`${note.trackId}-${note.midiNote}-${note.label}`} onClick={() => appendMusicNote(note.trackId, note.midiNote, note.durationMs, note.velocity)} type="button">
                      {note.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="control-section">
                <h3>Track Lane Controls</h3>
                <div className="button-row">
                  <button onClick={resetMusicNotes} type="button">Reset Score to Demo</button>
                  <button onClick={() => clearMusicTrack("lead_voice")} type="button">Clear Lead Lane</button>
                  <button onClick={() => clearMusicTrack("depth_voice")} type="button">Clear Depth Lane</button>
                  <button onClick={() => clearMusicTrack("field_voice")} type="button">Clear Field Lane</button>
                </div>
              </section>
            </div>
          )}

          {activeTab === "conduct" && (
            <div className="inspector-stack">
              <section className="control-section">
                <h3>Mapping</h3>
                <div className="button-row">
                  <button onClick={generateMappingReport} type="button">Generate Report</button>
                  <button onClick={applyGeneratedMapping} type="button">Apply Mapping</button>
                  <button onClick={refreshCurrentMotion} type="button">Refresh Motion</button>
                </div>
              </section>
              <section className="control-section conductor-cue-lane-section">
                <h3>Conductor Cue Lane</h3>
                <p className="note">Use the visible score cue lane and Map Cues workflow. Raw g1–g9 buttons are hidden from the musician path.</p>
                <div className="button-grid small-button-grid gesture-demo-button-grid" aria-hidden="true">
                  {gestureAppendPlan.map((gesture) => (
                    <button key={gesture.id} onClick={() => appendGesture(gesture.id, gesture.durationMs, gesture.intensity, gesture.operator)} type="button">{gesture.id}</button>
                  ))}
                </div>
                <div className="button-row">
                  <button onClick={resetTimeline} type="button">Reset Standard Cue Path</button>
                  <button onClick={clearTimeline} type="button">Clear Cue Lane</button>
                </div>
              </section>
            </div>
          )}

          {activeTab === "rehearse" && (
            <div className="inspector-stack">
              <section className="control-section">
                <h3>Practice Controls</h3>
                <div className="button-row">
                  <button onClick={playCurrentMusicAudio} type="button">Music Only</button>
                  <button onClick={playCurrentCombinedAudio} type="button">With Conductor</button>
                  <button onClick={stopAudio} type="button">Stop</button>
                </div>
              </section>
              <section className="control-section">
                <h3>Current Cue</h3>
                <p>{activeEvent?.motion_label ?? "Load a project to see current cue."}</p>
              </section>
            </div>
          )}

          {activeTab === "perform" && (
            <div className="inspector-stack">
              <section className="control-section primary-control-section">
                <h3>Live Transport</h3>
                <div className="button-grid primary-buttons">
                  <button onClick={playCurrentCombinedAudio} type="button">Play Current</button>
                  <button onClick={playGeneratedCombined} type="button">Play Generated</button>
                  <button className="danger" onClick={stopAudio} type="button">Stop</button>
                  <button onClick={resetMotionAnimation} type="button">Reset Motion</button>
                </div>
              </section>
              <section className="control-section">
                <h3>Live State</h3>
                <div className="quick-state-grid">
                  <StatusChip label="Playback" value={playbackReport?.status ?? "idle"} />
                  <StatusChip label="Motion" value={isMotionPlaying ? "running" : "ready"} />
                </div>
              </section>
            </div>
          )}

          {activeTab === "field" && (
            <div className="inspector-stack">
              <section className="control-section primary-control-section">
                <h3>Field Synthesis</h3>
                <div className="button-grid primary-buttons">
                  <button onClick={refreshFieldSynthesis} type="button">Synthesize Field</button>
                  <button onClick={playCurrentCombinedAudio} type="button">Play Packet</button>
                  <button className="danger" onClick={stopAudio} type="button">Stop</button>
                </div>
              </section>
              <section className="control-section">
                <h3>Packet Field</h3>
                <div className="property-list">
                  <span><strong>Status</strong>{fieldSynthesisReport?.status ?? "not synthesized"}</span>
                  <span><strong>Contract</strong>{fieldSynthesisReport?.field_contract_id ?? "—"}</span>
                  <span><strong>Events</strong>{fieldSynthesisReport?.harmonic_events.length ?? "—"}</span>
                  <span><strong>Samples</strong>{fieldSynthesisReport?.cymatic_wave_samples.length ?? "—"}</span>
                  <span><strong>Trace</strong>{fieldSynthesisReport?.field_trace.length ?? "—"}</span>
                  <span><strong>Hash</strong>{fieldSynthesisReport?.deterministic_field_hash.slice(0, 16) ?? "—"}</span>
                </div>
              </section>
            </div>
          )}

          {activeTab === "project" && (
            <div className="inspector-stack">
              <section className="control-section">
                <h3>Validation</h3>
                <div className="property-list">
                  <span><strong>File</strong>{projectReport?.file_name ?? currentProjectStatus}</span>
                  <span><strong>Score Hash</strong>{projectReport?.score_hash?.slice(0, 16) ?? "—"}</span>
                  <span><strong>Warnings</strong>{projectReport?.warnings.length ?? 0}</span>
                </div>
              </section>
            </div>
          )}

          {activeTab === "diagnostics" && (
            <div className="inspector-stack">
              <section className="control-section">
                <h3>System Preview</h3>
                <div className="button-row">
                  <button onClick={runPreview} type="button">Run Preview</button>
                  <button onClick={renderWav} type="button">Gesture WAV</button>
                  <button onClick={renderCombinedWav} type="button">Seed Combined WAV</button>
                  <button onClick={renderGeneratedMappedWav} type="button">Mapped WAV</button>
                </div>
              </section>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}


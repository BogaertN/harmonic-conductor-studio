import { useEffect, useMemo, useRef, useState } from "react";
import {
  appendGestureToCurrentScore,
  appendNoteToCurrentTrack,
  applyGeneratedConductorMappingToCurrentScore,
  clearCurrentGestureTimeline,
  clearCurrentMusicTrack,
  createDefaultScore,
  selectCurrentNotationNote,
  editCurrentNotationNote,
  deleteCurrentNotationNote,
  getAudioDeviceReport,
  getCurrentConductorMappingReport,
  getCurrentConductorMotionReport,
  getCurrentGestureTimeline,
  getCurrentMusicTimeline,
  getCurrentNotationLayout,
  getCurrentProjectScore,
  getCurrentResonanceLevelBundle,
  getGeneratedConductorMotionReport,
  getGestureVocabulary,
  listSavedProjects,
  loadSeedMusicProject,
  openProjectByFileName,
  nudgeCurrentNotationNoteBeats,
  positionCurrentNotationNoteMeasureBeat,
  positionCurrentNotationNoteStartMs,
  playCurrentProjectCombinedAudio,
  playCurrentProjectConductorAudio,
  playCurrentProjectMusicAudio,
  playFirstGestureAudio,
  playGeneratedConductorMappingAudio,
  playGeneratedMappedCombinedAudio,
  playSeedCombinedAudio,
  playSeedMusicAudio,
  previewScoreReport,
  previewSeedMusicReport,
  renderCurrentProjectCombinedWav,
  renderCurrentProjectMusicWav,
  renderFirstGestureWav,
  renderGeneratedMappedCombinedWav,
  renderSeedCombinedWav,
  renderSeedMusicWav,
  resetCurrentGestureTimelineToStandardPath,
  resetCurrentMusicToSeed,
  saveCurrentProjectAs,
  stopPlayback,
  type ConductorMappingReport,
  type ConductorMotionPoint,
  type ConductorMotionReport,
  type GestureTimelineReport,
  type MusicPreviewReport,
  type MusicTimelineReport,
  type NotationEditReport,
  type NotationLayoutReport,
  type PlaybackReport,
  type PreviewReport,
  type ProjectFileReport,
  type ProjectListReport,
  type ResonanceLevelBundle,
  type StopReport,
  type WavRenderReport
} from "./bridge/tauriCommands";

type OperatorTab = "compose" | "conduct" | "rehearse" | "perform" | "project" | "diagnostics";
type DiagnosticKey =
  | "projectReport"
  | "projectList"
  | "motionReport"
  | "mappingReport"
  | "musicTimeline"
  | "notationLayout"
  | "notationEditReport"
  | "gestureTimeline"
  | "playbackReport"
  | "stopReport"
  | "musicReport"
  | "rustPreview"
  | "audioDevice"
  | "gestureWav"
  | "musicWav"
  | "combinedWav"
  | "currentProjectMusicWav"
  | "currentProjectCombinedWav"
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
  { key: "motionReport", label: "Conductor Motion" },
  { key: "mappingReport", label: "Conductor Mapping" },
  { key: "musicTimeline", label: "Music Timeline" },
  { key: "notationLayout", label: "Notation Layout" },
  { key: "notationEditReport", label: "Notation Note Edit" },
  { key: "gestureTimeline", label: "Gesture Timeline" },
  { key: "playbackReport", label: "Playback" },
  { key: "stopReport", label: "Stop Report" },
  { key: "musicReport", label: "Music Preview" },
  { key: "rustPreview", label: "Rust Preview" },
  { key: "audioDevice", label: "Audio Device" },
  { key: "gestureWav", label: "Gesture WAV" },
  { key: "musicWav", label: "Music WAV" },
  { key: "combinedWav", label: "Combined WAV" },
  { key: "currentProjectMusicWav", label: "Current Music WAV" },
  { key: "currentProjectCombinedWav", label: "Current Combined WAV" },
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
  const cursorPercent = Math.min(99, Math.max(0, (motionTimeMs / durationMs) * 100));
  const activeEvent = getActiveEvent(motionReport, motionTimeMs);
  const measureCount = Math.max(4, notationLayout?.measure_count ?? Math.ceil((musicTimeline?.total_duration_seconds ?? 0) / 2.856));
  const ruler = Array.from({ length: Math.min(12, measureCount) }, (_, index) => index + 1);
  const meter = notationLayout?.meter ?? musicTimeline?.meter ?? "4/4";
  const tempo = notationLayout?.tempo_bpm ?? musicTimeline?.tempo_bpm ?? 84;
  const noteCount = notationLayout?.note_count ?? musicTimeline?.total_note_count ?? 0;

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
          <StatusChip label="Cue" value={activeEvent?.gesture_id ?? "—"} />
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
                {voice.notes.slice(0, 32).map((note) => {
                  const noteKey = `${note.track_id}:${note.event_index}`;
                  return (
                    <button
                      key={`${voice.track_id}-${note.event_index}-${note.start_ms}-${note.midi_note}`}
                      className={selectedNoteKey === noteKey ? `notation-note selected ${note.resonance_lane}` : `notation-note ${note.resonance_lane}`}
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
        <div className="notation-playhead" style={{ left: `${cursorPercent}%` }}><span>{Math.round(motionTimeMs)}ms</span></div>
      </div>

      <div className="notation-cue-strip">
        {cueBlocks.slice(0, 24).map((cue) => (
          <span
            key={`${cue.event_index}-${cue.gesture_id}-${cue.start_ms}`}
            className={activeEvent?.gesture_id === cue.gesture_id ? "notation-cue active" : "notation-cue"}
            style={{ left: `${cue.x_percent}%`, width: `${cue.width_percent}%` }}
            title={`${cue.cue_text} · M${cue.measure_index} beat ${cue.beat_in_measure}`}
          >
            {cue.gesture_id} · {cue.gesture_name}
          </span>
        ))}
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
  const [activeTab, setActiveTab] = useState<OperatorTab>("compose");
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
  const [isMotionPlaying, setIsMotionPlaying] = useState(false);
  const motionStartRef = useRef(0);
  const wallClockStartRef = useRef(0);

  const [wavReport, setWavReport] = useState<WavRenderReport | null>(null);
  const [musicWavReport, setMusicWavReport] = useState<WavRenderReport | null>(null);
  const [combinedWavReport, setCombinedWavReport] = useState<WavRenderReport | null>(null);
  const [currentProjectWavReport, setCurrentProjectWavReport] = useState<WavRenderReport | null>(null);
  const [currentProjectMusicWavReport, setCurrentProjectMusicWavReport] = useState<WavRenderReport | null>(null);
  const [mappedWavReport, setMappedWavReport] = useState<WavRenderReport | null>(null);
  const [playbackReport, setPlaybackReport] = useState<PlaybackReport | null>(null);
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
      const nextTime = Math.min(motionStartRef.current + elapsed, motionReport.total_duration_ms);
      setMotionTimeMs(nextTime);

      if (nextTime >= motionReport.total_duration_ms) {
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
  }, [isMotionPlaying, motionReport]);

  function startMotionAnimation() {
    motionStartRef.current = motionTimeMs;
    setIsMotionPlaying(true);
  }

  function stopMotionAnimation() {
    motionStartRef.current = motionTimeMs;
    setIsMotionPlaying(false);
  }

  function resetMotionAnimation() {
    motionStartRef.current = 0;
    setMotionTimeMs(0);
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
    const nextNotationLayout = await getCurrentNotationLayout();
    setNotationLayout(nextNotationLayout);
    setSelectedNoteForEditing(nextNotationLayout.selected_note);
    setGestureTimeline(await getCurrentGestureTimeline());
    setMappingReport(await getCurrentConductorMappingReport());
    setMotionReport(await getCurrentConductorMotionReport());
    resetMotionAnimation();
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
      setPlaybackReport(await playCurrentProjectMusicAudio());
      setSelectedDiagnostic("playbackReport");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function playCurrentConductorAudio() {
    setError(null);
    try {
      setPlaybackReport(await playCurrentProjectConductorAudio());
      setMotionReport(await getCurrentConductorMotionReport());
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
      setPlaybackReport(await playCurrentProjectCombinedAudio());
      setMotionReport(await getCurrentConductorMotionReport());
      setSelectedDiagnostic("playbackReport");
      resetMotionAnimation();
      setIsMotionPlaying(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function stopAudio() {
    setError(null);
    try {
      setStopReport(await stopPlayback());
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

  function diagnosticPayload() {
    switch (selectedDiagnostic) {
      case "projectReport":
        return projectReport;
      case "projectList":
        return projectList;
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
    activeTab === "compose" ? "Compose" :
    activeTab === "conduct" ? "Conduct" :
    activeTab === "rehearse" ? "Rehearse" :
    activeTab === "perform" ? "Perform" :
    activeTab === "project" ? "Project" : "Diagnostics";

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
          <p>Professional workstation for composition, notation, conducting, rehearsal, performance, and .hfield custody.</p>
        </div>

        <div className="global-status-strip" aria-label="Project status">
          <StatusChip label="Mode" value={activeModeLabel} />
          <StatusChip label="Project" value={currentProjectStatus} />
          <StatusChip label="Duration" value={formatMs(currentDuration)} />
          <StatusChip label="Notes" value={currentNoteCount} />
          <StatusChip label="Gestures" value={currentGestureCount} />
          <StatusChip label="Alignment" value={alignmentStatus} />
        </div>

        <div className="global-transport">
          <button onClick={loadSeedMusic} type="button">Load</button>
          <button onClick={applyGeneratedMapping} type="button">Map</button>
          <button onClick={playCurrentCombinedAudio} type="button">Play</button>
          <button className="danger" onClick={stopAudio} type="button">Stop</button>
        </div>
      </header>

      <section className="workstation-frame">
        <nav className="mode-rail" aria-label="Workspace modes">
          <button className={activeTab === "compose" ? "mode-button active" : "mode-button"} onClick={() => setActiveTab("compose")} type="button">Compose</button>
          <button className={activeTab === "conduct" ? "mode-button active" : "mode-button"} onClick={() => setActiveTab("conduct")} type="button">Conduct</button>
          <button className={activeTab === "rehearse" ? "mode-button active" : "mode-button"} onClick={() => setActiveTab("rehearse")} type="button">Rehearse</button>
          <button className={activeTab === "perform" ? "mode-button active" : "mode-button"} onClick={() => setActiveTab("perform")} type="button">Perform</button>
          <button className={activeTab === "project" ? "mode-button active" : "mode-button"} onClick={() => setActiveTab("project")} type="button">Project</button>
          <button className={activeTab === "diagnostics" ? "mode-button active" : "mode-button"} onClick={() => setActiveTab("diagnostics")} type="button">Diagnostics</button>
        </nav>

        <section className="main-workspace" aria-label={`${activeModeLabel} workspace`}>
          {error && <pre className="error workspace-error">{error}</pre>}

          {activeTab === "compose" && (
            <div className="workspace-panel compose-workspace">
              <div className="workspace-header-row">
                <div>
                  <p className="eyebrow">Composition Workspace</p>
                  <h2>Notation and Timeline</h2>
                  <p className="note">This is the primary creation surface. The notation, piano roll, track lanes, and conductor cue strip now own the biggest area.</p>
                </div>
                <div className="button-row compact-row">
                  <button onClick={loadSeedMusic} type="button">Load Seed</button>
                  <button onClick={refreshMusicTimeline} type="button">Refresh Notes</button>
                  <button onClick={playCurrentMusicAudio} type="button">Play Music</button>
                </div>
              </div>

              <NotationSpine
                musicTimeline={musicTimeline}
                gestureTimeline={gestureTimeline}
                motionReport={motionReport}
                motionTimeMs={motionTimeMs}
                notationLayout={notationLayout}
                selectedNoteKey={selectedNoteKey}
                onSelectNote={selectNotationNote}
                modeLabel="Compose"
                variant="compose"
              />

              <section className="composer-tool-dock" aria-label="Composer workstation tool dock">
                <div className="tool-card primary-tool-card">
                  <p className="eyebrow">Composer Tool Dock</p>
                  <h3>Professional Score Tools</h3>
                  <p className="note">Reserved workstation zones for the tools a composer expects: notation, piano roll, tracks, mixer, palettes, import/export, shortcuts, and measure tools.</p>
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
                    <h3>Notation Staff</h3>
                    <span>{musicTimeline?.meter ?? "4/4"} · {musicTimeline?.tempo_bpm ?? 84} BPM · {musicTimeline?.tuning_mode ?? "12-TET"}</span>
                  </div>
                  <div className="staff-system" aria-label="Notation staff placeholder">
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

          {activeTab === "project" && (
            <div className="workspace-panel project-workspace">
              <div className="workspace-header-row">
                <div>
                  <p className="eyebrow">Project Custody</p>
                  <h2>Save, Open, Validate, Hash</h2>
                  <p className="note">The .hfield project is the durable source of music, conductor mapping, and motion state.</p>
                </div>
              </div>

              <NotationSpine
                musicTimeline={musicTimeline}
                gestureTimeline={gestureTimeline}
                motionReport={motionReport}
                motionTimeMs={motionTimeMs}
                notationLayout={notationLayout}
                selectedNoteKey={selectedNoteKey}
                onSelectNote={selectNotationNote}
                modeLabel="Project"
                variant="compact"
              />

              <div className="project-custody-card">
                <label htmlFor="project-file-name">Project file</label>
                <div className="project-row console-project-row">
                  <input
                    id="project-file-name"
                    value={projectFileName}
                    onChange={(event) => setProjectFileName(event.target.value)}
                    aria-label="Project file name"
                    placeholder="project_name.hfield"
                  />
                  <button onClick={saveProject} type="button">Save Current</button>
                  <button onClick={() => openProject()} type="button">Open Named</button>
                  <button onClick={refreshProjectList} type="button">List Projects</button>
                </div>
              </div>

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
                  <p className="eyebrow">Diagnostics</p>
                  <h2>Single Report Viewer</h2>
                  <p className="note">Technical reports are available, but no longer pollute the performance workspace.</p>
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
                <h3>Edit Selected Note</h3>
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
                  <button onClick={editSelectedNotationNote} disabled={!selectedNotationNote} type="button">Apply Note Edit</button>
                  <button className="danger" onClick={deleteSelectedNotationNote} disabled={!selectedNotationNote} type="button">Delete Note</button>
                </div>
              </section>

              <section className="control-section composer-bench-section">
                <h3>Composer Workbench</h3>
                <div className="composer-bench-grid" aria-label="Professional composer tool placeholders">
                  <span>Score</span>
                  <span>Palette</span>
                  <span>Mixer</span>
                  <span>Tracks</span>
                  <span>Shortcuts</span>
                  <span>Export</span>
                </div>
              </section>

              <section className="control-section">
                <h3>Add Notes</h3>
                <div className="button-grid small-button-grid">
                  {musicAppendPlan.map((note) => (
                    <button key={`${note.trackId}-${note.midiNote}-${note.label}`} onClick={() => appendMusicNote(note.trackId, note.midiNote, note.durationMs, note.velocity)} type="button">
                      {note.label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="control-section">
                <h3>Track Controls</h3>
                <div className="button-row">
                  <button onClick={resetMusicNotes} type="button">Reset Seed Notes</button>
                  <button onClick={() => clearMusicTrack("lead_voice")} type="button">Clear Lead</button>
                  <button onClick={() => clearMusicTrack("depth_voice")} type="button">Clear Depth</button>
                  <button onClick={() => clearMusicTrack("field_voice")} type="button">Clear Field</button>
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
              <section className="control-section">
                <h3>Gesture Timeline</h3>
                <div className="button-grid small-button-grid">
                  {gestureAppendPlan.map((gesture) => (
                    <button key={gesture.id} onClick={() => appendGesture(gesture.id, gesture.durationMs, gesture.intensity, gesture.operator)} type="button">{gesture.id}</button>
                  ))}
                </div>
                <div className="button-row">
                  <button onClick={resetTimeline} type="button">Reset Standard</button>
                  <button onClick={clearTimeline} type="button">Clear</button>
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


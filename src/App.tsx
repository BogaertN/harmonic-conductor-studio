import { useEffect, useMemo, useRef, useState } from "react";
import {
  appendGestureToCurrentScore,
  appendNoteToCurrentTrack,
  applyGeneratedConductorMappingToCurrentScore,
  clearCurrentGestureTimeline,
  clearCurrentMusicTrack,
  createDefaultScore,
  getAudioDeviceReport,
  getCurrentConductorMappingReport,
  getCurrentConductorMotionReport,
  getCurrentGestureTimeline,
  getCurrentMusicTimeline,
  getCurrentProjectScore,
  getCurrentResonanceLevelBundle,
  getGeneratedConductorMotionReport,
  getGestureVocabulary,
  listSavedProjects,
  loadSeedMusicProject,
  openProjectByFileName,
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
  type PlaybackReport,
  type PreviewReport,
  type ProjectFileReport,
  type ProjectListReport,
  type ResonanceLevelBundle,
  type StopReport,
  type WavRenderReport
} from "./bridge/tauriCommands";

type OperatorTab = "perform" | "project" | "music" | "conductor" | "diagnostics";
type DiagnosticKey =
  | "projectReport"
  | "projectList"
  | "motionReport"
  | "mappingReport"
  | "musicTimeline"
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
  const [activeTab, setActiveTab] = useState<OperatorTab>("perform");
  const [selectedDiagnostic, setSelectedDiagnostic] = useState<DiagnosticKey>("motionReport");
  const [report, setReport] = useState<PreviewReport | null>(null);
  const [musicReport, setMusicReport] = useState<MusicPreviewReport | null>(null);
  const [resonanceBundle, setResonanceBundle] = useState<ResonanceLevelBundle | null>(null);
  const [musicTimeline, setMusicTimeline] = useState<MusicTimelineReport | null>(null);
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

  async function refreshAllCurrentProjectViews() {
    const currentScore = await getCurrentProjectScore();
    setSeedMusicScore(currentScore);
    setResonanceBundle(await getCurrentResonanceLevelBundle());
    setMusicTimeline(await getCurrentMusicTimeline());
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

  async function appendMusicNote(trackId: string, midiNote: number, durationMs: number, velocity: number) {
    setError(null);
    try {
      setMusicTimeline(await appendNoteToCurrentTrack(trackId, midiNote, durationMs, velocity));
      setMappingReport(await getCurrentConductorMappingReport());
      setMotionReport(await getCurrentConductorMotionReport());
      setSeedMusicScore(await getCurrentProjectScore());
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

  return (
    <main className="app-shell workstation-shell">
      <section className="hero compact-hero">
        <p className="eyebrow">AI.Web Native Desktop Application</p>
        <h1>Harmonic Conductor Studio</h1>
        <p>
          Professional conductor workspace for mapped music, visible motion, project custody, and operator-grade playback.
        </p>
      </section>

      <section className="workstation-grid">
        <section className="stage-column">
          <div className="panel stage-panel">
            <div className="stage-header">
              <div>
                <p className="eyebrow">Live Field</p>
                <h2>{currentProjectTitle}</h2>
                <p className="note">{currentProjectStatus}</p>
              </div>
              <div className="status-chip-row">
                <StatusChip label="Duration" value={formatMs(currentDuration)} />
                <StatusChip label="Notes" value={currentNoteCount} />
                <StatusChip label="Gestures" value={currentGestureCount} />
                <StatusChip label="Alignment" value={alignmentStatus} />
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
          </div>

          {resonanceBundle && (
            <div className="panel performance-summary-panel">
              <div className="summary-grid">
                <section>
                  <h3>Source</h3>
                  <p>{resonanceBundle.piece_title}</p>
                  <p className="note">
                    {resonanceBundle.source_summary.tempo_bpm} BPM · {resonanceBundle.source_summary.meter} · {resonanceBundle.source_summary.total_note_count} notes · {resonanceBundle.source_summary.conductor_event_count} gestures
                  </p>
                </section>
                <section>
                  <h3>Current Gesture</h3>
                  <p>{getActiveEvent(motionReport, motionTimeMs)?.gesture_name ?? "No active gesture"}</p>
                  <p className="note">{getActiveEvent(motionReport, motionTimeMs)?.motion_label ?? "Load or map a project."}</p>
                </section>
              </div>
            </div>
          )}
        </section>

        <aside className="panel operator-console" aria-label="Operator console">
          <div className="console-header">
            <div>
              <p className="eyebrow">Operator Console</p>
              <h2>{activeTab[0].toUpperCase() + activeTab.slice(1)}</h2>
            </div>
            <button className="danger transport-stop" onClick={stopAudio} type="button">
              Stop
            </button>
          </div>

          <nav className="tab-strip" aria-label="Operator console tabs">
            <TabButton tab="perform" activeTab={activeTab} setActiveTab={setActiveTab}>Perform</TabButton>
            <TabButton tab="project" activeTab={activeTab} setActiveTab={setActiveTab}>Project</TabButton>
            <TabButton tab="music" activeTab={activeTab} setActiveTab={setActiveTab}>Music</TabButton>
            <TabButton tab="conductor" activeTab={activeTab} setActiveTab={setActiveTab}>Conductor</TabButton>
            <TabButton tab="diagnostics" activeTab={activeTab} setActiveTab={setActiveTab}>Diagnostics</TabButton>
          </nav>

          {error && <pre className="error console-error">{error}</pre>}

          {activeTab === "perform" && (
            <div className="tab-panel">
              <div className="control-section primary-control-section">
                <h3>Live Transport</h3>
                <div className="button-grid primary-buttons">
                  <button onClick={loadSeedMusic} type="button">Load Seed</button>
                  <button onClick={applyGeneratedMapping} type="button">Apply Mapping</button>
                  <button onClick={playCurrentCombinedAudio} type="button">Play Current</button>
                  <button onClick={playGeneratedCombined} type="button">Play Generated</button>
                  <button onClick={startMotionAnimation} disabled={!motionReport} type="button">Animate</button>
                  <button onClick={resetMotionAnimation} type="button">Reset Motion</button>
                </div>
              </div>

              <div className="control-section">
                <h3>Quick State</h3>
                <div className="quick-state-grid">
                  <StatusChip label="Project" value={currentProjectStatus} />
                  <StatusChip label="Playback" value={playbackReport?.status ?? "idle"} />
                  <StatusChip label="Motion" value={isMotionPlaying ? "running" : "ready"} />
                  <StatusChip label="Warnings" value={motionReport?.warnings.length ?? 0} />
                </div>
              </div>

              <div className="control-section compact-actions">
                <h3>Common Actions</h3>
                <div className="button-row">
                  <button onClick={() => openProject()} type="button">Open Named Project</button>
                  <button onClick={saveProject} type="button">Save Current</button>
                  <button onClick={refreshAllCurrentProjectViews} type="button">Refresh Views</button>
                  <button onClick={runPreview} type="button">Run System Preview</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "project" && (
            <div className="tab-panel">
              <div className="control-section">
                <h3>Project Custody</h3>
                <div className="project-row console-project-row">
                  <input
                    value={projectFileName}
                    onChange={(event) => setProjectFileName(event.target.value)}
                    aria-label="Project file name"
                    placeholder="project_name.hfield"
                  />
                  <button onClick={saveProject} type="button">Save</button>
                  <button onClick={() => openProject()} type="button">Open</button>
                  <button onClick={refreshProjectList} type="button">List</button>
                </div>
              </div>

              {projectList && (
                <div className="control-section">
                  <h3>Saved Projects</h3>
                  <div className="project-list compact-project-list">
                    {projectList.projects.length === 0 && <span className="note">No saved .hfield projects found.</span>}
                    {projectList.projects.map((project) => (
                      <button
                        key={project.file_name}
                        onClick={() => openProject(project.file_name)}
                        title={project.path}
                        type="button"
                      >
                        {project.file_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="control-section report-card">
                <h3>Last Project Report</h3>
                <pre>{JSON.stringify(projectReport ?? "No project save/open report yet.", null, 2)}</pre>
              </div>
            </div>
          )}

          {activeTab === "music" && (
            <div className="tab-panel">
              <div className="control-section">
                <h3>Music Playback</h3>
                <div className="button-row">
                  <button onClick={playMusicAudio} type="button">Play Seed Music</button>
                  <button onClick={playCurrentMusicAudio} type="button">Play Current Music</button>
                  <button onClick={renderMusicWav} type="button">Render Seed WAV</button>
                  <button onClick={renderCurrentMusicWav} type="button">Render Current WAV</button>
                </div>
              </div>

              <div className="control-section">
                <h3>Music Timeline</h3>
                <div className="button-row">
                  <button onClick={refreshMusicTimeline} type="button">Refresh Timeline</button>
                  <button onClick={resetMusicNotes} type="button">Reset Seed Notes</button>
                  <button onClick={() => clearMusicTrack("lead_voice")} type="button">Clear Lead</button>
                  <button onClick={() => clearMusicTrack("depth_voice")} type="button">Clear Depth</button>
                  <button onClick={() => clearMusicTrack("field_voice")} type="button">Clear Field</button>
                </div>
              </div>

              <div className="control-section">
                <h3>Append Notes</h3>
                <div className="button-grid small-button-grid">
                  {musicAppendPlan.map((note) => (
                    <button
                      key={`${note.trackId}-${note.midiNote}-${note.label}`}
                      onClick={() => appendMusicNote(note.trackId, note.midiNote, note.durationMs, note.velocity)}
                      type="button"
                    >
                      {note.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "conductor" && (
            <div className="tab-panel">
              <div className="control-section">
                <h3>Mapping and Motion</h3>
                <div className="button-row">
                  <button onClick={generateMappingReport} type="button">Generate Mapping</button>
                  <button onClick={applyGeneratedMapping} type="button">Apply Mapping</button>
                  <button onClick={previewGeneratedMotion} type="button">Preview Motion</button>
                  <button onClick={refreshCurrentMotion} type="button">Refresh Motion</button>
                  <button onClick={renderGeneratedMappedWav} type="button">Render Mapped WAV</button>
                </div>
              </div>

              <div className="control-section">
                <h3>Conductor Playback</h3>
                <div className="button-row">
                  <button onClick={playGeneratedConductor} type="button">Play Generated Conductor</button>
                  <button onClick={playGeneratedCombined} type="button">Play Generated Combined</button>
                  <button onClick={playCurrentConductorAudio} type="button">Play Current Conductor</button>
                  <button onClick={playCurrentCombinedAudio} type="button">Play Current Combined</button>
                  <button onClick={renderCurrentProjectWav} type="button">Render Current Combined</button>
                </div>
              </div>

              <div className="control-section">
                <h3>Gesture Timeline</h3>
                <div className="button-row">
                  <button onClick={refreshTimeline} type="button">Refresh Timeline</button>
                  <button onClick={resetTimeline} type="button">Reset Standard</button>
                  <button onClick={clearTimeline} type="button">Clear Timeline</button>
                </div>
                <div className="button-grid small-button-grid">
                  {gestureAppendPlan.map((gesture) => (
                    <button
                      key={gesture.id}
                      onClick={() => appendGesture(gesture.id, gesture.durationMs, gesture.intensity, gesture.operator)}
                      type="button"
                    >
                      {gesture.id}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "diagnostics" && (
            <div className="tab-panel diagnostics-panel">
              <div className="control-section diagnostics-selector-row">
                <label htmlFor="diagnostic-select">Report</label>
                <select
                  id="diagnostic-select"
                  value={selectedDiagnostic}
                  onChange={(event) => setSelectedDiagnostic(event.target.value as DiagnosticKey)}
                >
                  {diagnosticOptions.map((option) => (
                    <option key={option.key} value={option.key}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="control-section report-card diagnostics-report-card">
                <h3>{activeDiagnosticLabel}</h3>
                <pre>{JSON.stringify(diagnosticPayload() ?? "No data loaded for this report yet.", null, 2)}</pre>
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

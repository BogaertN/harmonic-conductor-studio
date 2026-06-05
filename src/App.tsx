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
  listSavedProjects,
  openProjectByFileName,
  saveCurrentProjectAs,
  getGeneratedConductorMotionReport,
  getGestureVocabulary,
  getSeedResonanceLevelBundle,
  loadSeedMusicProject,
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
  stopPlayback,
  type ConductorMappingReport,
  type ConductorMotionPoint,
  type ConductorMotionReport,
  type GestureTimelineReport,
  type MusicPreviewReport,
  type MusicTimelineReport,
  type PlaybackReport,
  type PreviewReport,
  type ProjectListReport,
  type ProjectFileReport,
  type ResonanceLevelBundle,
  type StopReport,
  type WavRenderReport
} from "./bridge/tauriCommands";

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
    <div className="motion-stage">
      <div className="motion-toolbar">
        <button onClick={onPlay} disabled={!report || report.event_count === 0 || isPlaying}>
          Animate Motion
        </button>
        <button onClick={onStop} disabled={!isPlaying}>
          Stop Motion
        </button>
        <button onClick={onReset}>Reset Motion</button>
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function loadSeedMusic() {
    setError(null);
    try {
      setSeedMusicScore(await loadSeedMusicProject());
      setMusicReport(await previewSeedMusicReport());
      setResonanceBundle(await getSeedResonanceLevelBundle());
      setGestureTimeline(await getCurrentGestureTimeline());
      setMusicTimeline(await getCurrentMusicTimeline());
      setMappingReport(await getCurrentConductorMappingReport());
      setMotionReport(await getCurrentConductorMotionReport());
      setProjectList(await listSavedProjects());
      resetMotionAnimation();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function refreshMusicTimeline() {
    setError(null);
    try {
      setMusicTimeline(await getCurrentMusicTimeline());
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function refreshTimeline() {
    setError(null);
    try {
      setGestureTimeline(await getCurrentGestureTimeline());
      setMotionReport(await getCurrentConductorMotionReport());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function appendGesture(gestureId: string, durationMs: number, intensity: number, operator: string) {
    setError(null);
    try {
      setGestureTimeline(await appendGestureToCurrentScore(gestureId, durationMs, intensity, operator));
      setMotionReport(await getCurrentConductorMotionReport());
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
      resetMotionAnimation();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function generateMappingReport() {
    setError(null);
    try {
      setMappingReport(await getCurrentConductorMappingReport());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function applyGeneratedMapping() {
    setError(null);
    try {
      setMappingReport(await applyGeneratedConductorMappingToCurrentScore());
      setGestureTimeline(await getCurrentGestureTimeline());
      setMotionReport(await getCurrentConductorMotionReport());
      setSeedMusicScore(await getCurrentProjectScore());
      resetMotionAnimation();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function refreshCurrentMotion() {
    setError(null);
    try {
      setMotionReport(await getCurrentConductorMotionReport());
      resetMotionAnimation();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function previewGeneratedMotion() {
    setError(null);
    try {
      setMotionReport(await getGeneratedConductorMotionReport());
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function renderWav() {
    setError(null);
    try {
      setWavReport(await renderFirstGestureWav());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function renderMusicWav() {
    setError(null);
    try {
      setMusicWavReport(await renderSeedMusicWav());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function renderCombinedWav() {
    setError(null);
    try {
      setCombinedWavReport(await renderSeedCombinedWav());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function renderCurrentProjectWav() {
    setError(null);
    try {
      setCurrentProjectWavReport(await renderCurrentProjectCombinedWav());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function renderCurrentMusicWav() {
    setError(null);
    try {
      setCurrentProjectMusicWavReport(await renderCurrentProjectMusicWav());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function playAudio() {
    setError(null);
    try {
      setPlaybackReport(await playFirstGestureAudio());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function playMusicAudio() {
    setError(null);
    try {
      setPlaybackReport(await playSeedMusicAudio());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function playCombinedAudio() {
    setError(null);
    try {
      setPlaybackReport(await playSeedCombinedAudio());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function playCurrentMusicAudio() {
    setError(null);
    try {
      setPlaybackReport(await playCurrentProjectMusicAudio());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function playCurrentConductorAudio() {
    setError(null);
    try {
      setPlaybackReport(await playCurrentProjectConductorAudio());
      setMotionReport(await getCurrentConductorMotionReport());
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
      stopMotionAnimation();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <p className="eyebrow">AI.Web Native Desktop Application</p>
        <h1>Harmonic Conductor Studio</h1>
        <p>
          A conducted music system where one source score can open through
          beginner, note-name, conductor, accessibility, mapping, visible motion, and professional views.
        </p>
      </section>

      <section className="grid">
        <div className="panel conductor-stage">
          <h2>Conductor Field</h2>
          <div className="field">
            <div className="row upper"><span>g7</span><strong>g9</strong><span>g8</span></div>
            <div className="row center"><span>g2</span><strong>g1</strong><span>g3</span></div>
            <div className="row lower"><span>g4</span><strong>g5</strong><span>g6</span></div>
          </div>
          <p className="note">Center = 1 home/root. Lower = 5 depth/weight. Upper = 9 lift/expression.</p>
        </div>

        <div className="panel">
          <h2>Native Core Proof</h2>
          <div className="button-row">
            <button onClick={runPreview}>Run Rust Preview</button>
            <button onClick={renderWav}>Render Gesture WAV</button>
            <button onClick={playAudio}>Play Gesture Audio</button>
            <button className="danger" onClick={stopAudio}>Stop Playback</button>
          </div>


          <h2>Project Save/Open v1</h2>
          <div className="project-row">
            <input
              value={projectFileName}
              onChange={(event) => setProjectFileName(event.target.value)}
              aria-label="Project file name"
              placeholder="project_name.hfield"
            />
            <button onClick={saveProject}>Save Current .hfield</button>
            <button onClick={() => openProject()}>Open .hfield</button>
            <button onClick={refreshProjectList}>List Projects</button>
          </div>

          {projectList && (
            <div className="project-list">
              <strong>Saved Projects: {projectList.project_count}</strong>
              {projectList.projects.map((project) => (
                <button
                  key={project.file_name}
                  onClick={() => openProject(project.file_name)}
                  title={project.path}
                >
                  Open {project.file_name}
                </button>
              ))}
            </div>
          )}

          <h2>Music Engine v1</h2>
          <div className="button-row">
            <button onClick={loadSeedMusic}>Load Seed Music + Levels</button>
            <button onClick={playMusicAudio}>Play Music Seed</button>
            <button onClick={playCombinedAudio}>Play Music + Conductor</button>
            <button onClick={renderMusicWav}>Render Music WAV</button>
            <button onClick={renderCombinedWav}>Render Combined WAV</button>
          </div>

          <h2>Music Note Timeline v1</h2>
          <div className="button-row">
            <button onClick={refreshMusicTimeline}>Refresh Music Timeline</button>
            <button onClick={resetMusicNotes}>Reset Seed Notes</button>
            <button onClick={() => clearMusicTrack("lead_voice")}>Clear Lead Track</button>
            <button onClick={() => clearMusicTrack("depth_voice")}>Clear Depth Track</button>
            <button onClick={() => clearMusicTrack("field_voice")}>Clear Field Track</button>
            <button onClick={playCurrentMusicAudio}>Play Current Music</button>
            <button onClick={renderCurrentMusicWav}>Render Current Music WAV</button>
          </div>

          <div className="button-row music-note-row">
            {musicAppendPlan.map((note) => (
              <button
                key={`${note.trackId}-${note.midiNote}-${note.label}`}
                onClick={() => appendMusicNote(note.trackId, note.midiNote, note.durationMs, note.velocity)}
              >
                Append {note.label}
              </button>
            ))}
          </div>

          <h2>Conductor Mapping v1</h2>
          <div className="button-row mapping-row">
            <button onClick={generateMappingReport}>Generate Mapping Report</button>
            <button onClick={applyGeneratedMapping}>Apply Generated Mapping</button>
            <button onClick={playGeneratedConductor}>Play Generated Conductor</button>
            <button onClick={playGeneratedCombined}>Play Generated Music + Conductor</button>
            <button onClick={renderGeneratedMappedWav}>Render Generated Mapped WAV</button>
          </div>

          <h2>Visible Hand Motion v1</h2>
          <div className="button-row motion-row">
            <button onClick={refreshCurrentMotion}>Refresh Current Motion</button>
            <button onClick={previewGeneratedMotion}>Preview Generated Motion</button>
          </div>

          <VisibleConductorMotion
            report={motionReport}
            timeMs={motionTimeMs}
            isPlaying={isMotionPlaying}
            onPlay={startMotionAnimation}
            onStop={stopMotionAnimation}
            onReset={resetMotionAnimation}
          />

          <h2>Gesture Timeline v1</h2>
          <div className="button-row">
            <button onClick={refreshTimeline}>Refresh Timeline</button>
            <button onClick={resetTimeline}>Reset Standard Path</button>
            <button onClick={clearTimeline}>Clear Timeline</button>
            <button onClick={playCurrentConductorAudio}>Play Current Conductor</button>
            <button onClick={playCurrentCombinedAudio}>Play Current Music + Conductor</button>
            <button onClick={renderCurrentProjectWav}>Render Current Combined WAV</button>
          </div>

          <div className="button-row gesture-row">
            {gestureAppendPlan.map((gesture) => (
              <button
                key={gesture.id}
                onClick={() => appendGesture(gesture.id, gesture.durationMs, gesture.intensity, gesture.operator)}
              >
                Append {gesture.id}
              </button>
            ))}
          </div>

          {error && <pre className="error">{error}</pre>}


          {projectReport && (
            <>
              <h3>Project File Report</h3>
              <pre>{JSON.stringify(projectReport, null, 2)}</pre>
            </>
          )}

          {projectList && (
            <>
              <h3>Project List Report</h3>
              <pre>{JSON.stringify(projectList, null, 2)}</pre>
            </>
          )}

          {motionReport && (
            <>
              <h3>Conductor Motion Report</h3>
              <pre>{JSON.stringify(motionReport, null, 2)}</pre>
            </>
          )}

          {mappingReport && (
            <>
              <h3>Conductor Mapping Report</h3>
              <pre>{JSON.stringify(mappingReport, null, 2)}</pre>
            </>
          )}

          {musicTimeline && (
            <>
              <h3>Music Note Timeline Report</h3>
              <pre>{JSON.stringify(musicTimeline, null, 2)}</pre>
            </>
          )}

          {gestureTimeline && (
            <>
              <h3>Gesture Timeline Report</h3>
              <pre>{JSON.stringify(gestureTimeline, null, 2)}</pre>
            </>
          )}

          {Boolean(deviceReport) && (
            <>
              <h3>Audio Device</h3>
              <pre>{JSON.stringify(deviceReport, null, 2)}</pre>
            </>
          )}

          {playbackReport && (
            <>
              <h3>Native Playback</h3>
              <pre>{JSON.stringify(playbackReport, null, 2)}</pre>
            </>
          )}

          {stopReport && (
            <>
              <h3>Stop Report</h3>
              <pre>{JSON.stringify(stopReport, null, 2)}</pre>
            </>
          )}

          {musicReport && (
            <>
              <h3>Music Preview</h3>
              <pre>{JSON.stringify(musicReport, null, 2)}</pre>
            </>
          )}

          {report && (
            <>
              <h3>Rust Preview</h3>
              <pre>{JSON.stringify(report, null, 2)}</pre>
            </>
          )}

          {wavReport && (
            <>
              <h3>Gesture WAV Render</h3>
              <pre>{JSON.stringify(wavReport, null, 2)}</pre>
            </>
          )}

          {musicWavReport && (
            <>
              <h3>Music WAV Render</h3>
              <pre>{JSON.stringify(musicWavReport, null, 2)}</pre>
            </>
          )}

          {combinedWavReport && (
            <>
              <h3>Combined WAV Render</h3>
              <pre>{JSON.stringify(combinedWavReport, null, 2)}</pre>
            </>
          )}

          {currentProjectMusicWavReport && (
            <>
              <h3>Current Project Music WAV Render</h3>
              <pre>{JSON.stringify(currentProjectMusicWavReport, null, 2)}</pre>
            </>
          )}

          {currentProjectWavReport && (
            <>
              <h3>Current Project Combined WAV Render</h3>
              <pre>{JSON.stringify(currentProjectWavReport, null, 2)}</pre>
            </>
          )}

          {mappedWavReport && (
            <>
              <h3>Generated Mapped Combined WAV Render</h3>
              <pre>{JSON.stringify(mappedWavReport, null, 2)}</pre>
            </>
          )}
        </div>

        {resonanceBundle && (
          <div className="panel wide">
            <h2>Resonance Level View v1</h2>
            <p className="note">One source score. Multiple playable views. Same resonance identity.</p>

            <div className="level-grid">
              <section><h3>Source Summary</h3><pre>{JSON.stringify(resonanceBundle.source_summary, null, 2)}</pre></section>
              <section><h3>Beginner View</h3><pre>{JSON.stringify(resonanceBundle.beginner_view, null, 2)}</pre></section>
              <section><h3>Note Name View</h3><pre>{JSON.stringify(resonanceBundle.note_name_view, null, 2)}</pre></section>
              <section><h3>Conductor View</h3><pre>{JSON.stringify(resonanceBundle.conductor_view, null, 2)}</pre></section>
            </div>

            <h3>Accessibility Guidance</h3>
            <pre>{JSON.stringify(resonanceBundle.accessibility_guidance, null, 2)}</pre>

            <h3>Professional Boundary</h3>
            <pre>{resonanceBundle.professional_boundary}</pre>
          </div>
        )}

        <div className="panel wide">
          <h2>Default .hfield Score</h2>
          <pre>{score ? JSON.stringify(score, null, 2) : "Run preview to load the default native score."}</pre>
        </div>

        <div className="panel wide">
          <h2>Seed Music .hfield Score</h2>
          <pre>{seedMusicScore ? JSON.stringify(seedMusicScore, null, 2) : "Load seed music to see the first note-based HCS score."}</pre>
        </div>

        <div className="panel wide">
          <h2>Nine-Gesture Vocabulary</h2>
          <pre>{vocabulary ? JSON.stringify(vocabulary, null, 2) : "Run preview to load the native gesture vocabulary."}</pre>
        </div>
      </section>
    </main>
  );
}

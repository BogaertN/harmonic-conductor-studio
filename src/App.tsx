import { useState } from "react";
import {
  appendGestureToCurrentScore,
  appendNoteToCurrentTrack,
  clearCurrentMusicTrack,
  getCurrentMusicTimeline,
  playCurrentProjectMusicAudio,
  renderCurrentProjectMusicWav,
  resetCurrentMusicToSeed,
  clearCurrentGestureTimeline,
  createDefaultScore,
  getAudioDeviceReport,
  getCurrentGestureTimeline,
  getGestureVocabulary,
  getSeedResonanceLevelBundle,
  loadSeedMusicProject,
  playCurrentProjectCombinedAudio,
  playCurrentProjectConductorAudio,
  playFirstGestureAudio,
  playSeedCombinedAudio,
  playSeedMusicAudio,
  previewScoreReport,
  previewSeedMusicReport,
  renderCurrentProjectCombinedWav,
  renderFirstGestureWav,
  renderSeedCombinedWav,
  renderSeedMusicWav,
  resetCurrentGestureTimelineToStandardPath,
  stopPlayback,
  type GestureTimelineReport,
  type MusicPreviewReport,
  type MusicTimelineReport,
  type PlaybackReport,
  type PreviewReport,
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

export default function App() {
  const [report, setReport] = useState<PreviewReport | null>(null);
  const [musicReport, setMusicReport] = useState<MusicPreviewReport | null>(null);
  const [resonanceBundle, setResonanceBundle] = useState<ResonanceLevelBundle | null>(null);
  const [gestureTimeline, setGestureTimeline] = useState<GestureTimelineReport | null>(null);
  const [musicTimeline, setMusicTimeline] = useState<MusicTimelineReport | null>(null);
  const [wavReport, setWavReport] = useState<WavRenderReport | null>(null);
  const [musicWavReport, setMusicWavReport] = useState<WavRenderReport | null>(null);
  const [combinedWavReport, setCombinedWavReport] = useState<WavRenderReport | null>(null);
  const [currentProjectWavReport, setCurrentProjectWavReport] = useState<WavRenderReport | null>(null);
  const [currentProjectMusicWavReport, setCurrentProjectMusicWavReport] = useState<WavRenderReport | null>(null);
  const [playbackReport, setPlaybackReport] = useState<PlaybackReport | null>(null);
  const [stopReport, setStopReport] = useState<StopReport | null>(null);
  const [deviceReport, setDeviceReport] = useState<unknown>(null);
  const [vocabulary, setVocabulary] = useState<unknown>(null);
  const [score, setScore] = useState<unknown>(null);
  const [seedMusicScore, setSeedMusicScore] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

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
      const nextScore = await loadSeedMusicProject();
      setSeedMusicScore(nextScore);
      setMusicReport(await previewSeedMusicReport());
      setResonanceBundle(await getSeedResonanceLevelBundle());
      setGestureTimeline(await getCurrentGestureTimeline());
      setMusicTimeline(await getCurrentMusicTimeline());
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
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function clearMusicTrack(trackId: string) {
    setError(null);
    try {
      setMusicTimeline(await clearCurrentMusicTrack(trackId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function resetMusicNotes() {
    setError(null);
    try {
      setMusicTimeline(await resetCurrentMusicToSeed());
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

  async function renderCurrentMusicWav() {
    setError(null);
    try {
      setCurrentProjectMusicWavReport(await renderCurrentProjectMusicWav());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function refreshTimeline() {
    setError(null);
    try {
      setGestureTimeline(await getCurrentGestureTimeline());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function appendGesture(gestureId: string, durationMs: number, intensity: number, operator: string) {
    setError(null);
    try {
      setGestureTimeline(await appendGestureToCurrentScore(gestureId, durationMs, intensity, operator));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function clearTimeline() {
    setError(null);
    try {
      setGestureTimeline(await clearCurrentGestureTimeline());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function resetTimeline() {
    setError(null);
    try {
      setGestureTimeline(await resetCurrentGestureTimelineToStandardPath());
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

  async function playCurrentConductorAudio() {
    setError(null);
    try {
      setPlaybackReport(await playCurrentProjectConductorAudio());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function playCurrentCombinedAudio() {
    setError(null);
    try {
      setPlaybackReport(await playCurrentProjectCombinedAudio());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function stopAudio() {
    setError(null);
    try {
      setStopReport(await stopPlayback());
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
          beginner, note-name, conductor, accessibility, and professional views.
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

import { useState } from "react";
import {
  createDefaultScore,
  createSeedMusicScore,
  getAudioDeviceReport,
  getGestureVocabulary,
  getSeedResonanceLevelBundle,
  playFirstGestureAudio,
  playSeedCombinedAudio,
  playSeedMusicAudio,
  previewScoreReport,
  previewSeedMusicReport,
  renderFirstGestureWav,
  renderSeedCombinedWav,
  renderSeedMusicWav,
  stopPlayback,
  type MusicPreviewReport,
  type PlaybackReport,
  type PreviewReport,
  type ResonanceLevelBundle,
  type StopReport,
  type WavRenderReport
} from "./bridge/tauriCommands";

export default function App() {
  const [report, setReport] = useState<PreviewReport | null>(null);
  const [musicReport, setMusicReport] = useState<MusicPreviewReport | null>(null);
  const [resonanceBundle, setResonanceBundle] = useState<ResonanceLevelBundle | null>(null);
  const [wavReport, setWavReport] = useState<WavRenderReport | null>(null);
  const [musicWavReport, setMusicWavReport] = useState<WavRenderReport | null>(null);
  const [combinedWavReport, setCombinedWavReport] = useState<WavRenderReport | null>(null);
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
      const nextScore = await createDefaultScore();
      const nextVocabulary = await getGestureVocabulary();
      const nextReport = await previewScoreReport();
      const nextDeviceReport = await getAudioDeviceReport();

      setScore(nextScore);
      setVocabulary(nextVocabulary);
      setReport(nextReport);
      setDeviceReport(nextDeviceReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function loadSeedMusic() {
    setError(null);
    try {
      const nextScore = await createSeedMusicScore();
      const nextReport = await previewSeedMusicReport();
      const nextResonanceBundle = await getSeedResonanceLevelBundle();

      setSeedMusicScore(nextScore);
      setMusicReport(nextReport);
      setResonanceBundle(nextResonanceBundle);
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
            <div className="row upper">
              <span>g7</span>
              <strong>g9</strong>
              <span>g8</span>
            </div>
            <div className="row center">
              <span>g2</span>
              <strong>g1</strong>
              <span>g3</span>
            </div>
            <div className="row lower">
              <span>g4</span>
              <strong>g5</strong>
              <span>g6</span>
            </div>
          </div>
          <p className="note">
            Center = 1 home/root. Lower = 5 depth/weight. Upper = 9 lift/expression.
          </p>
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

          {error && <pre className="error">{error}</pre>}

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
        </div>

        {resonanceBundle && (
          <div className="panel wide">
            <h2>Resonance Level View v1</h2>
            <p className="note">
              One source score. Multiple playable views. Same resonance identity.
            </p>

            <div className="level-grid">
              <section>
                <h3>Source Summary</h3>
                <pre>{JSON.stringify(resonanceBundle.source_summary, null, 2)}</pre>
              </section>

              <section>
                <h3>Beginner View</h3>
                <pre>{JSON.stringify(resonanceBundle.beginner_view, null, 2)}</pre>
              </section>

              <section>
                <h3>Note Name View</h3>
                <pre>{JSON.stringify(resonanceBundle.note_name_view, null, 2)}</pre>
              </section>

              <section>
                <h3>Conductor View</h3>
                <pre>{JSON.stringify(resonanceBundle.conductor_view, null, 2)}</pre>
              </section>
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

import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Group } from "three";
import type { HfieldFieldSynthesisReport, PlayheadCursorReport } from "../bridge/tauriCommands";

type ViewportProps = {
  report: HfieldFieldSynthesisReport | null;
  playheadReport: PlayheadCursorReport | null;
  isPlaying: boolean;
  onRefresh: () => void;
  onPlay: () => void;
  onStop: () => void;
};

type SceneProps = {
  report: HfieldFieldSynthesisReport;
  playheadReport: PlayheadCursorReport | null;
  isPlaying: boolean;
};

function phaseColor(phase: number): string {
  const palette: Record<number, string> = {
    1: "#f6f1c8",
    2: "#54d6ff",
    3: "#7df5a4",
    4: "#63a4ff",
    5: "#ffb23f",
    6: "#f06aff",
    7: "#46ffd2",
    8: "#ff5c7c",
    9: "#ffffff"
  };

  return palette[phase] ?? "#d8e4ff";
}

function phaseScale(phase: number): number {
  if (phase === 1 || phase === 5 || phase === 9) {
    return 0.16;
  }

  return 0.1;
}

function nodePosition(node: HfieldFieldSynthesisReport["phase_nodes"][number]): [number, number, number] {
  return [node.x * 3.1, node.y * 2.1, node.z * 2.6];
}

function samplePosition(sample: HfieldFieldSynthesisReport["cymatic_wave_samples"][number]): [number, number, number] {
  const timeDepth = sample.time_norm * 5.8 - 2.9;
  const radialLift = sample.radial_displacement * 0.9;
  return [sample.x * 3.1 + radialLift, sample.y * 2.0, sample.z * 1.7 + timeDepth];
}

function eventPosition(event: HfieldFieldSynthesisReport["harmonic_events"][number]): [number, number, number] {
  const timeDepth = event.time_norm_start * 5.8 - 2.9;
  return [event.x * 3.1, event.y * 2.0, event.z * 1.7 + timeDepth];
}

function tracePosition(point: HfieldFieldSynthesisReport["field_trace"][number]): [number, number, number] {
  const timeDepth = point.time_norm * 5.8 - 2.9;
  return [point.x * 3.1, point.y * 2.0, point.z * 1.7 + timeDepth];
}

function FieldPointCloud({ report }: { report: HfieldFieldSynthesisReport }) {
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const colors: number[] = [];

    for (const sample of report.cymatic_wave_samples) {
      const [x, y, z] = samplePosition(sample);
      const color = new THREE.Color(phaseColor(sample.phase));
      const intensity = Math.max(0.25, Math.min(1, sample.coherence_weight));

      positions.push(x, y, z);
      colors.push(color.r * intensity, color.g * intensity, color.b * intensity);
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    buffer.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    buffer.computeBoundingSphere();
    return buffer;
  }, [report]);

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.055} vertexColors transparent opacity={0.9} depthWrite={false} />
    </points>
  );
}

function PhaseNodeField({ report }: { report: HfieldFieldSynthesisReport }) {
  return (
    <group>
      {report.phase_nodes.map((node) => {
        const [x, y, z] = nodePosition(node);
        const isAnchor = node.phase === 1 || node.phase === 5 || node.phase === 9;

        return (
          <group key={`phase-node-${node.phase}`} position={[x, y, z]}>
            <mesh>
              <sphereGeometry args={[phaseScale(node.phase), 32, 16]} />
              <meshStandardMaterial
                color={phaseColor(node.phase)}
                emissive={phaseColor(node.phase)}
                emissiveIntensity={isAnchor ? 0.55 : 0.25}
                roughness={0.38}
                metalness={0.08}
              />
            </mesh>
            {isAnchor && (
              <mesh scale={[1.45, 1.45, 1.45]}>
                <sphereGeometry args={[phaseScale(node.phase), 32, 16]} />
                <meshBasicMaterial color={phaseColor(node.phase)} transparent opacity={0.08} wireframe />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

function EventMarkers({ report }: { report: HfieldFieldSynthesisReport }) {
  return (
    <group>
      {report.harmonic_events.slice(0, 96).map((event) => {
        const [x, y, z] = eventPosition(event);
        const radius = event.event_kind === "note" ? 0.055 : 0.075;

        return (
          <mesh key={`${event.event_kind}-${event.event_index}-${event.start_ms}`} position={[x, y, z]}>
            <sphereGeometry args={[radius, 20, 12]} />
            <meshStandardMaterial
              color={phaseColor(event.phase)}
              emissive={phaseColor(event.phase)}
              emissiveIntensity={0.42}
              transparent
              opacity={event.event_kind === "note" ? 0.88 : 0.72}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function TraceLines({ report }: { report: HfieldFieldSynthesisReport }) {
  const phaseOrderLines = useMemo(() => {
    return report.phase_grid_rows.flatMap((row) => {
      const nodes = row
        .map((phase) => report.phase_nodes.find((node) => node.phase === phase))
        .filter((node): node is HfieldFieldSynthesisReport["phase_nodes"][number] => Boolean(node));
      const rowPositions = nodes.map(nodePosition);
      return rowPositions.length > 1 ? [rowPositions] : [];
    });
  }, [report]);

  const tracePositions = useMemo(() => report.field_trace.map(tracePosition), [report]);

  return (
    <group>
      {phaseOrderLines.map((positions, index) => (
        <Line key={`phase-row-${index}`} points={positions} color="#4d6f9d" lineWidth={1} transparent opacity={0.45} />
      ))}
      {tracePositions.length > 1 && (
        <Line points={tracePositions} color="#f5f0bd" lineWidth={2} transparent opacity={0.72} />
      )}
    </group>
  );
}

function PlayheadPlane({ playheadReport }: { playheadReport: PlayheadCursorReport | null }) {
  const progress = Math.max(0, Math.min(1, (playheadReport?.progress_percent ?? 0) / 100));
  const z = progress * 5.8 - 2.9;

  return (
    <mesh position={[0, 0, z]}>
      <boxGeometry args={[7.5, 4.7, 0.025]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.075} depthWrite={false} />
    </mesh>
  );
}

function PhaseFieldScene({ report, playheadReport, isPlaying }: SceneProps) {
  const group = useRef<Group | null>(null);

  useFrame((_, delta) => {
    if (group.current && isPlaying) {
      group.current.rotation.y += delta * 0.035;
    }
  });

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 4, 5]} intensity={0.9} />
      <pointLight position={[-3, -2, 4]} intensity={0.6} color="#54d6ff" />
      <group ref={group}>
        <TraceLines report={report} />
        <FieldPointCloud report={report} />
        <EventMarkers report={report} />
        <PhaseNodeField report={report} />
        <PlayheadPlane playheadReport={playheadReport} />
      </group>
      <gridHelper args={[8, 8, "#27415f", "#142234"]} position={[0, -2.25, 0]} />
      <OrbitControls enableDamping makeDefault />
    </>
  );
}

export function HfieldPhaseFieldViewport({ report, playheadReport, isPlaying, onRefresh, onPlay, onStop }: ViewportProps) {
  const anchors = report?.anchors;
  const currentPhase = playheadReport?.active_notes[0]?.resonance_lane ?? playheadReport?.active_gesture_id ?? "waiting";

  return (
    <section className="phase-field-viewport-card" aria-label="HFIELD 3D phase field viewport">
      <div className="phase-field-header">
        <div>
          <p className="eyebrow">.hfield Field Viewer</p>
          <h3>9 Phase Cymatic Time-Space Field</h3>
          <p className="note">Rendered from the Rust field synthesis engine. The scene uses Three.js / React Three Fiber, but the phase positions, events, trace, and samples come from the .hfield packet.</p>
        </div>
        <div className="button-row compact-row">
          <button onClick={onRefresh} type="button">Refresh Field</button>
          <button onClick={onPlay} type="button">Play</button>
          <button className="danger" onClick={onStop} type="button">Stop</button>
        </div>
      </div>

      <div className="phase-field-viewport-shell">
        {report ? (
          <Canvas camera={{ position: [4.8, 3.2, 7.4], fov: 47 }} dpr={[1, 2]}>
            <color attach="background" args={["#05070c"]} />
            <fog attach="fog" args={["#05070c", 7, 16]} />
            <PhaseFieldScene report={report} playheadReport={playheadReport} isPlaying={isPlaying} />
          </Canvas>
        ) : (
          <div className="phase-field-empty-state">
            <h4>No field report loaded</h4>
            <p>Load or map a project, then refresh the field to synthesize the 9 phase .hfield packet view.</p>
            <button onClick={onRefresh} type="button">Synthesize Field</button>
          </div>
        )}
      </div>

      <div className="phase-field-readout-grid">
        <section>
          <strong>Phase Order</strong>
          <span>{report?.phase_grid_rows.map((row) => row.join("-" )).join(" / ") ?? "2-1-3 / 4-5-6 / 7-9-8"}</span>
        </section>
        <section>
          <strong>Anchors</strong>
          <span>{anchors ? `1:${anchors.center_1.role} · 5:${anchors.lower_5.role} · 9:${anchors.upper_9.role}` : "1 center · 5 lower · 9 upper"}</span>
        </section>
        <section>
          <strong>Events</strong>
          <span>{report ? `${report.harmonic_events.length} field events · ${report.cymatic_wave_samples.length} samples` : "—"}</span>
        </section>
        <section>
          <strong>Current</strong>
          <span>{currentPhase}</span>
        </section>
        <section>
          <strong>Hash</strong>
          <span>{report?.deterministic_field_hash.slice(0, 18) ?? "not sealed"}</span>
        </section>
        <section>
          <strong>Status</strong>
          <span>{report?.status ?? "not synthesized"}</span>
        </section>
      </div>
    </section>
  );
}

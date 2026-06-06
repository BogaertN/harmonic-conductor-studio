import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Group } from "three";
import {
  getCurrentHfieldCymaticReaderSurfaceReport,
  type HfieldCymaticReaderSurfaceReport,
  type HfieldFieldSynthesisReport,
  type PlayheadCursorReport
} from "../bridge/tauriCommands";

type ViewportProps = {
  report: HfieldFieldSynthesisReport | null;
  playheadReport: PlayheadCursorReport | null;
  isPlaying: boolean;
  onRefresh: () => void | Promise<void>;
  onPlay: () => void;
  onStop: () => void;
};

type SceneProps = {
  report: HfieldFieldSynthesisReport;
  cymaticReport: HfieldCymaticReaderSurfaceReport | null;
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
    9: "#9d7cff"
  };

  return palette[phase] ?? "#d8e4ff";
}

function phaseScale(phase: number): number {
  return phase === 1 || phase === 5 || phase === 9 ? 0.16 : 0.1;
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

function readerVertexPosition(vertex: HfieldCymaticReaderSurfaceReport["reader_surface"]["vertices"][number]): [number, number, number] {
  const x = vertex.x_norm * 3.2;
  const z = vertex.time_norm * 5.8 - 2.9;
  const y = vertex.displacement * 1.65;
  return [x, y, z];
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
      <pointsMaterial size={0.045} vertexColors transparent opacity={0.64} depthWrite={false} />
    </points>
  );
}

function GlassReaderSurfaceMesh({ cymaticReport }: { cymaticReport: HfieldCymaticReaderSurfaceReport | null }) {
  const geometry = useMemo(() => {
    if (!cymaticReport) {
      return null;
    }

    const { x_segments: xSegments, t_segments: tSegments, vertices } = cymaticReport.reader_surface;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    for (const vertex of vertices) {
      const [x, y, z] = readerVertexPosition(vertex);
      positions.push(x, y, z);
      const lift = Math.max(0.22, Math.min(1, vertex.intensity + 0.24));
      colors.push(vertex.r * lift, vertex.g * lift, vertex.b * lift);
    }

    for (let t = 0; t < tSegments - 1; t += 1) {
      for (let x = 0; x < xSegments - 1; x += 1) {
        const a = t * xSegments + x;
        const b = a + 1;
        const c = a + xSegments;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    buffer.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    buffer.setIndex(indices);
    buffer.computeVertexNormals();
    buffer.computeBoundingSphere();
    return buffer;
  }, [cymaticReport]);

  if (!geometry) {
    return null;
  }

  return (
    <group>
      <mesh geometry={geometry} position={[0, -0.05, 0]}>
        <meshStandardMaterial
          vertexColors
          transparent
          opacity={0.72}
          roughness={0.24}
          metalness={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[6.55, 0.045, 5.95]} />
        <meshPhysicalMaterial
          color="#dff5ff"
          transparent
          opacity={0.14}
          roughness={0.02}
          metalness={0.0}
          transmission={0.42}
          thickness={0.08}
          clearcoat={0.8}
        />
      </mesh>
    </group>
  );
}

function ReaderSliceLines({ cymaticReport }: { cymaticReport: HfieldCymaticReaderSurfaceReport | null }) {
  const lines = useMemo(() => {
    if (!cymaticReport) {
      return [];
    }
    const xSegments = cymaticReport.reader_surface.x_segments;
    const tSegments = cymaticReport.reader_surface.t_segments;
    const vertices = cymaticReport.reader_surface.vertices;
    const selectedRows = [0, Math.floor(tSegments * 0.25), Math.floor(tSegments * 0.5), Math.floor(tSegments * 0.75), tSegments - 1];
    return selectedRows.map((row) => {
      const points: Array<[number, number, number]> = [];
      for (let x = 0; x < xSegments; x += 1) {
        const vertex = vertices[row * xSegments + x];
        if (vertex) {
          const [px, py, pz] = readerVertexPosition(vertex);
          points.push([px, py + 0.025, pz]);
        }
      }
      return {
        row,
        points,
        color: cymaticReport.interference_slices[row]?.color_hex ?? "#f6f1c8"
      };
    });
  }, [cymaticReport]);

  return (
    <group>
      {lines.map((line) => (
        <Line key={`reader-slice-${line.row}`} points={line.points} color={line.color} lineWidth={2} transparent opacity={0.72} />
      ))}
    </group>
  );
}

function AmbientCymaticPoints({ cymaticReport }: { cymaticReport: HfieldCymaticReaderSurfaceReport | null }) {
  const geometry = useMemo(() => {
    if (!cymaticReport) {
      return null;
    }

    const positions: number[] = [];
    const colors: number[] = [];
    for (const point of cymaticReport.ambient_field_points) {
      positions.push(point.x * 2.6, point.y * 1.65, point.z * 2.9);
      const color = new THREE.Color(point.color_hex);
      const intensity = Math.max(0.25, point.amplitude);
      colors.push(color.r * intensity, color.g * intensity, color.b * intensity);
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    buffer.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    buffer.computeBoundingSphere();
    return buffer;
  }, [cymaticReport]);

  if (!geometry) {
    return null;
  }

  return (
    <points geometry={geometry}>
      <pointsMaterial size={0.075} vertexColors transparent opacity={0.84} depthWrite={false} />
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
        <Line points={tracePositions} color="#f5f0bd" lineWidth={2} transparent opacity={0.52} />
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
      <meshBasicMaterial color="#ffffff" transparent opacity={0.08} depthWrite={false} />
    </mesh>
  );
}

function PhaseFieldScene({ report, cymaticReport, playheadReport, isPlaying }: SceneProps) {
  const group = useRef<Group | null>(null);

  useFrame((_, delta) => {
    if (group.current && isPlaying) {
      group.current.rotation.y += delta * 0.018;
    }
  });

  return (
    <>
      <ambientLight intensity={0.42} />
      <directionalLight position={[3, 4, 5]} intensity={1.1} />
      <pointLight position={[-3, -2, 4]} intensity={0.75} color="#54d6ff" />
      <pointLight position={[3, 2, -4]} intensity={0.45} color="#ffb23f" />
      <group ref={group}>
        <GlassReaderSurfaceMesh cymaticReport={cymaticReport} />
        <ReaderSliceLines cymaticReport={cymaticReport} />
        <AmbientCymaticPoints cymaticReport={cymaticReport} />
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
  const [cymaticReport, setCymaticReport] = useState<HfieldCymaticReaderSurfaceReport | null>(null);
  const [readerError, setReaderError] = useState<string | null>(null);
  const anchors = report?.anchors;
  const currentPhase = playheadReport?.active_notes[0]?.resonance_lane ?? playheadReport?.active_gesture_id ?? "waiting";

  async function refreshCymaticReader() {
    setReaderError(null);
    try {
      setCymaticReport(await getCurrentHfieldCymaticReaderSurfaceReport());
    } catch (err) {
      setReaderError(err instanceof Error ? err.message : String(err));
    }
  }

  async function handleRefresh() {
    await onRefresh();
    await refreshCymaticReader();
  }

  useEffect(() => {
    if (report) {
      void refreshCymaticReader();
    }
  }, [report?.deterministic_field_hash]);

  return (
    <section className="phase-field-viewport-card cymatic-reader-card" aria-label="HFIELD 3D cymatic reader viewport">
      <div className="phase-field-header">
        <div>
          <p className="eyebrow">.hfield Cymatic Reader</p>
          <h3>Glass Reader Plane and Frequency Surface</h3>
          <p className="note">The transparent reader plane is the cymatics reader. Multiple tones are rendered as spatial interference across the glass surface; surrounding markers remain the packet's phase field.</p>
        </div>
        <div className="button-row compact-row">
          <button onClick={handleRefresh} type="button">Refresh Reader</button>
          <button onClick={onPlay} type="button">Play</button>
          <button className="danger" onClick={onStop} type="button">Stop</button>
        </div>
      </div>

      <div className="phase-field-viewport-shell cymatic-reader-shell">
        {report ? (
          <Canvas camera={{ position: [4.8, 3.0, 7.4], fov: 47 }} dpr={[1, 2]}>
            <color attach="background" args={["#05070c"]} />
            <fog attach="fog" args={["#05070c", 7, 16]} />
            <PhaseFieldScene report={report} cymaticReport={cymaticReport} playheadReport={playheadReport} isPlaying={isPlaying} />
          </Canvas>
        ) : (
          <div className="phase-field-empty-state">
            <h4>No field report loaded</h4>
            <p>Load or map a project, then refresh the field to synthesize the 9 phase .hfield packet view.</p>
            <button onClick={handleRefresh} type="button">Synthesize Reader</button>
          </div>
        )}
      </div>

      {readerError && <div className="status-banner warning">Cymatic reader refresh failed: {readerError}</div>}

      <div className="phase-field-readout-grid cymatic-reader-readout-grid">
        <section>
          <strong>Reader</strong>
          <span>{cymaticReport?.glass_reader.label ?? "Glass Reader Plane"}</span>
        </section>
        <section>
          <strong>Phase Order</strong>
          <span>{report?.phase_grid_rows.map((row) => row.join("-" )).join(" / ") ?? "2-1-3 / 4-5-6 / 7-9-8"}</span>
        </section>
        <section>
          <strong>Anchors</strong>
          <span>{anchors ? `1:${anchors.center_1.role} · 5:${anchors.lower_5.role} · 9:${anchors.upper_9.role}` : "1 center · 5 lower · 9 upper"}</span>
        </section>
        <section>
          <strong>Surface</strong>
          <span>{cymaticReport ? `${cymaticReport.reader_surface.vertex_count} vertices · ${cymaticReport.reader_surface.triangle_count} triangles` : "not synthesized"}</span>
        </section>
        <section>
          <strong>Polyphony</strong>
          <span>{cymaticReport ? `${cymaticReport.reader_surface.polyphonic_interference_count} active overlap slices` : "—"}</span>
        </section>
        <section>
          <strong>Color Profile</strong>
          <span>{cymaticReport?.color_profile_id ?? "hcs_canonical_phase_frequency_color_v1"}</span>
        </section>
        <section>
          <strong>Current</strong>
          <span>{currentPhase}</span>
        </section>
        <section>
          <strong>Reader Hash</strong>
          <span>{cymaticReport?.deterministic_reader_hash.slice(0, 18) ?? "not sealed"}</span>
        </section>
        <section>
          <strong>Status</strong>
          <span>{cymaticReport?.status ?? report?.status ?? "not synthesized"}</span>
        </section>
      </div>
    </section>
  );
}

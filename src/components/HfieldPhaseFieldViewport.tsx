import { Canvas, useFrame } from "@react-three/fiber";
import { Line, OrbitControls } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Group } from "three";
import {
  getCurrentHfieldCymaticReaderSurfaceReport,
  getCurrentHfieldRuntimeCarrierPacketReport,
  type HfieldCymaticReaderSurfaceReport,
  type HfieldFieldSynthesisReport,
  type HfieldRuntimeCarrierPacketReport,
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
  fieldReport: HfieldFieldSynthesisReport;
  cymaticReport: HfieldCymaticReaderSurfaceReport | null;
  carrierReport: HfieldRuntimeCarrierPacketReport | null;
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

function readerVertexPosition(vertex: HfieldCymaticReaderSurfaceReport["reader_surface"]["vertices"][number]): [number, number, number] {
  return [vertex.x_norm * 3.2, vertex.displacement * 0.72, vertex.time_norm * 5.8 - 2.9];
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
      const color = new THREE.Color(vertex.color_hex);
      const lift = Math.max(0.16, Math.min(0.86, vertex.intensity + 0.18));
      colors.push(color.r * lift, color.g * lift, color.b * lift);
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
        <meshStandardMaterial vertexColors transparent opacity={0.42} roughness={0.28} metalness={0.02} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.08, 0]}>
        <boxGeometry args={[6.65, 0.035, 5.95]} />
        <meshStandardMaterial color="#dff5ff" transparent opacity={0.13} roughness={0.08} metalness={0.0} />
      </mesh>
    </group>
  );
}

function RootCarrierWave({ carrierReport }: { carrierReport: HfieldRuntimeCarrierPacketReport | null }) {
  const points = useMemo(() => {
    const frequency = carrierReport?.identity_carrier.frequency_hz ?? 0;
    const root = carrierReport?.phase_root_frequency_hz ?? 144;
    const phaseOffset = frequency > 0 ? (frequency / Math.max(root, 1)) * Math.PI * 0.25 : 0;
    const result: Array<[number, number, number]> = [];
    for (let i = 0; i < 140; i += 1) {
      const norm = i / 139;
      const z = norm * 5.8 - 2.9;
      const x = -3.42;
      const y = Math.sin(norm * Math.PI * 8 + phaseOffset) * 0.11 + 0.08;
      result.push([x, y, z]);
    }
    return result;
  }, [carrierReport]);

  return <Line points={points} color={carrierReport?.identity_carrier.color_hex ?? "#f6f1c8"} lineWidth={2.2} transparent opacity={0.92} />;
}

function RuntimePathRails({ carrierReport }: { carrierReport: HfieldRuntimeCarrierPacketReport | null }) {
  const rails = useMemo(() => {
    if (!carrierReport) {
      return [];
    }
    return carrierReport.runtime_paths.slice(0, 5).map((path, index) => {
      const x = -2.6 + index * 1.3;
      const y = -0.18 - index * 0.012;
      return {
        key: path.path_id,
        color: path.color_hex,
        points: [
          [x, y, -2.9] as [number, number, number],
          [x, y, 2.9] as [number, number, number]
        ]
      };
    });
  }, [carrierReport]);

  return (
    <group>
      {rails.map((rail) => (
        <Line key={rail.key} points={rail.points} color={rail.color} lineWidth={1.0} transparent opacity={0.28} />
      ))}
    </group>
  );
}

function CarrierRippleRings({ carrierReport }: { carrierReport: HfieldRuntimeCarrierPacketReport | null }) {
  if (!carrierReport) {
    return null;
  }

  const visibleRipples = carrierReport.information_ripples.slice(0, 36);
  return (
    <group>
      {visibleRipples.map((ripple) => {
        const x = ripple.surface_x_norm * 3.1;
        const z = ripple.time_norm * 5.8 - 2.9;
        const y = ripple.ripple_kind === "global_carrier_ripple" ? 0.11 : 0.05 + ripple.amplitude * 0.12;
        const radius = ripple.ripple_kind === "global_carrier_ripple" ? 0.58 : Math.max(0.16, ripple.surface_radius_norm * 1.2);
        const opacity = ripple.ripple_kind === "global_carrier_ripple" ? 0.78 : Math.max(0.34, ripple.amplitude * 0.74);
        return (
          <mesh key={ripple.ripple_index} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius * 0.92, radius, 96]} />
            <meshBasicMaterial color={ripple.color_hex} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

function CarrierTimeScanLines({ carrierReport }: { carrierReport: HfieldRuntimeCarrierPacketReport | null }) {
  if (!carrierReport) {
    return null;
  }

  return (
    <group>
      {carrierReport.time_slices
        .filter((slice) => slice.active_ripple_count > 0)
        .slice(0, 18)
        .map((slice) => {
          const z = slice.time_norm * 5.8 - 2.9;
          const y = 0.016 + slice.composite_amplitude * 0.1;
          return (
            <Line
              key={slice.slice_index}
              points={[
                [-3.25, y, z],
                [3.25, y, z]
              ]}
              color={slice.dominant_color_hex}
              lineWidth={1.1 + slice.composite_amplitude * 2.2}
              transparent
              opacity={0.24 + slice.composite_amplitude * 0.38}
            />
          );
        })}
    </group>
  );
}

function PlayheadPlane({ playheadReport }: { playheadReport: PlayheadCursorReport | null }) {
  const percent = Math.max(0, Math.min(100, playheadReport?.score_cursor_x_percent ?? 0));
  const z = (percent / 100) * 5.8 - 2.9;
  return (
    <group position={[0, 0, z]}>
      <mesh>
        <boxGeometry args={[6.75, 0.025, 0.025]} />
        <meshBasicMaterial color="#f7f0bd" transparent opacity={0.84} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[6.75, 0.01, 0.01]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.48} />
      </mesh>
    </group>
  );
}

function AnchorMarkers({ fieldReport }: { fieldReport: HfieldFieldSynthesisReport }) {
  const anchors = [fieldReport.anchors.center_1, fieldReport.anchors.lower_5, fieldReport.anchors.upper_9];
  return (
    <group>
      {anchors.map((anchor) => {
        const x = anchor.phase === 1 ? 0 : anchor.phase === 5 ? -3.62 : 3.62;
        const y = anchor.phase === 1 ? 0.36 : anchor.phase === 5 ? -0.16 : 0.74;
        return (
          <mesh key={anchor.phase} position={[x, y, 0]}>
            <sphereGeometry args={[anchor.phase === 1 ? 0.13 : 0.11, 32, 16]} />
            <meshStandardMaterial color={phaseColor(anchor.phase)} emissive={phaseColor(anchor.phase)} emissiveIntensity={0.32} transparent opacity={0.9} />
          </mesh>
        );
      })}
    </group>
  );
}

function RuntimeCarrierScene({ fieldReport, cymaticReport, carrierReport, playheadReport, isPlaying }: SceneProps) {
  const groupRef = useRef<Group | null>(null);

  useFrame((_, delta) => {
    if (groupRef.current && isPlaying) {
      groupRef.current.rotation.y += delta * 0.025;
    }
  });

  return (
    <>
      <ambientLight intensity={0.42} />
      <directionalLight position={[4, 6, 4]} intensity={1.25} />
      <pointLight position={[-3, 3, -2]} intensity={0.5} color="#54d6ff" />
      <pointLight position={[3, 2, 2]} intensity={0.45} color="#ffb23f" />
      <group ref={groupRef} rotation={[-0.22, 0.08, 0]}>
        <GridPlane />
        <GlassReaderSurfaceMesh cymaticReport={cymaticReport} />
        <RootCarrierWave carrierReport={carrierReport} />
        <RuntimePathRails carrierReport={carrierReport} />
        <CarrierTimeScanLines carrierReport={carrierReport} />
        <CarrierRippleRings carrierReport={carrierReport} />
        <AnchorMarkers fieldReport={fieldReport} />
        <PlayheadPlane playheadReport={playheadReport} />
      </group>
      <OrbitControls enablePan enableZoom enableRotate autoRotate={false} minDistance={4.5} maxDistance={11} />
    </>
  );
}

function GridPlane() {
  return (
    <group position={[0, -0.16, 0]}>
      {[-3, -2, -1, 0, 1, 2, 3].map((x) => (
        <Line key={`x-${x}`} points={[[x, 0, -2.95], [x, 0, 2.95]]} color="#304050" lineWidth={0.6} transparent opacity={0.28} />
      ))}
      {[-2, -1, 0, 1, 2].map((z) => (
        <Line key={`z-${z}`} points={[[-3.35, 0, z], [3.35, 0, z]]} color="#304050" lineWidth={0.6} transparent opacity={0.28} />
      ))}
    </group>
  );
}

export default function HfieldPhaseFieldViewport({ report, playheadReport, isPlaying, onRefresh, onPlay, onStop }: ViewportProps) {
  const [cymaticReport, setCymaticReport] = useState<HfieldCymaticReaderSurfaceReport | null>(null);
  const [carrierReport, setCarrierReport] = useState<HfieldRuntimeCarrierPacketReport | null>(null);
  const [readerError, setReaderError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setReaderError(null);

    Promise.all([getCurrentHfieldCymaticReaderSurfaceReport(), getCurrentHfieldRuntimeCarrierPacketReport()])
      .then(([nextCymaticReport, nextCarrierReport]) => {
        if (!mounted) {
          return;
        }
        setCymaticReport(nextCymaticReport);
        setCarrierReport(nextCarrierReport);
      })
      .catch((error: unknown) => {
        if (!mounted) {
          return;
        }
        setReaderError(error instanceof Error ? error.message : String(error));
      });

    return () => {
      mounted = false;
    };
  }, [report?.deterministic_field_hash]);

  if (!report) {
    return (
      <section className="panel field-viewport-panel">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">.hfield carrier reader</p>
            <h3>Runtime Carrier Cymatic Reader</h3>
            <p className="panel-subtitle">Synthesize the field first. The carrier reader needs a real .hfield packet.</p>
          </div>
          <button type="button" className="btn" onClick={onRefresh}>Refresh Reader</button>
        </div>
      </section>
    );
  }

  return (
    <section className="panel field-viewport-panel carrier-reader-panel">
      <div className="section-heading-row">
        <div>
          <p className="eyebrow">.hfield runtime carrier reader</p>
          <h3>Glass Reader Plane and Runtime Carrier Cymatics</h3>
          <p className="panel-subtitle">
            The glass plane is the reader. The file identity carrier is derived from the packet identity, while runtime path carriers and played note payloads create the ripples through time.
          </p>
        </div>
        <div className="toolbar-row">
          <button type="button" className="btn" onClick={onRefresh}>Refresh Reader</button>
          <button type="button" className="btn" onClick={onPlay}>Play</button>
          <button type="button" className="btn btn-danger" onClick={onStop}>Stop</button>
        </div>
      </div>

      <div className="field-canvas-shell carrier-reader-canvas-shell">
        <Canvas camera={{ position: [0, 3.3, 7.2], fov: 48 }} dpr={[1, 1.5]} gl={{ antialias: true }}>
          <RuntimeCarrierScene fieldReport={report} cymaticReport={cymaticReport} carrierReport={carrierReport} playheadReport={playheadReport} isPlaying={isPlaying} />
        </Canvas>
      </div>

      {readerError ? <p className="error-text">{readerError}</p> : null}

      <div className="field-summary-grid carrier-summary-grid">
        <div className="mini-stat"><span>reader</span><strong>glass plane</strong></div>
        <div className="mini-stat"><span>file carrier</span><strong>{carrierReport ? `${carrierReport.identity_carrier.frequency_hz.toFixed(1)} Hz` : "—"}</strong></div>
        <div className="mini-stat"><span>operating field</span><strong>{carrierReport?.operating_field.key_signature_proxy ?? "—"}</strong></div>
        <div className="mini-stat"><span>runtime paths</span><strong>{carrierReport?.runtime_paths.length ?? 0}</strong></div>
        <div className="mini-stat"><span>ripples</span><strong>{carrierReport?.information_ripples.length ?? 0}</strong></div>
        <div className="mini-stat"><span>surface</span><strong>{cymaticReport ? `${cymaticReport.reader_surface.vertex_count} vertices` : "—"}</strong></div>
        <div className="mini-stat"><span>meaning</span><strong>{carrierReport?.readable_packet_model ?? "waiting"}</strong></div>
        <div className="mini-stat"><span>hash</span><strong>{carrierReport?.deterministic_carrier_hash.slice(0, 18) ?? cymaticReport?.deterministic_reader_hash.slice(0, 18) ?? "—"}</strong></div>
      </div>
    </section>
  );
}

import { Line, OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { HcsComposerWaveformEditorTrueSoundBodyV1Report, HcsWaveformTo3DFieldBodyV1Report, HfieldCymaticReaderSurfaceReport, HfieldFieldSynthesisReport, HfieldRuntimeCarrierPacketReport, HfieldRustRenderManifestReport, PlayheadCursorReport } from "../bridge/tauriCommands";

export type HfieldVolumetricPacketFieldProps = {
  fieldReport?: HfieldFieldSynthesisReport | null;
  cymaticReport?: HfieldCymaticReaderSurfaceReport | null;
  carrierReport?: HfieldRuntimeCarrierPacketReport | null;
  renderManifest?: HfieldRustRenderManifestReport | null;
  waveformBodyReport?: HcsWaveformTo3DFieldBodyV1Report | null;
  waveformEditorReport?: HcsComposerWaveformEditorTrueSoundBodyV1Report | null;
  playheadReport?: PlayheadCursorReport | null;
  isPlaying?: boolean;
  readerMode?: "production" | "inspection";
  cameraPresetId?: string;
};

type ManifestBody = HfieldRustRenderManifestReport["field_bodies"][number];
type ManifestBridge = HfieldRustRenderManifestReport["bridge_bodies"][number];
type ManifestReferenceLine = HfieldRustRenderManifestReport["reference_lines"][number];
type ManifestReferencePoint = HfieldRustRenderManifestReport["reference_points"][number];
type NativeWaveformTrackBody = HcsWaveformTo3DFieldBodyV1Report["waveform_bodies"][number];
type NativeWaveformEnvelopePoint = NativeWaveformTrackBody["envelope_points"][number];
type TrueSoundBodyTrackLane = HcsComposerWaveformEditorTrueSoundBodyV1Report["track_lanes"][number];
type TrueSoundBodyNoteSegment = TrueSoundBodyTrackLane["note_segments"][number];
type TrueSoundBodyPoint = TrueSoundBodyNoteSegment["waveform_points"][number];
type FieldHarmonicEvent = HfieldFieldSynthesisReport["harmonic_events"][number];
type FieldTracePoint = HfieldFieldSynthesisReport["field_trace"][number];
type CarrierRipple = HfieldRuntimeCarrierPacketReport["information_ripples"][number];
type CarrierTimeSlice = HfieldRuntimeCarrierPacketReport["time_slices"][number];
type RuntimePath = HfieldRuntimeCarrierPacketReport["runtime_paths"][number];

const HCS_GLASS_READER_NATIVE_WAVEFORM_BODY_INTEGRATION_V1 = "HCS_GLASS_READER_NATIVE_WAVEFORM_BODY_INTEGRATION_V1";
const HCS_WAVEFORM_TO_3D_FIELD_BODY_V1_CONTRACT_ID = "aiweb.hfield.waveform_to_3d_field_body.v1";
const HCS_SCORE_SPINE_CONDUCTOR_GLASS_READER_SYNC_V1 = "HCS_SCORE_SPINE_CONDUCTOR_GLASS_READER_SYNC_V1";
const HCS_GLASS_READER_PRODUCTION_SCENE_COMPOSER_V1 = "HCS_GLASS_READER_PRODUCTION_SCENE_COMPOSER_V1";
const HCS_COMPOSER_WAVEFORM_EDITOR_TRUE_SOUND_BODY_V1 = "HCS_COMPOSER_WAVEFORM_EDITOR_TRUE_SOUND_BODY_V1";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function collectRecords(value: unknown, output: Record<string, unknown>[] = [], depth = 0): Record<string, unknown>[] {
  if (depth > 6 || output.length > 120) {
    return output;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectRecords(item, output, depth + 1);
    }

    return output;
  }

  if (isRecord(value)) {
    output.push(value);

    for (const child of Object.values(value)) {
      collectRecords(child, output, depth + 1);
    }
  }

  return output;
}

function firstNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const exact = readNumber(record[key]);
    if (exact !== null) {
      return exact;
    }
  }

  for (const [key, value] of Object.entries(record)) {
    const lowered = key.toLowerCase();

    if (keys.some((candidate) => lowered.includes(candidate.toLowerCase()))) {
      const parsed = readNumber(value);
      if (parsed !== null) {
        return parsed;
      }
    }
  }

  return null;
}

function currentPlayheadProgress(playheadReport: PlayheadCursorReport | null | undefined): number | null {
  const records = collectRecords(playheadReport);
  const record = records[0];

  if (!record) {
    return null;
  }

  const percent = firstNumber(record, ["score_cursor_x_percent", "score_cursor_percent", "progress_percent", "percent"]);
  if (percent !== null) {
    return Math.max(0, Math.min(1, percent > 1 ? percent / 100 : percent));
  }

  const now = firstNumber(record, ["current_time_ms", "current_ms", "time_ms"]);
  const duration = firstNumber(record, ["total_duration_ms", "duration_ms", "duration"]);

  if (now !== null && duration !== null && duration > 0) {
    return Math.max(0, Math.min(1, now / duration));
  }

  return null;
}

function setOpacityOnGroup(group: THREE.Group | null, opacity: number): void {
  if (!group) {
    return;
  }

  group.traverse((object) => {
    const material = (object as THREE.Mesh).material;

    if (!material) {
      return;
    }

    const materials = Array.isArray(material) ? material : [material];

    for (const item of materials) {
      item.transparent = true;
      item.opacity = opacity;
      item.needsUpdate = true;
    }
  });
}

function bodyOpacity(body: ManifestBody): number {
  if (body.layer_key === "file_identity_carrier") {
    return 0.24;
  }

  if (body.layer_key === "runtime_path_carrier") {
    return 0.21;
  }

  return 0.28;
}

function bodyWireOpacity(body: ManifestBody): number {
  if (body.layer_key === "file_identity_carrier") {
    return 0.54;
  }

  if (body.layer_key === "runtime_path_carrier") {
    return 0.42;
  }

  return 0.5;
}

function activationForScan(body: ManifestBody, scanZ: number): number {
  const start = Math.min(body.z_start, body.z_end);
  const end = Math.max(body.z_start, body.z_end);
  const feather = Math.max(0.1, Math.min(0.38, body.z_body_length * 0.24));

  if (scanZ < start - feather || scanZ > end + feather) {
    return 0;
  }

  if (scanZ >= start && scanZ <= end) {
    const edgeDistance = Math.min(scanZ - start, end - scanZ);
    return Math.max(0.38, Math.min(1, 0.38 + edgeDistance / feather));
  }

  if (scanZ < start) {
    return Math.max(0, 1 - (start - scanZ) / feather) * 0.38;
  }

  return Math.max(0, 1 - (scanZ - end) / feather) * 0.38;
}

function ReaderGrid({ width, scanMinZ, scanMaxZ }: { width: number; scanMinZ: number; scanMaxZ: number }) {
  const gridLines = useMemo(() => {
    const lines: Array<{ id: string; x1: number; x2: number; z1: number; z2: number; opacity: number }> = [];
    const xMin = -width / 2;
    const xMax = width / 2;
    const scanDepth = scanMaxZ - scanMinZ;

    for (let index = 0; index <= 12; index += 1) {
      const x = xMin + (index / 12) * width;
      lines.push({ id: `x-${index}`, x1: x, x2: x, z1: scanMinZ, z2: scanMaxZ, opacity: index === 6 ? 0.3 : 0.13 });
    }

    for (let index = 0; index <= 16; index += 1) {
      const z = scanMinZ + (index / 16) * scanDepth;
      lines.push({ id: `z-${index}`, x1: xMin, x2: xMax, z1: z, z2: z, opacity: index % 4 === 0 ? 0.22 : 0.1 });
    }

    return lines;
  }, [scanMaxZ, scanMinZ, width]);

  return (
    <group position={[0, -0.03, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[width + 0.95, scanMaxZ - scanMinZ + 0.75, 1, 1]} />
        <meshStandardMaterial color="#061017" transparent opacity={0.36} roughness={0.62} metalness={0.05} side={THREE.DoubleSide} />
      </mesh>

      {gridLines.map((line) => {
        const dx = line.x2 - line.x1;
        const dz = line.z2 - line.z1;
        const length = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);

        return (
          <mesh
            key={line.id}
            position={[(line.x1 + line.x2) / 2, 0.012, (line.z1 + line.z2) / 2]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[length, 0.006, 0.012]} />
            <meshBasicMaterial color="#c9f9ff" transparent opacity={line.opacity} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}


function ReferenceLineMesh({ line }: { line: ManifestReferenceLine }) {
  const points = useMemo(
    () => line.points.map((point) => [point.x, point.y, point.z] as [number, number, number]),
    [line.points],
  );

  return (
    <Line
      points={points}
      color={line.color_hex}
      lineWidth={line.width}
      transparent
      opacity={line.opacity}
    />
  );
}

function ReferencePointMesh({ point }: { point: ManifestReferencePoint }) {
  const isAnchor = point.point_role === "phase_anchor_reference";

  return (
    <group position={[point.x, point.y, point.z]}>
      <mesh>
        <sphereGeometry args={[point.radius, 18, 12]} />
        <meshStandardMaterial
          color={point.color_hex}
          emissive={point.color_hex}
          emissiveIntensity={isAnchor ? 0.34 : 0.18}
          transparent
          opacity={isAnchor ? 0.92 : 0.74}
          roughness={0.32}
          metalness={0.04}
          depthWrite={false}
        />
      </mesh>

      {isAnchor ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[point.radius * 1.72, 0.01, 8, 72]} />
          <meshBasicMaterial color={point.color_hex} transparent opacity={0.62} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
}


function waveformTrackBodyMap(report?: HcsWaveformTo3DFieldBodyV1Report | null): Map<string, NativeWaveformTrackBody> {
  const map = new Map<string, NativeWaveformTrackBody>();

  if (!report || report.contract_id !== HCS_WAVEFORM_TO_3D_FIELD_BODY_V1_CONTRACT_ID) {
    return map;
  }

  for (const waveformBody of report.waveform_bodies) {
    if (waveformBody.track_id) {
      map.set(waveformBody.track_id, waveformBody);
    }
  }

  return map;
}

function clampUnit(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function nativeEnvelopePoints(waveformBody: NativeWaveformTrackBody | null): NativeWaveformEnvelopePoint[] {
  const points = waveformBody?.envelope_points ?? [];

  if (points.length >= 2) {
    return [...points].sort((a, b) => a.t_norm - b.t_norm);
  }

  return [
    { sample_index: 0, t_norm: 0, time_ms: 0, amplitude: 0.38, radius: 0.1, surface_x: 0, surface_y: 0, surface_z: 0 },
    { sample_index: 1, t_norm: 1, time_ms: waveformBody?.duration_ms ?? 1, amplitude: 0.38, radius: 0.1, surface_x: 1, surface_y: 0, surface_z: 0 }
  ];
}

function envelopeAmplitudeAt(points: NativeWaveformEnvelopePoint[], tNorm: number): number {
  const t = clampUnit(tNorm);

  if (points.length === 0) {
    return 0.35;
  }

  if (t <= points[0].t_norm) {
    return clampUnit(points[0].amplitude);
  }

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    if (t <= current.t_norm) {
      const span = Math.max(0.0001, current.t_norm - previous.t_norm);
      const local = clampUnit((t - previous.t_norm) / span);
      return clampUnit(THREE.MathUtils.lerp(previous.amplitude, current.amplitude, local));
    }
  }

  return clampUnit(points[points.length - 1].amplitude);
}

function nativeWaveformRoleLift(waveformBody: NativeWaveformTrackBody | null): number {
  const role = waveformBody?.role.toLowerCase() ?? "";

  if (role.includes("bass") || role.includes("root")) {
    return 1.16;
  }

  if (role.includes("lead") || role.includes("melody")) {
    return 1.08;
  }

  if (role.includes("pad") || role.includes("field")) {
    return 0.94;
  }

  return 1;
}

function createNativeWaveformBodyGeometry(body: ManifestBody, waveformBody: NativeWaveformTrackBody | null): THREE.BufferGeometry {
  const points = nativeEnvelopePoints(waveformBody);
  const longitudinalSegments = Math.max(14, Math.min(48, points.length * 2));
  const radialSegments = 20;
  const length = Math.max(0.08, Math.abs(body.z_body_length));
  const phase = waveformBody?.phase_index ?? 1;
  const roleLift = nativeWaveformRoleLift(waveformBody);
  const undulation = Math.max(0.012, Math.min(0.18, waveformBody?.body.undulation_depth ?? body.amplitude * 0.08));
  const peak = Math.max(body.amplitude, waveformBody?.peak_velocity ?? 0.0, waveformBody?.rms_energy ?? 0.0);
  const radiusBaseX = Math.max(0.035, body.radius_x * roleLift);
  const radiusBaseY = Math.max(0.035, body.radius_y * roleLift);
  const positions: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row <= longitudinalSegments; row += 1) {
    const t = row / longitudinalSegments;
    const z = -length / 2 + t * length;
    const envelope = envelopeAmplitudeAt(points, t);
    const attackDecay = Math.sin(Math.PI * t);
    const ripple = Math.sin(t * Math.PI * (4 + phase) + phase * 0.53) * undulation * attackDecay;
    const radiusScale = Math.max(0.32, 0.42 + envelope * 0.72 + peak * 0.18 + ripple);
    const radiusX = radiusBaseX * radiusScale;
    const radiusY = radiusBaseY * Math.max(0.34, radiusScale * (0.82 + envelope * 0.22));

    for (let column = 0; column < radialSegments; column += 1) {
      const angle = (column / radialSegments) * Math.PI * 2;
      const ringRipple = 1 + Math.sin(angle * 3 + t * Math.PI * 2 + phase) * undulation * 0.22;
      positions.push(Math.cos(angle) * radiusX * ringRipple, Math.sin(angle) * radiusY * ringRipple, z);
    }
  }

  for (let row = 0; row < longitudinalSegments; row += 1) {
    for (let column = 0; column < radialSegments; column += 1) {
      const current = row * radialSegments + column;
      const next = row * radialSegments + ((column + 1) % radialSegments);
      const above = (row + 1) * radialSegments + column;
      const aboveNext = (row + 1) * radialSegments + ((column + 1) % radialSegments);
      indices.push(current, above, next, next, above, aboveNext);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.userData = {
    contract_id: HCS_WAVEFORM_TO_3D_FIELD_BODY_V1_CONTRACT_ID,
    patch_id: HCS_GLASS_READER_NATIVE_WAVEFORM_BODY_INTEGRATION_V1,
    source_track_id: body.track_id,
    generated_from_waveform_envelope: true,
    not_random_bubble: true
  };
  return geometry;
}

function NativeWaveformBodyMesh({ body, waveformBody, active }: { body: ManifestBody; waveformBody: NativeWaveformTrackBody | null; active: boolean }) {
  const geometry = useMemo(() => createNativeWaveformBodyGeometry(body, waveformBody), [body, waveformBody]);
  const peak = Math.max(body.amplitude, waveformBody?.peak_velocity ?? 0, waveformBody?.rms_energy ?? 0);
  const opacity = Math.max(bodyOpacity(body), Math.min(0.78, 0.22 + peak * 0.42 + (active ? 0.18 : 0)));
  const activeScale: [number, number, number] = active ? [1.08, 1.08, 1.045] : [1, 1, 1];

  return (
    <group position={[body.x, body.y, body.z_center]} scale={activeScale} userData={{ sync_contract: HCS_SCORE_SPINE_CONDUCTOR_GLASS_READER_SYNC_V1, active_from_playhead: active }}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={body.color_hex}
          transparent
          opacity={opacity}
          roughness={0.2}
          metalness={0.1}
          emissive={body.color_hex}
          emissiveIntensity={0.18 + peak * 0.18 + (active ? 0.34 : 0)}
          depthWrite={false}
        />
      </mesh>

      <mesh geometry={geometry} scale={[1.035, 1.035, 1.008]}>
        <meshBasicMaterial color={body.color_hex} transparent opacity={Math.max(active ? 0.52 : 0.24, bodyWireOpacity(body))} wireframe depthWrite={false} />
      </mesh>

      {active ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[Math.max(body.radius_x, body.radius_y) * 1.42, 0.018, 10, 120]} />
          <meshBasicMaterial color="#fff7c9" transparent opacity={0.82} depthWrite={false} />
        </mesh>
      ) : null}
    </group>
  );
}

function ToneBodyMesh({ body, waveformBody, active }: { body: ManifestBody; waveformBody?: NativeWaveformTrackBody | null; active: boolean }) {
  if (body.layer_key === "payload_tone" && waveformBody) {
    return <NativeWaveformBodyMesh body={body} waveformBody={waveformBody} active={active} />;
  }

  const activeScale: [number, number, number] = active ? [1.07, 1.07, 1.04] : [1, 1, 1];

  return (
    <group position={[body.x, body.y, body.z_center]} scale={activeScale} userData={{ sync_contract: HCS_SCORE_SPINE_CONDUCTOR_GLASS_READER_SYNC_V1, active_from_playhead: active }}>
      <mesh scale={[body.radius_x, body.radius_y, Math.max(0.04, body.z_body_length / 2)]}>
        <sphereGeometry args={[1, 42, 24]} />
        <meshStandardMaterial
          color={body.color_hex}
          transparent
          opacity={Math.min(0.78, bodyOpacity(body) + (active ? 0.2 : 0))}
          roughness={0.25}
          metalness={0.08}
          emissive={body.color_hex}
          emissiveIntensity={(body.layer_key === "file_identity_carrier" ? 0.18 : 0.11) + (active ? 0.34 : 0)}
          depthWrite={false}
        />
      </mesh>

      <mesh scale={[body.radius_x * 1.04, body.radius_y * 1.04, Math.max(0.05, body.z_body_length / 2 + 0.012)]}>
        <sphereGeometry args={[1, 30, 18]} />
        <meshBasicMaterial color={body.color_hex} transparent opacity={bodyWireOpacity(body)} wireframe depthWrite={false} />
      </mesh>
    </group>
  );
}

function BridgeMesh({ bridge }: { bridge: ManifestBridge }) {
  return (
    <group position={[bridge.x, bridge.y, bridge.z_center]}>
      <mesh scale={[bridge.radius_x, bridge.radius_y, Math.max(0.04, bridge.z_body_length / 2)]}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshStandardMaterial
          color={bridge.color_a_hex}
          emissive={bridge.color_b_hex}
          emissiveIntensity={0.12 + bridge.blend_strength * 0.08}
          transparent
          opacity={0.2 + bridge.blend_strength * 0.14}
          roughness={0.42}
          metalness={0.03}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function SliceIntersection({ body }: { body: ManifestBody }) {
  const rings = [0.62, 0.88, 1.14, 1.4];

  return (
    <group>
      {rings.map((ratio, index) => (
        <mesh key={`${body.body_id}-ring-${ratio}`} scale={[ratio, ratio, ratio]}>
          <torusGeometry args={[body.radius_x * 0.86, 0.012 + index * 0.0025, 8, 112]} />
          <meshBasicMaterial color={body.color_hex} transparent opacity={0.66 - index * 0.12} depthWrite={false} />
        </mesh>
      ))}

      <mesh scale={[body.radius_x * 0.18, body.radius_x * 0.18, body.radius_x * 0.18]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color="#fff7c9" transparent opacity={0.88} depthWrite={false} />
      </mesh>
    </group>
  );
}

function playheadActiveSourceEntryIds(playheadReport: PlayheadCursorReport | null | undefined): Set<string> {
  const entries = new Set<string>();

  for (const note of playheadReport?.active_notes ?? []) {
    entries.add(`${note.track_id}:${note.note_name}:${note.start_ms}:${note.duration_ms}`);
  }

  return entries;
}

function isBodyActiveFromPlayhead(body: ManifestBody, activeSourceEntryIds: Set<string>): boolean {
  return activeSourceEntryIds.has(body.source_entry_id) || activeSourceEntryIds.has(`${body.track_id}:${body.note_name ?? ""}:${body.start_ms}:${body.duration_ms}`);
}

function eventActivationFromPlayhead(event: FieldHarmonicEvent, playheadReport: PlayheadCursorReport | null | undefined): number {
  const now = playheadReport?.current_time_ms ?? 0;
  const feather = Math.max(80, Math.min(260, event.duration_ms * 0.24));

  if (now >= event.start_ms && now <= event.end_ms) {
    const edge = Math.min(now - event.start_ms, event.end_ms - now);
    return Math.max(0.48, Math.min(1, 0.48 + edge / feather));
  }

  if (now < event.start_ms && event.start_ms - now <= feather) {
    return Math.max(0, 1 - (event.start_ms - now) / feather) * 0.42;
  }

  if (now > event.end_ms && now - event.end_ms <= feather) {
    return Math.max(0, 1 - (now - event.end_ms) / feather) * 0.32;
  }

  return 0;
}

function zFromTimeNorm(timeNorm: number, scanMinZ: number, scanMaxZ: number): number {
  return THREE.MathUtils.lerp(scanMinZ, scanMaxZ, clampUnit(timeNorm));
}

function eventScenePosition(event: FieldHarmonicEvent, scanMinZ: number, scanMaxZ: number): [number, number, number] {
  return [event.x, event.y + 0.18, zFromTimeNorm(event.time_norm_start, scanMinZ, scanMaxZ)];
}

function traceScenePosition(point: FieldTracePoint, scanMinZ: number, scanMaxZ: number): [number, number, number] {
  return [point.x, point.y + 0.16, zFromTimeNorm(point.time_norm, scanMinZ, scanMaxZ)];
}

function rippleScenePosition(ripple: CarrierRipple, fieldWidth: number, scanMinZ: number, scanMaxZ: number): [number, number, number] {
  const x = (clampUnit(ripple.surface_x_norm) - 0.5) * fieldWidth;
  const y = ripple.ripple_kind === "global_carrier_ripple" ? 0.2 : 0.08 + ripple.amplitude * 0.16;
  const z = zFromTimeNorm(ripple.time_norm, scanMinZ, scanMaxZ);
  return [x, y, z];
}

function GlassReaderSurfaceLayer({ cymaticReport, fieldWidth, scanMinZ, scanMaxZ }: { cymaticReport?: HfieldCymaticReaderSurfaceReport | null; fieldWidth: number; scanMinZ: number; scanMaxZ: number }) {
  const geometry = useMemo(() => {
    if (!cymaticReport) {
      return null;
    }

    const { x_segments: xSegments, t_segments: tSegments, vertices } = cymaticReport.reader_surface;
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    for (const vertex of vertices) {
      positions.push((clampUnit(vertex.x_norm) - 0.5) * fieldWidth, -0.065 + vertex.displacement * 0.62, zFromTimeNorm(vertex.time_norm, scanMinZ, scanMaxZ));
      const color = new THREE.Color(vertex.color_hex);
      const lift = Math.max(0.2, Math.min(0.92, vertex.intensity + 0.2));
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
    buffer.userData = { sync_contract: HCS_SCORE_SPINE_CONDUCTOR_GLASS_READER_SYNC_V1, source_contract: cymaticReport.cymatic_reader_contract_id };
    return buffer;
  }, [cymaticReport, fieldWidth, scanMaxZ, scanMinZ]);

  if (!geometry) {
    return null;
  }

  return (
    <group userData={{ sync_contract: HCS_SCORE_SPINE_CONDUCTOR_GLASS_READER_SYNC_V1, layer: "cymatic_reader_surface" }}>
      <mesh geometry={geometry}>
        <meshStandardMaterial vertexColors transparent opacity={0.34} roughness={0.2} metalness={0.04} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.09, (scanMinZ + scanMaxZ) / 2]}>
        <boxGeometry args={[fieldWidth + 0.78, 0.028, scanMaxZ - scanMinZ + 0.62]} />
        <meshStandardMaterial color="#dff5ff" transparent opacity={0.1} roughness={0.08} metalness={0.0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function RuntimePathRailsLayer({ carrierReport, fieldWidth, scanMinZ, scanMaxZ }: { carrierReport?: HfieldRuntimeCarrierPacketReport | null; fieldWidth: number; scanMinZ: number; scanMaxZ: number }) {
  const rails = useMemo(() => {
    const paths = carrierReport?.runtime_paths ?? [];
    const count = Math.max(1, paths.length);

    return paths.slice(0, 9).map((path: RuntimePath, index) => {
      const x = -fieldWidth / 2 + ((index + 1) / (count + 1)) * fieldWidth;
      const y = -0.025 + index * 0.018;
      return {
        key: path.path_id,
        color: path.color_hex,
        points: [
          [x, y, scanMinZ] as [number, number, number],
          [x, y, scanMaxZ] as [number, number, number]
        ]
      };
    });
  }, [carrierReport, fieldWidth, scanMaxZ, scanMinZ]);

  return (
    <group userData={{ sync_contract: HCS_SCORE_SPINE_CONDUCTOR_GLASS_READER_SYNC_V1, layer: "runtime_path_rails" }}>
      {rails.map((rail) => (
        <Line key={rail.key} points={rail.points} color={rail.color} lineWidth={1.15} transparent opacity={0.32} />
      ))}
    </group>
  );
}

function CarrierRippleLayer({ carrierReport, fieldWidth, scanMinZ, scanMaxZ }: { carrierReport?: HfieldRuntimeCarrierPacketReport | null; fieldWidth: number; scanMinZ: number; scanMaxZ: number }) {
  const ripples = carrierReport?.information_ripples.slice(0, 72) ?? [];

  return (
    <group userData={{ sync_contract: HCS_SCORE_SPINE_CONDUCTOR_GLASS_READER_SYNC_V1, layer: "runtime_carrier_ripples" }}>
      {ripples.map((ripple) => {
        const [x, y, z] = rippleScenePosition(ripple, fieldWidth, scanMinZ, scanMaxZ);
        const radius = ripple.ripple_kind === "global_carrier_ripple" ? 0.58 : Math.max(0.12, ripple.surface_radius_norm * 1.05);
        const opacity = ripple.ripple_kind === "global_carrier_ripple" ? 0.64 : Math.max(0.2, ripple.amplitude * 0.62);
        return (
          <mesh key={ripple.ripple_index} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[radius * 0.88, radius, 88]} />
            <meshBasicMaterial color={ripple.color_hex} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

function CarrierTimeSliceLayer({ carrierReport, fieldWidth, scanMinZ, scanMaxZ }: { carrierReport?: HfieldRuntimeCarrierPacketReport | null; fieldWidth: number; scanMinZ: number; scanMaxZ: number }) {
  const slices = carrierReport?.time_slices.filter((slice: CarrierTimeSlice) => slice.active_ripple_count > 0).slice(0, 28) ?? [];

  return (
    <group userData={{ sync_contract: HCS_SCORE_SPINE_CONDUCTOR_GLASS_READER_SYNC_V1, layer: "carrier_time_slices" }}>
      {slices.map((slice) => {
        const z = zFromTimeNorm(slice.time_norm, scanMinZ, scanMaxZ);
        const y = 0.018 + slice.composite_amplitude * 0.1;
        return (
          <Line
            key={slice.slice_index}
            points={[
              [-fieldWidth / 2, y, z],
              [fieldWidth / 2, y, z]
            ]}
            color={slice.dominant_color_hex}
            lineWidth={1.0 + slice.composite_amplitude * 2.1}
            transparent
            opacity={0.18 + slice.composite_amplitude * 0.34}
          />
        );
      })}
    </group>
  );
}

function FieldTraceLayer({ fieldReport, scanMinZ, scanMaxZ }: { fieldReport?: HfieldFieldSynthesisReport | null; scanMinZ: number; scanMaxZ: number }) {
  const traceSegments = useMemo(() => {
    const points = fieldReport?.field_trace ?? [];
    if (points.length < 2) {
      return [];
    }

    const byRegion = new Map<string, FieldTracePoint[]>();
    for (const point of points) {
      const key = point.field_region || `phase-${point.phase}`;
      byRegion.set(key, [...(byRegion.get(key) ?? []), point]);
    }

    return Array.from(byRegion.entries()).map(([key, regionPoints], index) => ({
      key,
      color: phaseColor(regionPoints[0]?.phase ?? index + 1),
      points: regionPoints
        .sort((a, b) => a.time_ms - b.time_ms)
        .map((point) => traceScenePosition(point, scanMinZ, scanMaxZ))
    }));
  }, [fieldReport, scanMaxZ, scanMinZ]);

  return (
    <group userData={{ sync_contract: HCS_SCORE_SPINE_CONDUCTOR_GLASS_READER_SYNC_V1, layer: "field_trace" }}>
      {traceSegments.map((segment) => (
        <Line key={segment.key} points={segment.points} color={segment.color} lineWidth={1.45} transparent opacity={0.36} />
      ))}
    </group>
  );
}

function FieldEventNodesLayer({ fieldReport, playheadReport, scanMinZ, scanMaxZ }: { fieldReport?: HfieldFieldSynthesisReport | null; playheadReport?: PlayheadCursorReport | null; scanMinZ: number; scanMaxZ: number }) {
  const events = fieldReport?.harmonic_events.slice(0, 96) ?? [];

  return (
    <group userData={{ sync_contract: HCS_SCORE_SPINE_CONDUCTOR_GLASS_READER_SYNC_V1, layer: "field_harmonic_events" }}>
      {events.map((event) => {
        const [x, y, z] = eventScenePosition(event, scanMinZ, scanMaxZ);
        const active = eventActivationFromPlayhead(event, playheadReport);
        const isGesture = event.event_kind === "gesture";
        const radius = (isGesture ? 0.075 : 0.045) + event.amplitude * 0.045 + active * 0.06;
        const color = phaseColor(event.phase);
        return (
          <group key={`${event.event_kind}-${event.source_track_id}-${event.event_index}-${event.start_ms}`} position={[x, y, z]}>
            <mesh rotation={isGesture ? [Math.PI / 4, Math.PI / 4, 0] : [0, 0, 0]}>
              {isGesture ? <octahedronGeometry args={[radius, 1]} /> : <sphereGeometry args={[radius, 18, 12]} />}
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.16 + active * 0.58}
                transparent
                opacity={isGesture ? 0.54 + active * 0.38 : 0.34 + active * 0.36}
                roughness={0.24}
                metalness={0.05}
                depthWrite={false}
              />
            </mesh>
            {isGesture && active > 0 ? (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[radius * (2.2 + active), 0.01, 8, 72]} />
                <meshBasicMaterial color="#fff7c9" transparent opacity={0.42 + active * 0.38} depthWrite={false} />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

function ActiveGestureInfluenceLayer({ fieldReport, playheadReport, scanMinZ, scanMaxZ }: { fieldReport?: HfieldFieldSynthesisReport | null; playheadReport?: PlayheadCursorReport | null; scanMinZ: number; scanMaxZ: number }) {
  const activeCue = playheadReport?.active_conductor_cue ?? null;
  const activeGestureId = playheadReport?.active_gesture_id ?? activeCue?.gesture_id ?? null;

  if (!fieldReport || !activeCue || !activeGestureId) {
    return null;
  }

  const candidates = fieldReport.harmonic_events.filter((event) => event.event_kind === "gesture" && (event.gesture_id === activeGestureId || event.event_index === activeCue.event_index));

  return (
    <group userData={{ sync_contract: HCS_SCORE_SPINE_CONDUCTOR_GLASS_READER_SYNC_V1, layer: "active_conductor_influence", active_gesture_id: activeGestureId }}>
      {candidates.slice(0, 4).map((event) => {
        const [x, y, z] = eventScenePosition(event, scanMinZ, scanMaxZ);
        const anchor = fieldReport.phase_nodes.find((node) => node.phase === event.anchor_phase) ?? fieldReport.anchors.center_1;
        const anchorPoint: [number, number, number] = [anchor.x, anchor.y + 0.34, z];
        const eventPoint: [number, number, number] = [x, y + 0.18, z];
        const color = phaseColor(event.phase);
        return (
          <group key={`active-gesture-${event.event_index}-${event.start_ms}`}>
            <Line points={[anchorPoint, eventPoint]} color={color} lineWidth={3.2} transparent opacity={0.72} />
            <mesh position={eventPoint}>
              <sphereGeometry args={[0.12 + event.amplitude * 0.08, 24, 16]} />
              <meshBasicMaterial color="#fff7c9" transparent opacity={0.88} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}



function trueSoundBodyLaneX(lane: TrueSoundBodyTrackLane, laneCount: number): number {
  const center = (laneCount - 1) / 2;
  return (lane.lane_index - center) * 0.86;
}

function trueSoundBodyPitchY(segment: TrueSoundBodyNoteSegment, lane: TrueSoundBodyTrackLane): number {
  const laneBase = 0.58 + lane.lane_index * 0.34;
  const pitchLift = (50 - segment.pitch_y_percent) / 100;
  return laneBase + pitchLift * 0.72;
}

function trueSoundBodyZ(timeMs: number, totalDurationMs: number, scanMinZ: number, scanMaxZ: number): number {
  const t = Math.max(0, Math.min(1, timeMs / Math.max(1, totalDurationMs)));
  return THREE.MathUtils.lerp(scanMinZ, scanMaxZ, t);
}

function createTrueSoundBodyGeometry(segment: TrueSoundBodyNoteSegment, lane: TrueSoundBodyTrackLane, laneCount: number, totalDurationMs: number, scanMinZ: number, scanMaxZ: number): THREE.BufferGeometry {
  const points: TrueSoundBodyPoint[] = segment.waveform_points.length >= 2 ? segment.waveform_points : [
    { point_index: 0, t_norm: 0, time_ms: segment.start_ms, signed_sample: 0, amplitude: 0, envelope: 0, upper_y: 0.5, lower_y: 0.5, radius: 0.08, local_thickness: 0.08, ring_phase: 0 },
    { point_index: 1, t_norm: 1, time_ms: segment.end_ms, signed_sample: 0, amplitude: 0, envelope: 0, upper_y: 0.5, lower_y: 0.5, radius: 0.08, local_thickness: 0.08, ring_phase: Math.PI }
  ];
  const radialSegments = 22;
  const positions: number[] = [];
  const indices: number[] = [];
  const laneX = trueSoundBodyLaneX(lane, laneCount);
  const pitchY = trueSoundBodyPitchY(segment, lane);
  const maxRadius = Math.max(0.035, segment.visual_body.radius_norm * 0.12);

  points.forEach((point) => {
    const z = trueSoundBodyZ(point.time_ms, totalDurationMs, scanMinZ, scanMaxZ);
    const waveOffsetX = point.signed_sample * (0.11 + segment.velocity * 0.08);
    const waveOffsetY = point.signed_sample * (0.08 + segment.velocity * 0.04);
    const centerX = laneX + waveOffsetX;
    const centerY = pitchY + waveOffsetY;
    const envelope = Math.max(point.envelope, point.amplitude);
    const radius = Math.max(0.018, maxRadius * (0.42 + envelope * 1.24 + point.local_thickness * 0.22));

    for (let column = 0; column < radialSegments; column += 1) {
      const angle = (column / radialSegments) * Math.PI * 2;
      const ring = 1 + Math.sin(angle * 3 + point.ring_phase) * 0.055;
      positions.push(
        centerX + Math.cos(angle) * radius * ring,
        centerY + Math.sin(angle) * radius * 0.72 * ring,
        z
      );
    }
  });

  for (let row = 0; row < points.length - 1; row += 1) {
    for (let column = 0; column < radialSegments; column += 1) {
      const current = row * radialSegments + column;
      const next = row * radialSegments + ((column + 1) % radialSegments);
      const above = (row + 1) * radialSegments + column;
      const aboveNext = (row + 1) * radialSegments + ((column + 1) % radialSegments);
      indices.push(current, above, next, next, above, aboveNext);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.userData = {
    contract_id: HCS_COMPOSER_WAVEFORM_EDITOR_TRUE_SOUND_BODY_V1,
    note_id: segment.note_id,
    render_role: "true_sound_waveform_body_extrusion"
  };
  return geometry;
}

function TrueSoundBodyExtrusionLayer({ waveformEditorReport, playheadReport, scanMinZ, scanMaxZ }: { waveformEditorReport?: HcsComposerWaveformEditorTrueSoundBodyV1Report | null; playheadReport?: PlayheadCursorReport | null; scanMinZ: number; scanMaxZ: number }) {
  const lanes = waveformEditorReport?.track_lanes ?? [];
  const totalDurationMs = Math.max(1, waveformEditorReport?.total_duration_ms ?? 1);
  const activeEntries = useMemo(() => {
    const active = new Set<string>();
    for (const note of playheadReport?.active_notes ?? []) {
      active.add(`${note.track_id}:${note.event_index}`);
    }
    return active;
  }, [playheadReport]);

  if (lanes.length === 0) {
    return null;
  }

  return (
    <group userData={{ scene_contract: HCS_COMPOSER_WAVEFORM_EDITOR_TRUE_SOUND_BODY_V1, layer: "true_sound_body_extrusions" }}>
      {lanes.flatMap((lane) => lane.note_segments.map((segment) => (
        <TrueSoundBodyExtrusion key={segment.note_id} lane={lane} laneCount={lanes.length} segment={segment} totalDurationMs={totalDurationMs} scanMinZ={scanMinZ} scanMaxZ={scanMaxZ} active={activeEntries.has(`${segment.track_id}:${segment.event_index}`)} />
      )))}
    </group>
  );
}

function TrueSoundBodyExtrusion({ lane, laneCount, segment, totalDurationMs, scanMinZ, scanMaxZ, active }: { lane: TrueSoundBodyTrackLane; laneCount: number; segment: TrueSoundBodyNoteSegment; totalDurationMs: number; scanMinZ: number; scanMaxZ: number; active: boolean }) {
  const geometry = useMemo(() => createTrueSoundBodyGeometry(segment, lane, laneCount, totalDurationMs, scanMinZ, scanMaxZ), [lane, laneCount, segment, totalDurationMs, scanMinZ, scanMaxZ]);
  const color = lane.lane_color;
  const opacity = active ? 0.62 : 0.38;

  return (
    <group userData={{ contract_id: HCS_COMPOSER_WAVEFORM_EDITOR_TRUE_SOUND_BODY_V1, note_id: segment.note_id, track_id: segment.track_id, event_index: segment.event_index }}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 0.54 : 0.24} transparent opacity={opacity} roughness={0.16} metalness={0.04} depthWrite={false} />
      </mesh>
      <mesh geometry={geometry} scale={[1.018, 1.018, 1.002]}>
        <meshBasicMaterial color={color} transparent opacity={active ? 0.42 : 0.2} wireframe depthWrite={false} />
      </mesh>
    </group>
  );
}

type ProductionTrackCorridor = {
  trackId: string;
  role: string;
  colorHex: string;
  x: number;
  y: number;
  zCenter: number;
  zLength: number;
  radius: number;
  phaseIndex: number;
  peak: number;
  points: NativeWaveformEnvelopePoint[];
};

function productionTrackCorridors(waveformBodyReport: HcsWaveformTo3DFieldBodyV1Report | null | undefined, bodies: ManifestBody[]): ProductionTrackCorridor[] {
  const waveformBodies = waveformBodyReport?.waveform_bodies ?? [];

  return waveformBodies
    .map((waveformBody, index) => {
      const trackBodies = bodies.filter((body) => body.layer_key === "payload_tone" && body.track_id === waveformBody.track_id);
      const zStart = trackBodies.length > 0 ? Math.min(...trackBodies.map((body) => Math.min(body.z_start, body.z_end))) : waveformBody.glass_reader_placement.z - waveformBody.body.length / 2;
      const zEnd = trackBodies.length > 0 ? Math.max(...trackBodies.map((body) => Math.max(body.z_start, body.z_end))) : waveformBody.glass_reader_placement.z + waveformBody.body.length / 2;
      const weight = Math.max(1, trackBodies.length);
      const x = trackBodies.length > 0 ? trackBodies.reduce((sum, body) => sum + body.x, 0) / weight : waveformBody.glass_reader_placement.x;
      const y = trackBodies.length > 0 ? trackBodies.reduce((sum, body) => sum + body.y, 0) / weight : waveformBody.glass_reader_placement.y + 0.28 + index * 0.12;
      const colorHex = trackBodies[0]?.color_hex ?? (waveformBody.role.includes("bass") ? "#56d6ff" : waveformBody.role.includes("field") ? "#f6d36b" : "#fff2ad");

      return {
        trackId: waveformBody.track_id,
        role: waveformBody.role,
        colorHex,
        x,
        y,
        zCenter: (zStart + zEnd) / 2,
        zLength: Math.max(0.32, Math.abs(zEnd - zStart)),
        radius: Math.max(0.08, waveformBody.body.radius),
        phaseIndex: waveformBody.phase_index,
        peak: Math.max(waveformBody.peak_velocity, waveformBody.rms_energy),
        points: nativeEnvelopePoints(waveformBody)
      };
    })
    .filter((corridor) => corridor.zLength > 0.05);
}

function createProductionTrackCorridorGeometry(corridor: ProductionTrackCorridor): THREE.BufferGeometry {
  const points = corridor.points;
  const longitudinalSegments = Math.max(24, Math.min(96, points.length * 4));
  const radialSegments = 28;
  const positions: number[] = [];
  const indices: number[] = [];

  for (let row = 0; row <= longitudinalSegments; row += 1) {
    const t = row / longitudinalSegments;
    const z = -corridor.zLength / 2 + t * corridor.zLength;
    const envelope = envelopeAmplitudeAt(points, t);
    const transient = Math.sin(Math.PI * t);
    const bodyRipple = Math.sin(t * Math.PI * (6 + corridor.phaseIndex) + corridor.phaseIndex * 0.77) * 0.09 * transient;
    const radiusBase = corridor.radius * (0.58 + envelope * 1.1 + corridor.peak * 0.2 + bodyRipple);
    const radiusX = Math.max(0.035, radiusBase * (1.1 + envelope * 0.32));
    const radiusY = Math.max(0.028, radiusBase * (0.52 + envelope * 0.48));

    for (let column = 0; column < radialSegments; column += 1) {
      const angle = (column / radialSegments) * Math.PI * 2;
      const cymaticRipple = 1 + Math.sin(angle * (3 + (corridor.phaseIndex % 4)) + t * Math.PI * 8) * 0.085;
      positions.push(Math.cos(angle) * radiusX * cymaticRipple, Math.sin(angle) * radiusY * cymaticRipple, z);
    }
  }

  for (let row = 0; row < longitudinalSegments; row += 1) {
    for (let column = 0; column < radialSegments; column += 1) {
      const current = row * radialSegments + column;
      const next = row * radialSegments + ((column + 1) % radialSegments);
      const above = (row + 1) * radialSegments + column;
      const aboveNext = (row + 1) * radialSegments + ((column + 1) % radialSegments);
      indices.push(current, above, next, next, above, aboveNext);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  geometry.userData = {
    contract_id: HCS_GLASS_READER_PRODUCTION_SCENE_COMPOSER_V1,
    source_contract_id: HCS_WAVEFORM_TO_3D_FIELD_BODY_V1_CONTRACT_ID,
    track_id: corridor.trackId,
    render_role: "production_waveform_lane_body"
  };
  return geometry;
}

function ProductionWaveformTrackCorridors({ waveformBodyReport, bodies }: { waveformBodyReport?: HcsWaveformTo3DFieldBodyV1Report | null; bodies: ManifestBody[] }) {
  const corridors = useMemo(() => productionTrackCorridors(waveformBodyReport, bodies), [bodies, waveformBodyReport]);

  return (
    <group userData={{ scene_contract: HCS_GLASS_READER_PRODUCTION_SCENE_COMPOSER_V1, layer: "production_waveform_track_corridors" }}>
      {corridors.map((corridor) => (
        <ProductionWaveformTrackCorridor key={corridor.trackId} corridor={corridor} />
      ))}
    </group>
  );
}

function ProductionWaveformTrackCorridor({ corridor }: { corridor: ProductionTrackCorridor }) {
  const geometry = useMemo(() => createProductionTrackCorridorGeometry(corridor), [corridor]);
  const shellOpacity = corridor.role.includes("bass") ? 0.24 : corridor.role.includes("field") ? 0.2 : 0.18;

  return (
    <group position={[corridor.x, corridor.y, corridor.zCenter]} userData={{ scene_contract: HCS_GLASS_READER_PRODUCTION_SCENE_COMPOSER_V1, track_id: corridor.trackId, role: corridor.role }}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={corridor.colorHex} emissive={corridor.colorHex} emissiveIntensity={0.08 + corridor.peak * 0.12} transparent opacity={shellOpacity} roughness={0.18} metalness={0.04} depthWrite={false} />
      </mesh>
      <mesh geometry={geometry} scale={[1.018, 1.018, 1.002]}>
        <meshBasicMaterial color={corridor.colorHex} transparent opacity={0.18} wireframe depthWrite={false} />
      </mesh>
    </group>
  );
}

function gestureSpread(event: FieldHarmonicEvent): number {
  const gesture = `${event.gesture_id ?? ""} ${event.operator ?? ""}`.toLowerCase();

  if (gesture.includes("open") || gesture.includes("emergence") || gesture.includes("extension")) {
    return 0.58;
  }

  if (gesture.includes("settle") || gesture.includes("root")) {
    return -0.34;
  }

  if (gesture.includes("cut") || gesture.includes("arrest")) {
    return -0.12;
  }

  return 0.22;
}

function gestureFlowPoints(event: FieldHarmonicEvent, fieldReport: HfieldFieldSynthesisReport, scanMinZ: number, scanMaxZ: number): THREE.Vector3[] {
  const anchor = fieldReport.phase_nodes.find((node) => node.phase === event.anchor_phase) ?? fieldReport.anchors.center_1;
  const startZ = zFromTimeNorm(event.time_norm_start, scanMinZ, scanMaxZ);
  const endZ = zFromTimeNorm(event.time_norm_end, scanMinZ, scanMaxZ);
  const spread = gestureSpread(event);
  const lift = event.field_region.toLowerCase().includes("upper") ? 0.52 : event.field_region.toLowerCase().includes("lower") ? -0.08 : 0.24;

  return [
    new THREE.Vector3(anchor.x * 0.58, anchor.y + 0.42, startZ),
    new THREE.Vector3((anchor.x + event.x) * 0.42 + spread, event.y + lift + 0.35, THREE.MathUtils.lerp(startZ, endZ, 0.32)),
    new THREE.Vector3(event.x + spread * 0.5, event.y + lift + 0.5 + event.amplitude * 0.2, THREE.MathUtils.lerp(startZ, endZ, 0.68)),
    new THREE.Vector3(event.x, event.y + lift + 0.2, endZ)
  ];
}

function ConductorGestureFlowLayer({ fieldReport, playheadReport, scanMinZ, scanMaxZ, inspection }: { fieldReport?: HfieldFieldSynthesisReport | null; playheadReport?: PlayheadCursorReport | null; scanMinZ: number; scanMaxZ: number; inspection: boolean }) {
  if (!fieldReport) {
    return null;
  }

  const activeCue = playheadReport?.active_conductor_cue ?? null;
  const now = playheadReport?.current_time_ms ?? 0;
  const events = fieldReport.harmonic_events
    .filter((event) => event.event_kind === "gesture")
    .filter((event) => inspection || Math.abs(event.start_ms - now) < 2600 || (now >= event.start_ms && now <= event.end_ms))
    .slice(0, inspection ? 18 : 8);

  return (
    <group userData={{ scene_contract: HCS_GLASS_READER_PRODUCTION_SCENE_COMPOSER_V1, layer: "conductor_gesture_flow_field" }}>
      {events.map((event) => {
        const active = activeCue ? event.event_index === activeCue.event_index || event.gesture_id === activeCue.gesture_id : eventActivationFromPlayhead(event, playheadReport) > 0.35;
        const color = active ? "#fff2ad" : phaseColor(event.phase);
        const curve = new THREE.CatmullRomCurve3(gestureFlowPoints(event, fieldReport, scanMinZ, scanMaxZ));
        const radius = active ? 0.025 + event.amplitude * 0.024 : 0.012 + event.amplitude * 0.012;
        return (
          <group key={`gesture-flow-${event.event_index}-${event.start_ms}`} userData={{ gesture_id: event.gesture_id, active }}>
            <mesh>
              <tubeGeometry args={[curve, 44, radius, 10, false]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={active ? 0.48 : 0.16} transparent opacity={active ? 0.72 : 0.26} roughness={0.22} metalness={0.04} depthWrite={false} />
            </mesh>
            {active ? (
              <mesh position={curve.getPoint(0.72)}>
                <sphereGeometry args={[0.105 + event.amplitude * 0.04, 24, 16]} />
                <meshBasicMaterial color="#fff7c9" transparent opacity={0.78} depthWrite={false} />
              </mesh>
            ) : null}
          </group>
        );
      })}
    </group>
  );
}

export default function HfieldVolumetricPacketField({
  fieldReport,
  cymaticReport,
  carrierReport,
  renderManifest,
  waveformBodyReport,
  waveformEditorReport,
  playheadReport,
  isPlaying = false,
  readerMode = "production",
  cameraPresetId = "studio-angle",
}: HfieldVolumetricPacketFieldProps) {
  const scanRef = useRef<THREE.Group | null>(null);
  const sliceRefs = useRef<Array<THREE.Group | null>>([]);

  const scanMinZ = renderManifest?.scan_min_z ?? -3.65;
  const scanMaxZ = renderManifest?.scan_max_z ?? 3.65;
  const fieldWidth = renderManifest?.field_width ?? 8.4;
  const fieldHeight = renderManifest?.field_height ?? 3.8;
  const totalDurationMs = Math.max(1, renderManifest?.total_duration_ms ?? 8000);
  const bodies = useMemo(() => renderManifest?.field_bodies ?? [], [renderManifest]);
  const bridges = useMemo(() => renderManifest?.bridge_bodies ?? [], [renderManifest]);
  const referenceLines = useMemo(() => renderManifest?.reference_lines ?? [], [renderManifest]);
  const referencePoints = useMemo(() => renderManifest?.reference_points ?? [], [renderManifest]);
  const waveformBodiesByTrack = useMemo(() => waveformTrackBodyMap(waveformBodyReport), [waveformBodyReport]);
  const activeSourceEntryIds = useMemo(() => playheadActiveSourceEntryIds(playheadReport), [playheadReport]);
  const baseProgress = currentPlayheadProgress(playheadReport);
  const inspectionMode = readerMode === "inspection";
  const showProductionComposer = readerMode === "production";
  const hasTrueSoundBodyReport = (waveformEditorReport?.segment_count ?? 0) > 0;
  const visibleBodies = useMemo(() => inspectionMode ? bodies : (hasTrueSoundBodyReport ? [] : bodies.filter((body) => body.layer_key === "payload_tone")), [bodies, hasTrueSoundBodyReport, inspectionMode]);
  const controlsTarget: [number, number, number] = cameraPresetId === "through-wave" ? [0, 0.95, 0.25] : cameraPresetId === "glass-plane" ? [0, 0.75, 0] : [0, 1.25, 0];

  useFrame(() => {
    const progress = baseProgress ?? 0;
    const scanZ = THREE.MathUtils.lerp(scanMinZ, scanMaxZ, progress);

    if (scanRef.current) {
      scanRef.current.position.z = scanZ;
    }

    visibleBodies.forEach((body, index) => {
      const slice = sliceRefs.current[index] ?? null;
      const activation = activationForScan(body, scanZ);

      if (slice) {
        slice.visible = activation > 0.012;
        slice.position.set(body.x, body.y, scanZ);

        const sliceScale = 0.3 + activation * (1.08 + body.amplitude * 0.64);
        slice.scale.set(sliceScale, sliceScale, sliceScale);

        setOpacityOnGroup(slice, 0.08 + activation * 0.84);
      }
    });
  });

  void totalDurationMs;

  return (
    <group>
      <color attach="background" args={["#02070b"]} />
      <ambientLight intensity={0.56} />
      <directionalLight position={[4, 5, 4]} intensity={1.12} />
      <pointLight position={[0, 2.8, 1.2]} intensity={1.45} color="#c9f9ff" />
      <pointLight position={[-3.2, 1.9, -2.2]} intensity={0.76} color="#f6d36b" />

      <OrbitControls
        makeDefault
        enablePan
        enableZoom
        enableRotate
        autoRotate={false}
        minDistance={1.45}
        maxDistance={16}
        target={controlsTarget}
      />

      <ReaderGrid width={fieldWidth} scanMinZ={scanMinZ} scanMaxZ={scanMaxZ} />
      <GlassReaderSurfaceLayer cymaticReport={cymaticReport} fieldWidth={fieldWidth} scanMinZ={scanMinZ} scanMaxZ={scanMaxZ} />
      {showProductionComposer && hasTrueSoundBodyReport ? <TrueSoundBodyExtrusionLayer waveformEditorReport={waveformEditorReport} playheadReport={playheadReport} scanMinZ={scanMinZ} scanMaxZ={scanMaxZ} /> : null}
      {showProductionComposer && !hasTrueSoundBodyReport ? <ProductionWaveformTrackCorridors waveformBodyReport={waveformBodyReport} bodies={bodies} /> : null}
      {inspectionMode ? <CarrierRippleLayer carrierReport={carrierReport} fieldWidth={fieldWidth} scanMinZ={scanMinZ} scanMaxZ={scanMaxZ} /> : null}
      <ConductorGestureFlowLayer fieldReport={fieldReport} playheadReport={playheadReport} scanMinZ={scanMinZ} scanMaxZ={scanMaxZ} inspection={inspectionMode} />

      {inspectionMode ? <RuntimePathRailsLayer carrierReport={carrierReport} fieldWidth={fieldWidth} scanMinZ={scanMinZ} scanMaxZ={scanMaxZ} /> : null}
      {inspectionMode ? <CarrierTimeSliceLayer carrierReport={carrierReport} fieldWidth={fieldWidth} scanMinZ={scanMinZ} scanMaxZ={scanMaxZ} /> : null}
      {inspectionMode ? <FieldTraceLayer fieldReport={fieldReport} scanMinZ={scanMinZ} scanMaxZ={scanMaxZ} /> : null}
      {inspectionMode ? <FieldEventNodesLayer fieldReport={fieldReport} playheadReport={playheadReport} scanMinZ={scanMinZ} scanMaxZ={scanMaxZ} /> : null}
      {inspectionMode ? <ActiveGestureInfluenceLayer fieldReport={fieldReport} playheadReport={playheadReport} scanMinZ={scanMinZ} scanMaxZ={scanMaxZ} /> : null}

      {inspectionMode ? referenceLines.map((line) => (
        <ReferenceLineMesh key={line.line_id} line={line} />
      )) : null}

      {inspectionMode ? bridges.map((bridge) => (
        <BridgeMesh key={bridge.bridge_id} bridge={bridge} />
      )) : null}

      {visibleBodies.map((body) => (
        <ToneBodyMesh key={body.body_id} body={body} waveformBody={waveformBodiesByTrack.get(body.track_id) ?? null} active={isBodyActiveFromPlayhead(body, activeSourceEntryIds)} />
      ))}

      {inspectionMode ? referencePoints.map((point) => (
        <ReferencePointMesh key={point.point_id} point={point} />
      )) : null}

      <group ref={scanRef}>
        <mesh position={[0, fieldHeight / 2 - 0.04, 0]}>
          <boxGeometry args={[fieldWidth + 1.0, fieldHeight, 0.025]} />
          <meshStandardMaterial
            color="#d8fbff"
            emissive="#6ae8ff"
            emissiveIntensity={0.1}
            transparent
            opacity={0.18}
            roughness={0.08}
            metalness={0.04}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        <mesh position={[0, fieldHeight - 0.04, 0]}>
          <boxGeometry args={[fieldWidth + 1.08, 0.026, 0.07]} />
          <meshBasicMaterial color="#eaffff" transparent opacity={0.76} depthWrite={false} />
        </mesh>

        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[fieldWidth + 1.08, 0.026, 0.07]} />
          <meshBasicMaterial color="#eaffff" transparent opacity={0.46} depthWrite={false} />
        </mesh>
      </group>

      {visibleBodies.map((body, index) => (
        <group
          key={`slice-${body.body_id}`}
          ref={(node) => {
            sliceRefs.current[index] = node;
          }}
        >
          <SliceIntersection body={body} />
        </group>
      ))}

      <group position={[-fieldWidth / 2 - 0.38, 0.06, scanMinZ - 0.22]}>
        <mesh>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial color="#f6d36b" transparent opacity={0.92} />
        </mesh>
      </group>

      <group position={[fieldWidth / 2 + 0.38, 0.06, scanMaxZ + 0.22]}>
        <mesh>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial color="#56d6ff" transparent opacity={0.92} />
        </mesh>
      </group>
    </group>
  );
}

import { Line, OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { HcsWaveformTo3DFieldBodyV1Report, HfieldRustRenderManifestReport } from "../bridge/tauriCommands";

export type HfieldVolumetricPacketFieldProps = {
  fieldReport?: unknown;
  cymaticReport?: unknown;
  carrierReport?: unknown;
  renderManifest?: HfieldRustRenderManifestReport | null;
  waveformBodyReport?: HcsWaveformTo3DFieldBodyV1Report | null;
  playheadReport?: unknown;
  isPlaying?: boolean;
};

type ManifestBody = HfieldRustRenderManifestReport["field_bodies"][number];
type ManifestBridge = HfieldRustRenderManifestReport["bridge_bodies"][number];
type ManifestReferenceLine = HfieldRustRenderManifestReport["reference_lines"][number];
type ManifestReferencePoint = HfieldRustRenderManifestReport["reference_points"][number];
type NativeWaveformTrackBody = HcsWaveformTo3DFieldBodyV1Report["waveform_bodies"][number];
type NativeWaveformEnvelopePoint = NativeWaveformTrackBody["envelope_points"][number];

const HCS_GLASS_READER_NATIVE_WAVEFORM_BODY_INTEGRATION_V1 = "HCS_GLASS_READER_NATIVE_WAVEFORM_BODY_INTEGRATION_V1";
const HCS_WAVEFORM_TO_3D_FIELD_BODY_V1_CONTRACT_ID = "aiweb.hfield.waveform_to_3d_field_body.v1";

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

function currentPlayheadProgress(playheadReport: unknown): number | null {
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

function NativeWaveformBodyMesh({ body, waveformBody }: { body: ManifestBody; waveformBody: NativeWaveformTrackBody | null }) {
  const geometry = useMemo(() => createNativeWaveformBodyGeometry(body, waveformBody), [body, waveformBody]);
  const peak = Math.max(body.amplitude, waveformBody?.peak_velocity ?? 0, waveformBody?.rms_energy ?? 0);
  const opacity = Math.max(bodyOpacity(body), Math.min(0.62, 0.22 + peak * 0.42));

  return (
    <group position={[body.x, body.y, body.z_center]}>
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color={body.color_hex}
          transparent
          opacity={opacity}
          roughness={0.2}
          metalness={0.1}
          emissive={body.color_hex}
          emissiveIntensity={0.18 + peak * 0.18}
          depthWrite={false}
        />
      </mesh>

      <mesh geometry={geometry} scale={[1.035, 1.035, 1.008]}>
        <meshBasicMaterial color={body.color_hex} transparent opacity={Math.max(0.24, bodyWireOpacity(body))} wireframe depthWrite={false} />
      </mesh>
    </group>
  );
}

function ToneBodyMesh({ body, waveformBody }: { body: ManifestBody; waveformBody?: NativeWaveformTrackBody | null }) {
  if (body.layer_key === "payload_tone" && waveformBody) {
    return <NativeWaveformBodyMesh body={body} waveformBody={waveformBody} />;
  }


  return (
    <group position={[body.x, body.y, body.z_center]}>
      <mesh scale={[body.radius_x, body.radius_y, Math.max(0.04, body.z_body_length / 2)]}>
        <sphereGeometry args={[1, 42, 24]} />
        <meshStandardMaterial
          color={body.color_hex}
          transparent
          opacity={bodyOpacity(body)}
          roughness={0.25}
          metalness={0.08}
          emissive={body.color_hex}
          emissiveIntensity={body.layer_key === "file_identity_carrier" ? 0.18 : 0.11}
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

export default function HfieldVolumetricPacketField({
  renderManifest,
  waveformBodyReport,
  playheadReport,
  isPlaying = false,
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
  const baseProgress = currentPlayheadProgress(playheadReport);

  useFrame(() => {
    const progress = baseProgress ?? 0;
    const scanZ = THREE.MathUtils.lerp(scanMinZ, scanMaxZ, progress);

    if (scanRef.current) {
      scanRef.current.position.z = scanZ;
    }

    bodies.forEach((body, index) => {
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
        target={[0, 1.25, 0]}
      />

      <ReaderGrid width={fieldWidth} scanMinZ={scanMinZ} scanMaxZ={scanMaxZ} />

      {referenceLines.map((line) => (
        <ReferenceLineMesh key={line.line_id} line={line} />
      ))}

      {bridges.map((bridge) => (
        <BridgeMesh key={bridge.bridge_id} bridge={bridge} />
      ))}

      {bodies.map((body) => (
        <ToneBodyMesh key={body.body_id} body={body} waveformBody={waveformBodiesByTrack.get(body.track_id) ?? null} />
      ))}

      {referencePoints.map((point) => (
        <ReferencePointMesh key={point.point_id} point={point} />
      ))}

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

      {bodies.map((body, index) => (
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

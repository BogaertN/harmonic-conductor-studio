import { Line, OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { HfieldRustRenderManifestReport } from "../bridge/tauriCommands";

export type HfieldVolumetricPacketFieldProps = {
  fieldReport?: unknown;
  cymaticReport?: unknown;
  carrierReport?: unknown;
  renderManifest?: HfieldRustRenderManifestReport | null;
  playheadReport?: unknown;
  isPlaying?: boolean;
};

type ManifestBody = HfieldRustRenderManifestReport["field_bodies"][number];
type ManifestBridge = HfieldRustRenderManifestReport["bridge_bodies"][number];
type ManifestReferenceLine = HfieldRustRenderManifestReport["reference_lines"][number];
type ManifestReferencePoint = HfieldRustRenderManifestReport["reference_points"][number];

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


function ToneBodyMesh({ body }: { body: ManifestBody }) {
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
        <ToneBodyMesh key={body.body_id} body={body} />
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

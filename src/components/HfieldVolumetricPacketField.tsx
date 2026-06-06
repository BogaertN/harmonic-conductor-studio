import { OrbitControls } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

export type HfieldVolumetricPacketFieldProps = {
  fieldReport?: unknown;
  cymaticReport?: unknown;
  carrierReport?: unknown;
  playheadReport?: unknown;
  isPlaying?: boolean;
};

type ToneKind = "identity" | "runtime" | "payload" | "field";

type ToneBody = {
  id: string;
  label: string;
  kind: ToneKind;
  frequencyHz: number;
  amplitude: number;
  startMs: number;
  durationMs: number;
  endMs: number;
  x: number;
  y: number;
  z: number;
  zStart: number;
  zEnd: number;
  zLength: number;
  radiusX: number;
  radiusY: number;
  color: string;
  phase: number;
};

type BridgeBody = {
  id: string;
  x: number;
  y: number;
  z: number;
  zLength: number;
  radiusX: number;
  radiusY: number;
  colorA: string;
  colorB: string;
};

const SCAN_MIN_Z = -3.65;
const SCAN_MAX_Z = 3.65;
const SCAN_DEPTH = SCAN_MAX_Z - SCAN_MIN_Z;
const FIELD_WIDTH = 8.4;
const FIELD_HEIGHT = 3.8;
const MIN_EVENT_MS = 80;

const PITCH_CLASS_COLORS = [
  "#ff3b30", // C
  "#ff6b2b", // C#/Db
  "#ffb000", // D
  "#f6d84a", // D#/Eb
  "#e8f66a", // E
  "#7ee36d", // F
  "#35d07f", // F#/Gb
  "#36d6ff", // G
  "#2f8dff", // G#/Ab
  "#6657ff", // A
  "#a56bff", // A#/Bb
  "#ff73d1", // B
];

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

function readString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
}

function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function hzToMidiFloat(frequencyHz: number): number {
  return 69 + 12 * Math.log2(frequencyHz / 440);
}

function collectRecords(value: unknown, output: Record<string, unknown>[] = [], depth = 0): Record<string, unknown>[] {
  if (depth > 8 || output.length > 420) {
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

function firstString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const exact = readString(record[key]);
    if (exact !== null) {
      return exact;
    }
  }

  for (const [key, value] of Object.entries(record)) {
    const lowered = key.toLowerCase();

    if (keys.some((candidate) => lowered.includes(candidate.toLowerCase()))) {
      const parsed = readString(value);
      if (parsed !== null) {
        return parsed;
      }
    }
  }

  return null;
}

function inferKind(record: Record<string, unknown>, label: string): ToneKind {
  const signature = `${Object.keys(record).join(" ")} ${label}`.toLowerCase();

  if (signature.includes("identity") || signature.includes("artifact") || signature.includes("file carrier")) {
    return "identity";
  }

  if (signature.includes("runtime") || signature.includes("path") || signature.includes("gesture") || signature.includes("operator")) {
    return "runtime";
  }

  if (signature.includes("payload") || signature.includes("note") || signature.includes("midi") || signature.includes("tone")) {
    return "payload";
  }

  return "field";
}

function colorForTone(frequencyHz: number, kind: ToneKind): string {
  if (kind === "identity") {
    return "#f6d36b";
  }

  if (kind === "runtime") {
    return "#56d6ff";
  }

  if (kind === "field") {
    return "#a98bff";
  }

  const midi = hzToMidiFloat(Math.max(1, frequencyHz));
  const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
  return PITCH_CLASS_COLORS[pitchClass] ?? "#fff2ad";
}

function roleLaneY(kind: ToneKind, label: string, amplitude: number): number {
  const lower = label.toLowerCase();

  if (kind === "identity") {
    return 2.82;
  }

  if (lower.includes("depth") || lower.includes("lower") || lower.includes("anchor_5")) {
    return 0.76 + amplitude * 0.42;
  }

  if (lower.includes("field") || lower.includes("upper") || lower.includes("anchor_9")) {
    return 1.78 + amplitude * 0.52;
  }

  if (lower.includes("lead") || lower.includes("payload") || lower.includes("primary")) {
    return 1.26 + amplitude * 0.72;
  }

  return kind === "runtime" ? 1.48 + amplitude * 0.48 : 1.18 + amplitude * 0.68;
}

function pitchPositionX(frequencyHz: number, label: string, index: number): number {
  const midi = hzToMidiFloat(Math.max(1, frequencyHz));
  const pitchClassPosition = (((midi % 12) + 12) % 12) / 12;
  const octave = Math.floor(midi / 12);
  const hash = hashString(`${label}:${frequencyHz}:${index}`);
  const octaveNudge = ((octave % 5) - 2) * 0.12;
  const stableNudge = ((hash % 1000) / 1000 - 0.5) * 0.18;

  return -FIELD_WIDTH / 2 + pitchClassPosition * FIELD_WIDTH + octaveNudge + stableNudge;
}

function timeToZ(timeMs: number, totalDurationMs: number): number {
  const ratio = Math.max(0, Math.min(1, timeMs / Math.max(1, totalDurationMs)));
  return SCAN_MIN_Z + ratio * SCAN_DEPTH;
}

function eventOpacity(kind: ToneKind): number {
  if (kind === "identity") {
    return 0.22;
  }

  if (kind === "runtime") {
    return 0.2;
  }

  return 0.25;
}

function extractToneBodies(props: HfieldVolumetricPacketFieldProps): { bodies: ToneBody[]; totalDurationMs: number } {
  const roots = [props.carrierReport, props.fieldReport, props.cymaticReport];
  const records = roots.flatMap((root) => collectRecords(root));

  const durationCandidates = records
    .flatMap((record) => [
      firstNumber(record, ["total_duration_ms", "duration_ms", "duration"]),
      firstNumber(record, ["end_ms", "stop_ms"]),
    ])
    .filter((value): value is number => value !== null && value > 0);

  const totalDurationMs = Math.max(8000, ...durationCandidates);

  const candidates: Array<{
    label: string;
    kind: ToneKind;
    frequencyHz: number;
    amplitude: number;
    startMs: number;
    durationMs: number;
  }> = [];

  for (const record of records) {
    let frequencyHz =
      firstNumber(record, [
        "payload_frequency_hz",
        "carrier_frequency_hz",
        "identity_carrier_hz",
        "frequency_hz",
        "frequency",
      ]);

    const midiNote = firstNumber(record, ["midi_note", "midi", "pitch"]);

    if ((frequencyHz === null || frequencyHz <= 0) && midiNote !== null && midiNote >= 0 && midiNote <= 127) {
      frequencyHz = midiToHz(midiNote);
    }

    if (frequencyHz === null || frequencyHz <= 0 || frequencyHz > 24000) {
      continue;
    }

    const label =
      firstString(record, [
        "label",
        "note_name",
        "pitch_name",
        "track_id",
        "runtime_path",
        "role",
        "operator",
        "gesture_id",
        "lane",
      ]) ?? `${Math.round(frequencyHz * 1000) / 1000} Hz`;

    const kind = inferKind(record, label);

    const startMs = Math.max(
      0,
      firstNumber(record, ["start_ms", "start_time_ms", "time_ms", "window_start_ms", "slice_start_ms"]) ?? 0,
    );

    const durationMs = Math.max(
      MIN_EVENT_MS,
      firstNumber(record, ["duration_ms", "length_ms", "window_duration_ms", "slice_duration_ms"]) ??
        (kind === "identity" ? totalDurationMs : 1000),
    );

    const velocity = firstNumber(record, ["velocity", "amplitude", "intensity", "weight", "energy"]) ?? 0.55;
    const amplitude = Math.max(0.12, Math.min(1.0, velocity));

    const duplicate = candidates.some(
      (candidate) =>
        Math.abs(candidate.frequencyHz - frequencyHz) < 0.001 &&
        candidate.label === label &&
        Math.abs(candidate.startMs - startMs) < 3 &&
        Math.abs(candidate.durationMs - durationMs) < 3,
    );

    if (!duplicate) {
      candidates.push({
        label,
        kind,
        frequencyHz,
        amplitude,
        startMs,
        durationMs,
      });
    }
  }

  if (candidates.length === 0) {
    candidates.push(
      { label: "file identity carrier", kind: "identity", frequencyHz: 411.6, amplitude: 0.5, startMs: 0, durationMs: totalDurationMs },
      { label: "C4 payload", kind: "payload", frequencyHz: 261.626, amplitude: 0.72, startMs: 0, durationMs: 2000 },
      { label: "G4 field path", kind: "runtime", frequencyHz: 391.995, amplitude: 0.48, startMs: 2000, durationMs: 2200 },
      { label: "G3 depth path", kind: "runtime", frequencyHz: 195.998, amplitude: 0.42, startMs: 4200, durationMs: 2200 },
      { label: "C5 packet emission", kind: "payload", frequencyHz: 523.251, amplitude: 0.38, startMs: 6200, durationMs: 1800 },
    );
  }

  const limited = candidates
    .sort((a, b) => {
      const kindWeight = (kind: ToneKind) => ({ identity: 0, runtime: 1, payload: 2, field: 3 })[kind];
      return kindWeight(a.kind) - kindWeight(b.kind) || a.startMs - b.startMs || a.frequencyHz - b.frequencyHz;
    })
    .slice(0, 28);

  const bodies = limited.map((candidate, index): ToneBody => {
    const safeDuration = Math.max(MIN_EVENT_MS, candidate.durationMs);
    const endMs = Math.min(totalDurationMs, candidate.startMs + safeDuration);
    const zStart = timeToZ(candidate.startMs, totalDurationMs);
    const zEnd = timeToZ(endMs, totalDurationMs);
    const zLength = Math.max(0.14, Math.abs(zEnd - zStart));
    const z = (zStart + zEnd) / 2;
    const x = pitchPositionX(candidate.frequencyHz, candidate.label, index);
    const y = roleLaneY(candidate.kind, candidate.label, candidate.amplitude);
    const color = colorForTone(candidate.frequencyHz, candidate.kind);
    const phase = ((hashString(`${candidate.label}:${candidate.startMs}:${candidate.durationMs}`) % 6283) / 1000) % (Math.PI * 2);

    const radiusBase =
      candidate.kind === "identity"
        ? 0.42
        : candidate.kind === "runtime"
          ? 0.3 + candidate.amplitude * 0.22
          : 0.34 + candidate.amplitude * 0.28;

    return {
      id: `${candidate.kind}-${index}-${hashString(`${candidate.label}:${candidate.frequencyHz}:${candidate.startMs}`)}`,
      label: candidate.label,
      kind: candidate.kind,
      frequencyHz: candidate.frequencyHz,
      amplitude: candidate.amplitude,
      startMs: candidate.startMs,
      durationMs: safeDuration,
      endMs,
      x,
      y,
      z,
      zStart,
      zEnd,
      zLength,
      radiusX: radiusBase,
      radiusY: radiusBase * (0.72 + candidate.amplitude * 0.46),
      color,
      phase,
    };
  });

  return { bodies, totalDurationMs };
}

function intervalOverlap(a: ToneBody, b: ToneBody): number {
  const start = Math.max(Math.min(a.zStart, a.zEnd), Math.min(b.zStart, b.zEnd));
  const end = Math.min(Math.max(a.zStart, a.zEnd), Math.max(b.zStart, b.zEnd));
  return Math.max(0, end - start);
}

function buildBridges(bodies: ToneBody[]): BridgeBody[] {
  const bridges: BridgeBody[] = [];

  for (let left = 0; left < bodies.length; left += 1) {
    for (let right = left + 1; right < bodies.length; right += 1) {
      const a = bodies[left];
      const b = bodies[right];

      if (a.kind === "identity" && b.kind === "identity") {
        continue;
      }

      const overlap = intervalOverlap(a, b);
      if (overlap <= 0) {
        continue;
      }

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distanceXY = Math.sqrt(dx * dx + dy * dy);
      const threshold = (a.radiusX + b.radiusX) * 2.7;

      if (distanceXY > threshold) {
        continue;
      }

      const zStart = Math.max(Math.min(a.zStart, a.zEnd), Math.min(b.zStart, b.zEnd));
      const zEnd = Math.min(Math.max(a.zStart, a.zEnd), Math.max(b.zStart, b.zEnd));
      const pressure = 1 - distanceXY / threshold;

      bridges.push({
        id: `bridge-${a.id}-${b.id}`,
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        z: (zStart + zEnd) / 2,
        zLength: Math.max(0.12, zEnd - zStart),
        radiusX: Math.max(0.05, Math.min(a.radiusX, b.radiusX) * (0.28 + pressure * 0.54)),
        radiusY: Math.max(0.04, Math.min(a.radiusY, b.radiusY) * (0.2 + pressure * 0.38)),
        colorA: a.color,
        colorB: b.color,
      });
    }
  }

  return bridges.slice(0, 36);
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

function activationForScan(body: ToneBody, scanZ: number): number {
  const start = Math.min(body.zStart, body.zEnd);
  const end = Math.max(body.zStart, body.zEnd);
  const feather = Math.max(0.12, Math.min(0.42, body.zLength * 0.24));

  if (scanZ < start - feather || scanZ > end + feather) {
    return 0;
  }

  if (scanZ >= start && scanZ <= end) {
    const edgeDistance = Math.min(scanZ - start, end - scanZ);
    return Math.max(0.35, Math.min(1, 0.35 + edgeDistance / feather));
  }

  if (scanZ < start) {
    return Math.max(0, 1 - (start - scanZ) / feather) * 0.35;
  }

  return Math.max(0, 1 - (scanZ - end) / feather) * 0.35;
}

function ReaderGrid() {
  const gridLines = useMemo(() => {
    const lines: Array<{ id: string; x1: number; x2: number; z1: number; z2: number; opacity: number }> = [];

    for (let index = 0; index <= 12; index += 1) {
      const x = -FIELD_WIDTH / 2 + (index / 12) * FIELD_WIDTH;
      lines.push({ id: `x-${index}`, x1: x, x2: x, z1: SCAN_MIN_Z, z2: SCAN_MAX_Z, opacity: index === 6 ? 0.3 : 0.13 });
    }

    for (let index = 0; index <= 16; index += 1) {
      const z = SCAN_MIN_Z + (index / 16) * SCAN_DEPTH;
      lines.push({ id: `z-${index}`, x1: -FIELD_WIDTH / 2, x2: FIELD_WIDTH / 2, z1: z, z2: z, opacity: index % 4 === 0 ? 0.22 : 0.1 });
    }

    return lines;
  }, []);

  return (
    <group position={[0, -0.03, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[FIELD_WIDTH + 0.95, SCAN_DEPTH + 0.75, 1, 1]} />
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

function ToneBodyMesh({ body }: { body: ToneBody }) {
  return (
    <group position={[body.x, body.y, body.z]} rotation={[0, 0, body.phase * 0.04]}>
      <mesh scale={[body.radiusX, body.radiusY, body.zLength / 2]}>
        <sphereGeometry args={[1, 42, 24]} />
        <meshStandardMaterial
          color={body.color}
          transparent
          opacity={eventOpacity(body.kind)}
          roughness={0.25}
          metalness={0.08}
          emissive={body.color}
          emissiveIntensity={body.kind === "identity" ? 0.18 : 0.1}
          depthWrite={false}
        />
      </mesh>

      <mesh scale={[body.radiusX * 1.04, body.radiusY * 1.04, body.zLength / 2 + 0.012]}>
        <sphereGeometry args={[1, 30, 18]} />
        <meshBasicMaterial color={body.color} transparent opacity={0.44} wireframe depthWrite={false} />
      </mesh>
    </group>
  );
}

function BridgeMesh({ bridge }: { bridge: BridgeBody }) {
  return (
    <group position={[bridge.x, bridge.y, bridge.z]}>
      <mesh scale={[bridge.radiusX, bridge.radiusY, bridge.zLength / 2]}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshStandardMaterial
          color={bridge.colorA}
          emissive={bridge.colorB}
          emissiveIntensity={0.12}
          transparent
          opacity={0.24}
          roughness={0.42}
          metalness={0.03}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function SliceIntersection({ body }: { body: ToneBody }) {
  const rings = [0.62, 0.88, 1.14, 1.4];

  return (
    <group>
      {rings.map((ratio, index) => (
        <mesh key={`${body.id}-ring-${ratio}`} scale={[ratio, ratio, ratio]}>
          <torusGeometry args={[body.radiusX * 0.86, 0.012 + index * 0.0025, 8, 112]} />
          <meshBasicMaterial color={body.color} transparent opacity={0.66 - index * 0.12} depthWrite={false} />
        </mesh>
      ))}

      <mesh scale={[body.radiusX * 0.18, body.radiusX * 0.18, body.radiusX * 0.18]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color="#fff7c9" transparent opacity={0.88} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function HfieldVolumetricPacketField({
  fieldReport,
  cymaticReport,
  carrierReport,
  playheadReport,
  isPlaying = false,
}: HfieldVolumetricPacketFieldProps) {
  const scanRef = useRef<THREE.Group | null>(null);
  const sliceRefs = useRef<Array<THREE.Group | null>>([]);

  const { bodies, totalDurationMs } = useMemo(
    () => extractToneBodies({ fieldReport, cymaticReport, carrierReport, playheadReport, isPlaying }),
    [fieldReport, cymaticReport, carrierReport, playheadReport, isPlaying],
  );

  const bridges = useMemo(() => buildBridges(bodies), [bodies]);
  const baseProgress = currentPlayheadProgress(playheadReport);

  useFrame(({ clock }) => {
    const animatedProgress = ((clock.getElapsedTime() * (1000 / totalDurationMs)) % 1 + 1) % 1;
    const progress = baseProgress ?? (isPlaying ? animatedProgress : 0);
    const scanZ = THREE.MathUtils.lerp(SCAN_MIN_Z, SCAN_MAX_Z, progress);

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

      <ReaderGrid />

      {bridges.map((bridge) => (
        <BridgeMesh key={bridge.id} bridge={bridge} />
      ))}

      {bodies.map((body) => (
        <ToneBodyMesh key={body.id} body={body} />
      ))}

      <group ref={scanRef}>
        <mesh position={[0, FIELD_HEIGHT / 2 - 0.04, 0]}>
          <boxGeometry args={[FIELD_WIDTH + 1.0, FIELD_HEIGHT, 0.025]} />
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

        <mesh position={[0, FIELD_HEIGHT - 0.04, 0]}>
          <boxGeometry args={[FIELD_WIDTH + 1.08, 0.026, 0.07]} />
          <meshBasicMaterial color="#eaffff" transparent opacity={0.76} depthWrite={false} />
        </mesh>

        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[FIELD_WIDTH + 1.08, 0.026, 0.07]} />
          <meshBasicMaterial color="#eaffff" transparent opacity={0.46} depthWrite={false} />
        </mesh>
      </group>

      {bodies.map((body, index) => (
        <group
          key={`slice-${body.id}`}
          ref={(node) => {
            sliceRefs.current[index] = node;
          }}
        >
          <SliceIntersection body={body} />
        </group>
      ))}

      <group position={[-FIELD_WIDTH / 2 - 0.38, 0.06, SCAN_MIN_Z - 0.22]}>
        <mesh>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial color="#f6d36b" transparent opacity={0.92} />
        </mesh>
      </group>

      <group position={[FIELD_WIDTH / 2 + 0.38, 0.06, SCAN_MAX_Z + 0.22]}>
        <mesh>
          <boxGeometry args={[0.2, 0.2, 0.2]} />
          <meshBasicMaterial color="#56d6ff" transparent opacity={0.92} />
        </mesh>
      </group>
    </group>
  );
}

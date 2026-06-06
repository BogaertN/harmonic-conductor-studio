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
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  angle: number;
};

type BridgeBody = {
  id: string;
  x: number;
  y: number;
  z: number;
  length: number;
  radius: number;
  angle: number;
  colorA: string;
  colorB: string;
};

const SCAN_MIN_Z = -3.1;
const SCAN_MAX_Z = 3.1;
const FIELD_WIDTH = 7.6;
const FIELD_HEIGHT = 3.6;

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

function wavelengthToRgb(wavelength: number): [number, number, number] {
  let red = 0;
  let green = 0;
  let blue = 0;

  if (wavelength >= 380 && wavelength < 440) {
    red = -(wavelength - 440) / (440 - 380);
    blue = 1;
  } else if (wavelength >= 440 && wavelength < 490) {
    green = (wavelength - 440) / (490 - 440);
    blue = 1;
  } else if (wavelength >= 490 && wavelength < 510) {
    green = 1;
    blue = -(wavelength - 510) / (510 - 490);
  } else if (wavelength >= 510 && wavelength < 580) {
    red = (wavelength - 510) / (580 - 510);
    green = 1;
  } else if (wavelength >= 580 && wavelength < 645) {
    red = 1;
    green = -(wavelength - 645) / (645 - 580);
  } else if (wavelength >= 645 && wavelength <= 700) {
    red = 1;
  }

  let factor = 1;

  if (wavelength >= 380 && wavelength < 420) {
    factor = 0.35 + (0.65 * (wavelength - 380)) / (420 - 380);
  } else if (wavelength > 645 && wavelength <= 700) {
    factor = 0.35 + (0.65 * (700 - wavelength)) / (700 - 645);
  }

  const gamma = 0.82;
  const channel = (value: number) => Math.round(255 * Math.pow(Math.max(0, value * factor), gamma));

  return [channel(red), channel(green), channel(blue)];
}

function frequencyToCanonicalColor(frequencyHz: number, kind: ToneKind): string {
  if (kind === "identity") {
    return "#f6d36b";
  }

  if (kind === "runtime") {
    return "#56d6ff";
  }

  if (kind === "field") {
    return "#a98bff";
  }

  const octaveFold = ((Math.log2(Math.max(1, frequencyHz)) % 1) + 1) % 1;
  const wavelength = 700 - octaveFold * 320;
  const [red, green, blue] = wavelengthToRgb(wavelength);

  return `#${red.toString(16).padStart(2, "0")}${green.toString(16).padStart(2, "0")}${blue
    .toString(16)
    .padStart(2, "0")}`;
}

function collectRecords(value: unknown, output: Record<string, unknown>[] = [], depth = 0): Record<string, unknown>[] {
  if (depth > 7 || output.length > 240) {
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

  if (signature.includes("identity") || signature.includes("file carrier") || signature.includes("artifact")) {
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

function extractToneBodies(props: HfieldVolumetricPacketFieldProps): ToneBody[] {
  const roots = [props.carrierReport, props.fieldReport, props.cymaticReport];
  const records = roots.flatMap((root) => collectRecords(root));

  const durationCandidates = records
    .flatMap((record) => [
      firstNumber(record, ["duration_ms", "total_duration_ms", "duration"]),
      firstNumber(record, ["end_ms", "stop_ms"]),
    ])
    .filter((value): value is number => value !== null && value > 0);

  const fieldDurationMs = Math.max(8000, ...durationCandidates);
  const candidates: Array<Omit<ToneBody, "id" | "x" | "y" | "z" | "radius" | "color" | "angle"> & { startMs: number; durationMs: number }> = [];

  for (const record of records) {
    let frequencyHz =
      firstNumber(record, ["payload_frequency_hz", "carrier_frequency_hz", "identity_carrier_hz", "frequency_hz", "frequency"]);

    const midiNote = firstNumber(record, ["midi_note", "midi", "pitch"]);
    if ((frequencyHz === null || frequencyHz <= 0) && midiNote !== null && midiNote >= 0 && midiNote <= 127) {
      frequencyHz = midiToHz(midiNote);
    }

    if (frequencyHz === null || frequencyHz <= 0 || frequencyHz > 24000) {
      continue;
    }

    const label =
      firstString(record, ["label", "note_name", "pitch_name", "pitch", "track_id", "runtime_path", "role", "operator", "gesture_id"]) ??
      `${Math.round(frequencyHz * 10) / 10} Hz`;

    const kind = inferKind(record, label);
    const startMs = Math.max(0, firstNumber(record, ["start_ms", "start_time_ms", "time_ms", "window_start_ms"]) ?? 0);
    const durationMs = Math.max(350, firstNumber(record, ["duration_ms", "length_ms", "window_duration_ms"]) ?? 1600);
    const velocity = firstNumber(record, ["velocity", "amplitude", "intensity", "weight", "energy"]) ?? 0.55;
    const amplitude = Math.max(0.18, Math.min(1.0, velocity));

    const duplicate = candidates.some(
      (candidate) =>
        Math.abs(candidate.frequencyHz - frequencyHz) < 0.001 &&
        candidate.label === label &&
        Math.abs(candidate.startMs - startMs) < 3,
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
      { label: "file identity carrier", kind: "identity", frequencyHz: 411.6, amplitude: 0.5, startMs: 0, durationMs: fieldDurationMs },
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
    .slice(0, 18);

  return limited.map((candidate, index) => {
    const pitchFold = ((Math.log2(candidate.frequencyHz / 16.35) % 1) + 1) % 1;
    const startCenter = candidate.startMs + candidate.durationMs / 2;
    const timePosition = startCenter / fieldDurationMs;
    const labelHash = hashString(`${candidate.label}:${candidate.frequencyHz}:${index}`);
    const jitter = ((labelHash % 1000) / 1000 - 0.5) * 0.52;

    const x = -FIELD_WIDTH / 2 + pitchFold * FIELD_WIDTH + jitter;
    const z = SCAN_MIN_Z + timePosition * (SCAN_MAX_Z - SCAN_MIN_Z);
    const y =
      candidate.kind === "identity"
        ? 1.55
        : candidate.kind === "runtime"
          ? 0.82 + candidate.amplitude * 0.75
          : 0.5 + candidate.amplitude * 1.55;

    const radius =
      candidate.kind === "identity"
        ? 0.44
        : candidate.kind === "runtime"
          ? 0.34 + candidate.amplitude * 0.28
          : 0.42 + candidate.amplitude * 0.36;

    const color = frequencyToCanonicalColor(candidate.frequencyHz, candidate.kind);
    const angle = ((labelHash % 360) * Math.PI) / 180;

    return {
      id: `${candidate.kind}-${index}-${labelHash}`,
      label: candidate.label,
      kind: candidate.kind,
      frequencyHz: candidate.frequencyHz,
      amplitude: candidate.amplitude,
      x,
      y,
      z,
      radius,
      color,
      angle,
    };
  });
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

      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const dy = b.y - a.y;
      const distance = Math.sqrt(dx * dx + dz * dz + dy * dy);
      const threshold = (a.radius + b.radius) * 2.25;

      if (distance > threshold) {
        continue;
      }

      const pressure = 1 - distance / threshold;
      bridges.push({
        id: `bridge-${a.id}-${b.id}`,
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        z: (a.z + b.z) / 2,
        length: Math.max(0.2, distance * 0.56),
        radius: Math.max(0.05, Math.min(a.radius, b.radius) * (0.22 + pressure * 0.36)),
        angle: Math.atan2(dz, dx),
        colorA: a.color,
        colorB: b.color,
      });
    }
  }

  return bridges.slice(0, 28);
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

function ReaderGrid() {
  const gridLines = useMemo(() => {
    const lines: Array<{ id: string; x1: number; x2: number; z1: number; z2: number; opacity: number }> = [];

    for (let index = 0; index <= 12; index += 1) {
      const x = -FIELD_WIDTH / 2 + (index / 12) * FIELD_WIDTH;
      lines.push({ id: `x-${index}`, x1: x, x2: x, z1: SCAN_MIN_Z, z2: SCAN_MAX_Z, opacity: index === 6 ? 0.26 : 0.12 });
    }

    for (let index = 0; index <= 10; index += 1) {
      const z = SCAN_MIN_Z + (index / 10) * (SCAN_MAX_Z - SCAN_MIN_Z);
      lines.push({ id: `z-${index}`, x1: -FIELD_WIDTH / 2, x2: FIELD_WIDTH / 2, z1: z, z2: z, opacity: index === 5 ? 0.26 : 0.12 });
    }

    return lines;
  }, []);

  return (
    <group position={[0, -0.03, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[FIELD_WIDTH + 0.85, SCAN_MAX_Z - SCAN_MIN_Z + 0.65, 1, 1]} />
        <meshStandardMaterial color="#061017" transparent opacity={0.34} roughness={0.62} metalness={0.05} side={THREE.DoubleSide} />
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
  const surfaceOpacity = body.kind === "identity" ? 0.3 : body.kind === "runtime" ? 0.22 : 0.26;
  const wireOpacity = body.kind === "identity" ? 0.62 : body.kind === "runtime" ? 0.42 : 0.48;

  return (
    <group position={[body.x, body.y, body.z]} rotation={[0, body.angle, 0]}>
      <mesh scale={[body.radius * 1.12, body.radius * (0.74 + body.amplitude * 0.52), body.radius * 1.12]}>
        <sphereGeometry args={[1, 40, 24]} />
        <meshStandardMaterial
          color={body.color}
          transparent
          opacity={surfaceOpacity}
          roughness={0.2}
          metalness={0.08}
          emissive={body.color}
          emissiveIntensity={body.kind === "identity" ? 0.14 : 0.08}
          depthWrite={false}
        />
      </mesh>

      <mesh scale={[body.radius * 1.16, body.radius * (0.76 + body.amplitude * 0.54), body.radius * 1.16]}>
        <sphereGeometry args={[1, 28, 16]} />
        <meshBasicMaterial color={body.color} transparent opacity={wireOpacity} wireframe depthWrite={false} />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} scale={[body.radius * 1.42, body.radius * 1.42, body.radius * 1.42]}>
        <torusGeometry args={[0.72, 0.012, 8, 84]} />
        <meshBasicMaterial color={body.color} transparent opacity={0.38} depthWrite={false} />
      </mesh>
    </group>
  );
}

function BridgeMesh({ bridge }: { bridge: BridgeBody }) {
  return (
    <group position={[bridge.x, bridge.y, bridge.z]} rotation={[0, -bridge.angle, 0]}>
      <mesh scale={[bridge.length, bridge.radius, bridge.radius]}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshStandardMaterial
          color={bridge.colorA}
          emissive={bridge.colorB}
          emissiveIntensity={0.08}
          transparent
          opacity={0.22}
          roughness={0.42}
          metalness={0.03}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function SliceIntersection({ body }: { body: ToneBody }) {
  const rings = [0.62, 0.88, 1.14];

  return (
    <group>
      {rings.map((ratio, index) => (
        <mesh key={`${body.id}-ring-${ratio}`} rotation={[0, 0, 0]} scale={[ratio, ratio, ratio]}>
          <torusGeometry args={[body.radius * 0.76, 0.012 + index * 0.0025, 8, 96]} />
          <meshBasicMaterial color={body.color} transparent opacity={0.62 - index * 0.14} depthWrite={false} />
        </mesh>
      ))}

      <mesh scale={[body.radius * 0.18, body.radius * 0.18, body.radius * 0.18]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color="#fff7c9" transparent opacity={0.86} depthWrite={false} />
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

  const bodies = useMemo(
    () => extractToneBodies({ fieldReport, cymaticReport, carrierReport, playheadReport, isPlaying }),
    [fieldReport, cymaticReport, carrierReport, playheadReport, isPlaying],
  );

  const bridges = useMemo(() => buildBridges(bodies), [bodies]);
  const baseProgress = currentPlayheadProgress(playheadReport);

  useFrame(({ clock }) => {
    const animatedProgress = ((clock.getElapsedTime() * 0.12) % 1 + 1) % 1;
    const progress = isPlaying ? animatedProgress : baseProgress ?? 0.38;
    const scanZ = THREE.MathUtils.lerp(SCAN_MIN_Z, SCAN_MAX_Z, progress);

    if (scanRef.current) {
      scanRef.current.position.z = scanZ;
    }

    bodies.forEach((body, index) => {
      const slice = sliceRefs.current[index] ?? null;
      const dz = Math.abs(body.z - scanZ);
      const activation = Math.max(0, 1 - dz / Math.max(0.001, body.radius * 1.8));

      if (slice) {
        slice.visible = activation > 0.015;
        slice.position.set(body.x, body.y, scanZ);
        const sliceScale = 0.26 + activation * (1.05 + body.amplitude * 0.55);
        slice.scale.set(sliceScale, sliceScale, sliceScale);
        setOpacityOnGroup(slice, 0.1 + activation * 0.78);
      }
    });
  });

  return (
    <group>
      <color attach="background" args={["#02070b"]} />
      <ambientLight intensity={0.58} />
      <directionalLight position={[4, 5, 4]} intensity={1.15} />
      <pointLight position={[0, 2.6, 1.2]} intensity={1.4} color="#c9f9ff" />
      <pointLight position={[-2.8, 1.8, -1.8]} intensity={0.76} color="#f6d36b" />

      <ReaderGrid />

      <group>
        {bridges.map((bridge) => (
          <BridgeMesh key={bridge.id} bridge={bridge} />
        ))}

        {bodies.map((body) => (
          <ToneBodyMesh key={body.id} body={body} />
        ))}
      </group>

      <group ref={scanRef}>
        <mesh position={[0, FIELD_HEIGHT / 2 - 0.04, 0]}>
          <boxGeometry args={[FIELD_WIDTH + 0.92, FIELD_HEIGHT, 0.025]} />
          <meshStandardMaterial
            color="#d8fbff"
            emissive="#6ae8ff"
            emissiveIntensity={0.08}
            transparent
            opacity={0.16}
            roughness={0.08}
            metalness={0.04}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        <mesh position={[0, FIELD_HEIGHT - 0.04, 0]}>
          <boxGeometry args={[FIELD_WIDTH + 1.05, 0.025, 0.07]} />
          <meshBasicMaterial color="#eaffff" transparent opacity={0.72} depthWrite={false} />
        </mesh>

        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[FIELD_WIDTH + 1.05, 0.025, 0.07]} />
          <meshBasicMaterial color="#eaffff" transparent opacity={0.42} depthWrite={false} />
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

      <group position={[-FIELD_WIDTH / 2 - 0.35, 0.06, SCAN_MIN_Z - 0.18]}>
        <mesh>
          <boxGeometry args={[0.18, 0.18, 0.18]} />
          <meshBasicMaterial color="#f6d36b" transparent opacity={0.92} />
        </mesh>
      </group>

      <group position={[FIELD_WIDTH / 2 + 0.35, 0.06, SCAN_MAX_Z + 0.18]}>
        <mesh>
          <boxGeometry args={[0.18, 0.18, 0.18]} />
          <meshBasicMaterial color="#56d6ff" transparent opacity={0.92} />
        </mesh>
      </group>
    </group>
  );
}

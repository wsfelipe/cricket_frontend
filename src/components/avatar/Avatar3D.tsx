import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { AvatarConfig } from "@/types/game";

/**
 * Modular stylized avatar built from simple primitives.
 * Each part is its own component, so real 3D assets can replace them later
 * without touching any multiplayer logic.
 */

const SKIN = "#e8b48c";

function Body({ variant, color }: { variant: string; color: string }) {
  const width = variant === "slim" ? 0.28 : variant === "chunky" ? 0.42 : 0.34;
  return (
    <mesh position-y={0.34} castShadow>
      <capsuleGeometry args={[width, 0.34, 4, 12]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

function Head({ variant }: { variant: string }) {
  const scale: [number, number, number] =
    variant === "oval" ? [1, 1.18, 0.95] : variant === "square" ? [1.05, 1, 1.05] : [1, 1, 1];
  return (
    <mesh position-y={0.92} scale={scale} castShadow>
      {variant === "square" ? (
        <boxGeometry args={[0.34, 0.34, 0.34]} />
      ) : (
        <sphereGeometry args={[0.2, 20, 16]} />
      )}
      <meshStandardMaterial color={SKIN} roughness={0.85} />
    </mesh>
  );
}

function Hair({ variant, color }: { variant: string; color: string }) {
  if (variant === "none") return null;
  if (variant === "bun") {
    return (
      <group>
        <mesh position-y={1.0} castShadow>
          <sphereGeometry args={[0.205, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.12, -0.16]} castShadow>
          <sphereGeometry args={[0.1, 12, 10]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      </group>
    );
  }
  if (variant === "cap") {
    return (
      <group position-y={1.02}>
        <mesh castShadow>
          <sphereGeometry args={[0.215, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
        <mesh position={[0, -0.01, 0.2]} rotation-x={-0.15}>
          <boxGeometry args={[0.26, 0.03, 0.18]} />
          <meshStandardMaterial color={color} roughness={0.6} />
        </mesh>
      </group>
    );
  }
  return (
    <mesh position-y={0.99} castShadow>
      <sphereGeometry args={[0.208, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.7]} />
      <meshStandardMaterial color={color} roughness={0.9} />
    </mesh>
  );
}

function Outfit({ variant, color }: { variant: string; color: string }) {
  if (variant === "suit") {
    return (
      <mesh position-y={0.5} castShadow>
        <boxGeometry args={[0.1, 0.3, 0.02]} />
        <meshStandardMaterial color="#f2f2f2" roughness={0.6} />
      </mesh>
    );
  }
  if (variant === "hoodie") {
    return (
      <mesh position={[0, 0.62, -0.16]} castShadow>
        <sphereGeometry args={[0.18, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
    );
  }
  if (variant === "stripes") {
    return (
      <group>
        {[0.28, 0.42, 0.56].map((y) => (
          <mesh key={y} position-y={y}>
            <torusGeometry args={[0.345, 0.018, 8, 20]} />
            <meshStandardMaterial color="#f7f2e4" roughness={0.8} />
          </mesh>
        ))}
      </group>
    );
  }
  return null;
}

function Accessory({ variant, color }: { variant: string; color: string }) {
  if (variant === "glasses") {
    return (
      <group position={[0, 0.93, 0.18]}>
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} position-x={x}>
            <torusGeometry args={[0.055, 0.012, 8, 16]} />
            <meshStandardMaterial color="#2b2b33" roughness={0.4} />
          </mesh>
        ))}
      </group>
    );
  }
  if (variant === "headphones") {
    return (
      <group position-y={0.95}>
        <mesh rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.21, 0.022, 8, 20, Math.PI]} />
          <meshStandardMaterial color="#2b2b33" roughness={0.5} />
        </mesh>
        {[-0.2, 0.2].map((x) => (
          <mesh key={x} position={[x, -0.02, 0]}>
            <sphereGeometry args={[0.06, 10, 8]} />
            <meshStandardMaterial color={color} roughness={0.5} />
          </mesh>
        ))}
      </group>
    );
  }
  if (variant === "scarf") {
    return (
      <mesh position-y={0.72}>
        <torusGeometry args={[0.2, 0.05, 8, 18]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
    );
  }
  return null;
}

export interface Avatar3DProps {
  config: AvatarConfig;
  active?: boolean;
  eliminated?: boolean;
  seed?: number;
}

export function Avatar3D({ config, active = false, eliminated = false, seed = 0 }: Avatar3DProps) {
  const group = useRef<THREE.Group>(null);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const node = group.current;
    if (!node) return;
    const t = state.clock.elapsedTime;
    const targetY = eliminated ? -0.35 : active ? 0.06 : 0;
    node.position.y += (targetY - node.position.y) * (1 - Math.exp(-6 * delta));
    node.rotation.z = Math.sin(t * 1.2 + seed) * 0.02;
    node.scale.y = 1 + Math.sin(t * 1.8 + seed) * 0.012;
  });

  const hairColor = "#2f2620";

  return (
    <group ref={group}>
      <Body variant={config.body} color={eliminated ? "#4c4a55" : config.color} />
      <Head variant={config.head} />
      <Hair variant={config.hair} color={hairColor} />
      <Outfit variant={config.outfit} color={config.color} />
      <Accessory variant={config.accessory} color={config.color} />
      {active && !eliminated && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
          <ringGeometry args={[0.44, 0.56, 28]} />
          <meshBasicMaterial color="#ffd45e" transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}

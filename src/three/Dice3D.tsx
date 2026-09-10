import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { diceFaceTextures, FACE_VALUES, rotationForValue } from "./diceTextures";

interface DieProps {
  value: number | null;
  rolling: boolean;
  rollDelay: number;
  offset: [number, number, number];
  seed: number;
}

function Die({ value, rolling, rollDelay, offset, seed }: DieProps) {
  const group = useRef<THREE.Group>(null);
  const textures = useMemo(diceFaceTextures, []);

  // Estado interno da animação
  const velocity = useRef({
    x: 0,
    y: 0,
    z: 0,
  });

  const lastRolling = useRef(false);
  const rollingFrom = useRef(0);
  const rollingUntil = useRef(0);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const node = group.current;

    if (!node) return;

    if (rolling && !lastRolling.current) {
      rollingFrom.current = state.clock.elapsedTime + rollDelay;
      rollingUntil.current = rollingFrom.current + 2;
      velocity.current = {
        x: 14 + seed * 2.5,
        y: 11 + seed * 1.8,
        z: 9 + seed * 2,
      };

      // Pequeno impulso vertical
      node.position.y = offset[1] + 0.05;
    }

    lastRolling.current = rolling;
    const now = state.clock.elapsedTime;
    const isRolling = now >= rollingFrom.current && (rolling || now < rollingUntil.current);

    if (isRolling || value === null) {
      const v = velocity.current;

      // Rotação física
      node.rotation.x += v.x * delta;
      node.rotation.y += v.y * delta;
      node.rotation.z += v.z * delta;

      // Movimento de quique
      const time = state.clock.elapsedTime;

      const bounce =
        Math.abs(Math.sin(time * 10 + seed * 2.3)) *
        Math.exp(-time * 0.08) *
        0.22;

      node.position.y =
        offset[1] +
        bounce;

      // Pequeno movimento lateral para não parecer "preso"
      node.position.x =
        offset[0] +
        Math.sin(time * 7 + seed) * 0.025;

      node.position.z =
        offset[2] +
        Math.cos(time * 6 + seed * 1.7) * 0.025;
    } else {
      // Quando termina a rolagem,
      // suavemente encaixa na face correta.
      const target = rotationForValue(value);

      const k = 1 - Math.exp(-11 * delta);

      // Rotação
      node.rotation.x +=
        (target[0] - node.rotation.x) * k;

      node.rotation.y +=
        (target[1] - node.rotation.y) * k;

      node.rotation.z +=
        (target[2] - node.rotation.z) * k;

      // Retorna para a posição original
      node.position.x +=
        (offset[0] - node.position.x) * k;

      node.position.z +=
        (offset[2] - node.position.z) * k;

      node.position.y +=
        (offset[1] - node.position.y) * k;
    }
  });

  return (
    <group ref={group} position={offset}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.42, 0.42]} />

        {FACE_VALUES.map((faceValue, index) => (
          <meshStandardMaterial
            key={index}
            attach={`material-${index}`}
            map={textures[faceValue - 1] ?? null}
            roughness={0.45}
            metalness={0.05}
          />
        ))}
      </mesh>
    </group>
  );
}

export function Dice3D({
  values,
  rolling,
}: {
  values: number[] | null;
  rolling: boolean;
}) {
  if (!values && !rolling) {
    return (
      <div
        className="dice-3d dice-hidden"
        aria-label="Dados ocultos"
        style={{ alignItems: "center", display: "flex", fontSize: "72px", height: "180px", justifyContent: "center", width: "100%" }}
      >
        ?
      </div>
    );
  }

  return (
    <div
      className="dice-3d"
      aria-label={values ? `Dados: ${values.join(" e ")}` : "Dados ocultos"}
      style={{ height: "180px", width: "100%" }}
    >
      <Canvas
        camera={{ position: [0, 1.5, 4.4], fov: 38 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        shadows
      >
        <ambientLight intensity={1.8} />
        <directionalLight castShadow intensity={3} position={[2, 4, 3]} />
        <pointLight intensity={1.2} position={[-2, 1, 2]} color="#e4b86a" />
        <Die value={values?.[0] ?? null} rolling={rolling} rollDelay={0} offset={[-0.62, 0, 0]} seed={1} />
        <Die value={values?.[1] ?? null} rolling={rolling} rollDelay={5} offset={[0.62, 0, 0]} seed={2} />
      </Canvas>
    </div>
  );
}
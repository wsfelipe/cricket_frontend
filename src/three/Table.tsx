import { useMemo } from "react";
import * as THREE from "three";

function feltTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#1f4536";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i += 1) {
    const alpha = Math.random() * 0.08;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1.5, 1.5);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function Table() {
  const felt = useMemo(feltTexture, []);

  return (
    <group>
      {/* floor */}
      <mesh rotation-x={-Math.PI / 2} position-y={-1.2} receiveShadow>
        <circleGeometry args={[14, 40]} />
        <meshStandardMaterial color="#161320" roughness={1} />
      </mesh>

      {/* table top */}
      <mesh position-y={0.7} receiveShadow castShadow>
        <cylinderGeometry args={[2.5, 2.5, 0.16, 48]} />
        <meshStandardMaterial
          color="#2c6650"
          roughness={0.95}
          metalness={0}
          map={felt ?? undefined}
        />
      </mesh>

      {/* rim */}
      <mesh position-y={0.63} castShadow>
        <cylinderGeometry args={[2.62, 2.62, 0.14, 48]} />
        <meshStandardMaterial color="#5b3a21" roughness={0.6} />
      </mesh>

      {/* pedestal */}
      <mesh position-y={-0.2} castShadow>
        <cylinderGeometry args={[0.42, 0.62, 1.7, 20]} />
        <meshStandardMaterial color="#4a2f1c" roughness={0.8} />
      </mesh>
      <mesh position-y={-1.1} receiveShadow>
        <cylinderGeometry args={[1.15, 1.25, 0.18, 24]} />
        <meshStandardMaterial color="#402819" roughness={0.9} />
      </mesh>

      {/* dice tray marking */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.786}>
        <ringGeometry args={[0.72, 0.78, 40]} />
        <meshStandardMaterial color="#d9c27a" roughness={0.7} />
      </mesh>
    </group>
  );
}

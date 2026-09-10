import * as THREE from "three";

const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [
    [0.28, 0.28],
    [0.72, 0.72],
  ],
  3: [
    [0.26, 0.26],
    [0.5, 0.5],
    [0.74, 0.74],
  ],
  4: [
    [0.28, 0.28],
    [0.72, 0.28],
    [0.28, 0.72],
    [0.72, 0.72],
  ],
  5: [
    [0.26, 0.26],
    [0.74, 0.26],
    [0.5, 0.5],
    [0.26, 0.74],
    [0.74, 0.74],
  ],
  6: [
    [0.28, 0.24],
    [0.72, 0.24],
    [0.28, 0.5],
    [0.72, 0.5],
    [0.28, 0.76],
    [0.72, 0.76],
  ],
};

let cache: THREE.CanvasTexture[] | null = null;

/** Face textures for values 1..6 (index 0 = value 1). Built once per session. */
export function diceFaceTextures(): THREE.CanvasTexture[] {
  if (cache) return cache;
  if (typeof document === "undefined") return [];
  const size = 128;
  cache = [1, 2, 3, 4, 5, 6].map((value) => {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f7f2e4";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, size - 6, size - 6);
    ctx.fillStyle = "#26221c";
    PIPS[value]!.forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x * size, y * size, size * 0.085, 0, Math.PI * 2);
      ctx.fill();
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  });
  return cache;
}

/** BoxGeometry material order: +X, -X, +Y, -Y, +Z, -Z */
export const FACE_VALUES = [1, 6, 2, 5, 3, 4] as const;

export function rotationForValue(value: number): [number, number, number] {
  switch (value) {
    case 1:
      return [0, 0, Math.PI / 2];
    case 6:
      return [0, 0, -Math.PI / 2];
    case 2:
      return [0, 0, 0];
    case 5:
      return [Math.PI, 0, 0];
    case 3:
      return [-Math.PI / 2, 0, 0];
    default:
      return [Math.PI / 2, 0, 0];
  }
}
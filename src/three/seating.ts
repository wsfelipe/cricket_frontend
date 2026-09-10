export const TABLE_RADIUS = 2.5;
export const SEAT_RADIUS = 3.15;
export const MAX_SEATS = 8;

export interface SeatTransform {
  /** angle in radians, 0 = local player (nearest the camera) */
  angle: number;
  position: [number, number, number];
  /** rotation.y so the avatar faces the table centre */
  rotationY: number;
  isLocal: boolean;
}

/**
 * Distributes players around the table from the LOCAL player's point of view.
 * Purely derived from room state — never hardcoded per player.
 */
export function seatTransform(
  index: number,
  localIndex: number,
  total: number,
): SeatTransform {
  const count = Math.max(1, Math.min(total, MAX_SEATS));
  const offset = ((index - localIndex) % count + count) % count;
  const angle = (offset / count) * Math.PI * 2;
  // angle 0 -> +Z (in front of the camera / local seat)
  const x = Math.sin(angle) * SEAT_RADIUS;
  const z = Math.cos(angle) * SEAT_RADIUS;
  return {
    angle,
    position: [x, 0, z],
    rotationY: Math.atan2(-x, -z),
    isLocal: offset === 0,
  };
}

export const LOCAL_CAMERA_POSITION: [number, number, number] = [0, 1.55, SEAT_RADIUS + 0.5];
export const TABLE_FOCUS: [number, number, number] = [0, 0.75, 0.15];

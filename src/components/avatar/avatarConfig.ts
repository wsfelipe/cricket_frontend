import type { AvatarConfig } from "@/types/game";

/**
 * Modular avatar system.
 * Every part is a plain string key so an AvatarConfig is trivially serializable
 * and can later be sent to the server / swapped for real 3D assets.
 */

export const AVATAR_PARTS = {
  body: ["slim", "regular", "chunky"],
  head: ["round", "oval", "square"],
  hair: ["none", "short", "bun", "cap"],
  outfit: ["tee", "hoodie", "suit", "stripes"],
  accessory: ["none", "glasses", "headphones", "scarf"],
} as const;

export type AvatarPartKey = keyof typeof AVATAR_PARTS;

export const AVATAR_COLORS = [
  "#e2574c",
  "#f0a202",
  "#3fb27f",
  "#3d8bd6",
  "#8e6bd1",
  "#e0709b",
  "#41c1c9",
  "#c9b037",
];

export const defaultAvatar: AvatarConfig = {
  body: "regular",
  head: "round",
  hair: "short",
  outfit: "tee",
  accessory: "none",
  color: AVATAR_COLORS[0]!,
};

const STORAGE_KEY = "cricket.avatar";

export function loadAvatar(): AvatarConfig {
  if (typeof window === "undefined") return defaultAvatar;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAvatar;
    const parsed = JSON.parse(raw) as Partial<AvatarConfig>;
    return { ...defaultAvatar, ...parsed };
  } catch {
    return defaultAvatar;
  }
}

export function saveAvatar(avatar: AvatarConfig): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(avatar));
  } catch {
    /* noop */
  }
}

/** Deterministic cosmetic fallback so remote players look distinct. */
export function avatarForPlayer(id: string, override?: AvatarConfig | null): AvatarConfig {
  if (override) return { ...defaultAvatar, ...override };
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  const pick = <T,>(list: readonly T[], salt: number): T =>
    list[(hash + salt * 7) % list.length]!;
  return {
    body: pick(AVATAR_PARTS.body, 1),
    head: pick(AVATAR_PARTS.head, 2),
    hair: pick(AVATAR_PARTS.hair, 3),
    outfit: pick(AVATAR_PARTS.outfit, 4),
    accessory: pick(AVATAR_PARTS.accessory, 5),
    color: pick(AVATAR_COLORS, 6),
  };
}

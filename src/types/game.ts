/**
 * Domain types for the Cricket dice game.
 * The server is always the authority — these types only describe what we receive.
 */

export type GamePhase = "waiting" | "rolling" | "announcing" | "challenging" | "ended";

export const NUMERIC_ANNOUNCEMENTS = [
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
] as const;

export const PAIR_ANNOUNCEMENTS = [
  "pair_1",
  "pair_2",
  "pair_3",
  "pair_4",
  "pair_5",
  "pair_6",
] as const;

export const ANNOUNCEMENTS = [
  ...NUMERIC_ANNOUNCEMENTS,
  ...PAIR_ANNOUNCEMENTS,
  "cricket",
] as const;

export type Announcement = (typeof ANNOUNCEMENTS)[number];

export const ANNOUNCEMENT_LABELS: Record<Announcement, string> = {
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  "11": "11",
  pair_1: "Par de 1",
  pair_2: "Par de 2",
  pair_3: "Par de 3",
  pair_4: "Par de 4",
  pair_5: "Par de 5",
  pair_6: "Par de 6",
  cricket: "Cricket",
};

/** Purely cosmetic ordering used to grey out lower options. Never a validation. */
export const ANNOUNCEMENT_RANK: Record<Announcement, number> = ANNOUNCEMENTS.reduce(
  (acc, value, index) => {
    acc[value] = index;
    return acc;
  },
  {} as Record<Announcement, number>,
);

export function announcementLabel(value: string | null | undefined): string {
  if (!value) return "—";
  return ANNOUNCEMENT_LABELS[value as Announcement] ?? value;
}

export interface Player {
  id: string;
  name: string;
  lives: number;
  isActive: boolean;
  isCurrentPlayer: boolean;
  ready: boolean;
  /** Optional, only if the server ever forwards cosmetic data. */
  avatar?: AvatarConfig | null;
  connected?: boolean;
}

export interface RoomState {
  code: string;
  players: Player[];
  currentPlayerIndex: number;
  gamePhase: GamePhase;
  currentAnnouncement: Announcement | string | null;
  lastAnnouncingPlayerIndex: number | null;
  diceResult: number[] | null;
  round: number;
  winner: Player | string | null;
  createdAt: string;
}

export type ChallengeType = "CALL_BLUFF" | "BUY";

export interface ChallengeResult {
  challengeType?: ChallengeType | string;
  winner?: Player | string | null;
  loser?: Player | string | null;
  livesLost?: number | null;
  reason?: string | null;
  dice?: number[] | null;
  diceResult?: number[] | null;
  announcement?: string | null;
  eliminated?: Player | string | null;
  [key: string]: unknown;
}

export type WebSocketStatus =
  | "idle"
  | "connecting"
  | "open"
  | "closing"
  | "closed"
  | "error";

/** Cosmetic-only avatar description. Serializable, ready to be sent to a server later. */
export interface AvatarConfig {
  body: string;
  head: string;
  hair: string;
  outfit: string;
  accessory: string;
  color: string;
}

export interface GameEvent {
  id: string;
  at: number;
  text: string;
  tone: "info" | "warn" | "good";
}

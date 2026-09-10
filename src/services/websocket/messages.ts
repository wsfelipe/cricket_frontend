import type { Announcement, ChallengeType, RoomState } from "@/types/game";

/** ---------- client -> server ---------- */

export type ClientMessage =
  | { type: "CREATE_ROOM"; playerName: string }
  | { type: "JOIN_ROOM"; roomCode: string; playerName: string }
  | { type: "START_GAME"; roomCode: string }
  | { type: "ROLL_DICE"; roomCode: string }
  | { type: "ANNOUNCE"; roomCode: string; announcement: Announcement }
  | { type: "CHALLENGE"; roomCode: string; challengeType: ChallengeType }
  | { type: "LEAVE_ROOM"; roomCode: string }
  | { type: "TOGGLE_READY"; roomCode: string };

export const clientMessages = {
  createRoom: (playerName: string): ClientMessage => ({
    type: "CREATE_ROOM",
    playerName,
  }),
  joinRoom: (roomCode: string, playerName: string): ClientMessage => ({
    type: "JOIN_ROOM",
    roomCode: roomCode.toUpperCase(),
    playerName,
  }),
  startGame: (roomCode: string): ClientMessage => ({
    type: "START_GAME",
    roomCode: roomCode.toUpperCase(),
  }),
  toggleReady: (roomCode: string): ClientMessage => ({
    type: "TOGGLE_READY",
    roomCode: roomCode.toUpperCase(),
  }),
  rollDice: (roomCode: string): ClientMessage => ({
    type: "ROLL_DICE",
    roomCode: roomCode.toUpperCase(),
  }),
  announce: (roomCode: string, announcement: Announcement): ClientMessage => ({
    type: "ANNOUNCE",
    roomCode: roomCode.toUpperCase(),
    announcement,
  }),
  challenge: (roomCode: string, challengeType: ChallengeType): ClientMessage => ({
    type: "CHALLENGE",
    roomCode: roomCode.toUpperCase(),
    challengeType,
  }),
  leaveRoom: (roomCode: string): ClientMessage => ({
    type: "LEAVE_ROOM",
    roomCode: roomCode.toUpperCase(),
  }),
};

/** ---------- server -> client ---------- */

export const SERVER_MESSAGE_TYPES = [
  "ROOM_CREATED",
  "ROOM_JOINED",
  "ROOM_UPDATED",
  "GAME_STARTED",
  "YOUR_TURN",
  "ANNOUNCEMENT",
  "CHALLENGE_RESULT",
  "PLAYER_ELIMINATED",
  "GAME_OVER",
  "PLAYER_LEFT",
  "ERROR",
] as const;

export type ServerMessageType = (typeof SERVER_MESSAGE_TYPES)[number];

/**
 * Server payloads are intentionally loose: the backend is the authority and may
 * add fields. Unknown message types must never break the app.
 */
export interface ServerMessage {
  type: ServerMessageType | string;
  roomState?: RoomState;
  roomCode?: string;
  playerId?: string;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

export type WebSocketMessage = ClientMessage | ServerMessage;

export function parseServerMessage(raw: string): ServerMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const message = parsed as ServerMessage;
    if (typeof message.type !== "string") return null;
    return message;
  } catch {
    return null;
  }
}

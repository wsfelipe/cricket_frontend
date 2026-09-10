import { create } from "zustand";
import { defaultAvatar, loadAvatar } from "@/components/avatar/avatarConfig";
import { announcementLabel } from "@/types/game";
import type { AvatarConfig, ChallengeResult, GameEvent, Player, RoomState, WebSocketStatus } from "@/types/game";
import type { ServerMessage } from "@/services/websocket/messages";

const STORAGE_KEYS = {
  playerName: "cricket.playerName",
  playerId: "cricket.playerId",
  roomCode: "cricket.roomCode",
} as const;

function readLocal(key: string): string {
  if (typeof window === "undefined") return "";
  try { return window.localStorage.getItem(key) ?? ""; } catch { return ""; }
}

function writeLocal(key: string, value: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch { /* storage can be unavailable */ }
}

function asDice(value: unknown): number[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const dice = value.filter((item): item is number => typeof item === "number" && item >= 1 && item <= 6);
  return dice.length === value.length ? dice : null;
}

function nameOf(value: unknown): string | null {
  if (typeof value === "string" && value) return value;
  if (value && typeof value === "object" && "name" in value && typeof value.name === "string") return value.name;
  return null;
}

function nextActiveIndex(room: RoomState, startIndex: number): number {
  for (let offset = 1; offset <= room.players.length; offset += 1) {
    const index = (startIndex + offset) % room.players.length;
    if (room.players[index]?.isActive) return index;
  }
  return startIndex;
}

function withCurrentPlayer(room: RoomState, index: number): RoomState {
  return {
    ...room,
    currentPlayerIndex: index,
    players: room.players.map((player, playerIndex) => ({
      ...player,
      isCurrentPlayer: playerIndex === index,
    })),
  };
}

export interface GameStoreState {
  status: WebSocketStatus;
  error: string | null;
  pendingAction: string | null;

  playerName: string;
  playerId: string | null;
  roomCode: string | null;
  avatar: AvatarConfig;

  room: RoomState | null;
  /** Dice the server sent privately to this client. Never inferred locally. */
  privateDice: number[] | null;
  /** Dice publicly revealed by a CHALLENGE_RESULT. */
  revealedDice: number[] | null;
  challengeResult: ChallengeResult | null;
  gameOver: ServerMessage | null;
  turnPulse: number;
  events: GameEvent[];

  setStatus: (status: WebSocketStatus) => void;
  setError: (error: string | null) => void;
  setPendingAction: (action: string | null) => void;
  setPlayerName: (name: string) => void;
  setAvatar: (avatar: AvatarConfig) => void;
  dismissChallengeResult: () => void;
  handleServerMessage: (message: ServerMessage) => void;
  resetSession: () => void;
  hydrateFromStorage: () => void;
}

let eventSeq = 0;

export const useGameStore = create<GameStoreState>((set, get) => ({
  status: "idle",
  error: null,
  pendingAction: null,

  playerName: "",
  playerId: null,
  roomCode: null,
  avatar: defaultAvatar,

  room: null,
  privateDice: null,
  revealedDice: null,
  challengeResult: null,
  gameOver: null,
  turnPulse: 0,
  events: [],

  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  setPendingAction: (pendingAction) => set({ pendingAction }),

  setPlayerName: (playerName) => {
    writeLocal(STORAGE_KEYS.playerName, playerName);
    set({ playerName });
  },

  setAvatar: (avatar) => set({ avatar }),

  dismissChallengeResult: () => set({ challengeResult: null }),

  hydrateFromStorage: () =>
    set({
      playerName: readLocal(STORAGE_KEYS.playerName),
      playerId: readLocal(STORAGE_KEYS.playerId) || null,
      roomCode: readLocal(STORAGE_KEYS.roomCode) || null,
      avatar: loadAvatar(),
    }),

  resetSession: () => {
    writeLocal(STORAGE_KEYS.playerId, null);
    writeLocal(STORAGE_KEYS.roomCode, null);
    set({
      playerId: null,
      roomCode: null,
      room: null,
      privateDice: null,
      revealedDice: null,
      challengeResult: null,
      gameOver: null,
      error: null,
      pendingAction: null,
      events: [],
    });
  },

  handleServerMessage: (message) => {
    const state = get();
    const patch: Partial<GameStoreState> = { pendingAction: null };
    const events: GameEvent[] = [];

    const pushEvent = (text: string, tone: GameEvent["tone"] = "info") => {
      eventSeq += 1;
      events.push({ id: `e${eventSeq}`, at: Date.now(), text, tone });
    };

    if (message.roomState && typeof message.roomState === "object") {
      const room = message.roomState;
      patch.room = room;
      if (room.code) {
        patch.roomCode = room.code;
        writeLocal(STORAGE_KEYS.roomCode, room.code);
      }
    }

    if (typeof message.playerId === "string" && message.playerId) {
      patch.playerId = message.playerId;
      writeLocal(STORAGE_KEYS.playerId, message.playerId);
    }
    if (typeof message.roomCode === "string" && message.roomCode) {
      const normalizedRoomCode = message.roomCode.toUpperCase();
      patch.roomCode = normalizedRoomCode;
      writeLocal(STORAGE_KEYS.roomCode, normalizedRoomCode);
    }

    // Private dice: only ever what the server explicitly sent to THIS client,
    // outside of roomState. Never reconstructed.
    const privateDice =
      asDice(message["dice"]) ??
      (message.type !== "CHALLENGE_RESULT" ? asDice(message["diceResult"]) : null) ??
      (message.type === "YOUR_TURN" ? asDice(message.roomState?.diceResult) : null);

    switch (message.type) {
      case "ROOM_CREATED":
        pushEvent("Sala criada.", "good");
        patch.error = null;
        break;
      case "ROOM_JOINED":
        pushEvent("Você entrou na sala.", "good");
        patch.error = null;
        break;
      case "ROOM_UPDATED":
        break;
      case "GAME_STARTED":
        patch.privateDice = null;
        patch.revealedDice = null;
        patch.challengeResult = null;
        patch.gameOver = null;
        pushEvent("A partida começou!", "good");
        break;
      case "YOUR_TURN":
        patch.turnPulse = state.turnPulse + 1;
        patch.privateDice = privateDice;
        pushEvent("É a sua vez.", "good");
        break;
      case "ANNOUNCEMENT": {
        const who = nameOf(message["player"]) ?? nameOf(message["playerName"]);
        const what = announcementLabel(
          (message["announcement"] as string | undefined) ??
            (message.roomState?.currentAnnouncement as string | undefined),
        );
        pushEvent(who ? `${who} anunciou: ${what}` : `Anúncio: ${what}`);
        // announcement is over -> private dice go back into hiding
        patch.privateDice = null;
        patch.revealedDice = null;
        // The server broadcasts ANNOUNCEMENT before advancing currentPlayerIndex.
        // Project that turn locally until the authoritative YOUR_TURN arrives.
        const announcementRoom = patch.room ?? state.room;
        if (announcementRoom && announcementRoom.gamePhase === "challenging") {
          const announcerIndex = announcementRoom.lastAnnouncingPlayerIndex ?? announcementRoom.currentPlayerIndex;
          patch.room = withCurrentPlayer(announcementRoom, nextActiveIndex(announcementRoom, announcerIndex));
        }
        break;
      }
      case "CHALLENGE_RESULT": {
        const result = ((message["result"] as ChallengeResult | undefined) ??
          message) as ChallengeResult;
        patch.challengeResult = result;
        patch.revealedDice = asDice(result.dice) ?? asDice(result.diceResult);
        patch.privateDice = null;
        const challengeRoom = patch.room ?? state.room;
        const winnerName = nameOf(result.winner);
        if (challengeRoom && challengeRoom.gamePhase !== "ended" && winnerName) {
          const winnerIndex = challengeRoom.players.findIndex((player) => player.name === winnerName);
          if (winnerIndex >= 0) patch.room = withCurrentPlayer(challengeRoom, winnerIndex);
        }
        const winner = nameOf(result.winner);
        const loser = nameOf(result.loser);
        pushEvent(
          winner || loser
            ? `Desafio resolvido — vence ${winner ?? "?"}, perde ${loser ?? "?"}`
            : "Desafio resolvido.",
          "warn",
        );
        break;
      }
      case "PLAYER_ELIMINATED": {
        const who = nameOf(message["player"]) ?? nameOf(message["playerName"]);
        pushEvent(who ? `${who} foi eliminado!` : "Um jogador foi eliminado!", "warn");
        break;
      }
      case "GAME_OVER":
        patch.gameOver = message;
        patch.privateDice = null;
        pushEvent("Fim de jogo.", "good");
        break;
      case "PLAYER_LEFT": {
        const who = nameOf(message["player"]) ?? nameOf(message["playerName"]);
        pushEvent(who ? `${who} saiu da sala.` : "Um jogador saiu da sala.", "warn");
        break;
      }
      case "ERROR": {
        const text =
          (typeof message.message === "string" && message.message) ||
          (typeof message.error === "string" && message.error) ||
          "O servidor recusou a ação.";
        patch.error = text;
        pushEvent(text, "warn");
        break;
      }
      default:
        // Unknown message types are ignored safely.
        break;
    }

    if (privateDice && message.type !== "YOUR_TURN" && message.type !== "ANNOUNCEMENT") {
      patch.privateDice = privateDice;
    }

    if (events.length) {
      patch.events = [...events.reverse(), ...state.events].slice(0, 30);
    }

    set(patch as GameStoreState);
  },
}));

/** Derived helpers (kept outside the store to stay serializable). */
export function selectMe(state: GameStoreState): Player | null {
  const players = state.room?.players ?? [];
  if (state.playerId) {
    const byId = players.find((p) => p.id === state.playerId);
    if (byId) return byId;
  }
  return players.find((p) => p.name === state.playerName) ?? null;
}

export function selectCurrentPlayer(state: GameStoreState): Player | null {
  const room = state.room;
  if (!room) return null;
  return room.players[room.currentPlayerIndex] ?? null;
}

export function selectIsMyTurn(state: GameStoreState): boolean {
  const me = selectMe(state);
  const current = selectCurrentPlayer(state);
  return Boolean(me && current && me.id === current.id);
}

import { useCallback, useMemo } from "react";
import { clientMessages } from "@/services/websocket/messages";
import {
  selectCurrentPlayer,
  selectIsMyTurn,
  selectMe,
  useGameStore,
} from "@/store/gameStore";
import { playSound } from "@/services/audio/audio";
import type { Announcement, ChallengeType } from "@/types/game";
import { useWebSocket } from "@/hooks/useWebsocket/useWebSocket";

export function useGame() {
  const { send, status, isOpen, reconnect } = useWebSocket();
  const store = useGameStore();
  const setPendingAction = useGameStore((s) => s.setPendingAction);

  const me = useMemo(() => selectMe(store), [store]);
  const currentPlayer = useMemo(() => selectCurrentPlayer(store), [store]);
  const isMyTurn = useMemo(() => selectIsMyTurn(store), [store]);

  const room = store.room;
  const roomCode = room?.code ?? store.roomCode ?? null;

  const createRoom = useCallback(
    (playerName: string) => {
      setPendingAction("CREATE_ROOM");
      if (!send(clientMessages.createRoom(playerName))) setPendingAction(null);
    },
    [send, setPendingAction],
  );

  const joinRoom = useCallback(
    (code: string, playerName: string) => {
      setPendingAction("JOIN_ROOM");
      if (!send(clientMessages.joinRoom(code, playerName))) setPendingAction(null);
    },
    [send, setPendingAction],
  );

  const startGame = useCallback(() => {
    if (!roomCode) return;
    setPendingAction("START_GAME");
    if (!send(clientMessages.startGame(roomCode))) setPendingAction(null);
  }, [roomCode, send, setPendingAction]);

  const toggleReady = useCallback(() => {
    if (!roomCode) return;
    setPendingAction("TOGGLE_READY");
    if (!send(clientMessages.toggleReady(roomCode))) setPendingAction(null);
  }, [roomCode, send, setPendingAction]);

  const rollDice = useCallback(() => {
    if (!roomCode) return;
    setPendingAction("ROLL_DICE");
    if (send(clientMessages.rollDice(roomCode))) playSound("roll");
    else setPendingAction(null);
  }, [roomCode, send, setPendingAction]);

  const announce = useCallback(
    (announcement: Announcement) => {
      if (!roomCode) return;
      setPendingAction("ANNOUNCE");
      if (send(clientMessages.announce(roomCode, announcement))) playSound("announcement");
      else setPendingAction(null);
    },
    [roomCode, send, setPendingAction],
  );

  const challenge = useCallback(
    (challengeType: ChallengeType) => {
      if (!roomCode) return;
      setPendingAction("CHALLENGE");
      if (send(clientMessages.challenge(roomCode, challengeType))) playSound("challenge");
      else setPendingAction(null);
    },
    [roomCode, send, setPendingAction],
  );

  const leaveRoom = useCallback(() => {
    if (roomCode) send(clientMessages.leaveRoom(roomCode));
    store.resetSession();
  }, [roomCode, send, store]);

  return {
    status,
    isOpen,
    reconnect,
    room,
    roomCode,
    me,
    currentPlayer,
    isMyTurn,
    phase: room?.gamePhase ?? "waiting",
    privateDice: store.privateDice,
    revealedDice: store.revealedDice,
    challengeResult: store.challengeResult,
    gameOver: store.gameOver,
    events: store.events,
    error: store.error,
    pendingAction: store.pendingAction,
    turnPulse: store.turnPulse,
    createRoom,
    joinRoom,
    startGame,
    toggleReady,
    rollDice,
    announce,
    challenge,
    leaveRoom,
  };
}

import { useCallback, useEffect } from "react";
import { gameSocket, resolveSocketUrl } from "@/services/websocket/GameSocket";
import type { ClientMessage } from "@/services/websocket/messages";
import { useGameStore } from "@/store/gameStore";

/**
 * Binds the singleton socket to the global store.
 * Mount once, near the root of the app.
 */
export function useWebSocketBridge() {
  const setStatus = useGameStore((s) => s.setStatus);
  const setError = useGameStore((s) => s.setError);
  const handleServerMessage = useGameStore((s) => s.handleServerMessage);
  const hydrateFromStorage = useGameStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  useEffect(() => {
    const offStatus = gameSocket.onStatus(setStatus);
    const offMessage = gameSocket.onMessage(handleServerMessage);
    const offError = gameSocket.onError(setError);
    gameSocket.connect();
    return () => {
      offStatus();
      offMessage();
      offError();
    };
  }, [setStatus, setError, handleServerMessage]);
}

export function useWebSocket() {
  const status = useGameStore((s) => s.status);
  const error = useGameStore((s) => s.error);
  const setError = useGameStore((s) => s.setError);

  const send = useCallback(
    (message: ClientMessage): boolean => {
      const ok = gameSocket.send(message);
      if (ok) setError(null);
      return ok;
    },
    [setError],
  );

  const reconnect = useCallback(() => {
    setError(null);
    gameSocket.disconnect();
    gameSocket.connect();
  }, [setError]);

  const disconnect = useCallback(() => gameSocket.disconnect(), []);

  return {
    status,
    error,
    isOpen: status === "open",
    url: resolveSocketUrl(),
    send,
    reconnect,
    disconnect,
    clearError: () => setError(null),
  };
}

import type { WebSocketStatus } from "@/types/game";
import { parseServerMessage, type ClientMessage, type ServerMessage } from "./messages";

export function resolveSocketUrl(): string {
  const fromEnv = import.meta.env["VITE_WS_URL"] as string | undefined;
  if (fromEnv) return fromEnv;
  throw "Provide a Valid url";
}

type StatusListener = (status: WebSocketStatus) => void;
type MessageListener = (message: ServerMessage) => void;
type ErrorListener = (error: string) => void;

/**
 * Thin, framework-agnostic WebSocket wrapper.
 * No automatic reconnection: reconnecting is always an explicit user action,
 * and any game state must come back from the server.
 */
export class GameSocket {
  private socket: WebSocket | null = null;
  private status: WebSocketStatus = "idle";
  private statusListeners = new Set<StatusListener>();
  private messageListeners = new Set<MessageListener>();
  private errorListeners = new Set<ErrorListener>();

  getStatus(): WebSocketStatus {
    return this.status;
  }

  isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  onStatus(listener: StatusListener): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  onMessage(listener: MessageListener): () => void {
    this.messageListeners.add(listener);
    return () => this.messageListeners.delete(listener);
  }

  onError(listener: ErrorListener): () => void {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  private setStatus(status: WebSocketStatus) {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  private emitError(error: string) {
    this.errorListeners.forEach((listener) => listener(error));
  }

  connect(url: string = resolveSocketUrl()): void {
    if (typeof window === "undefined") return;
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.setStatus("connecting");

    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.setStatus("error");
      this.emitError(`Não foi possível abrir a conexão com ${url}`);
      return;
    }

    this.socket = socket;

    socket.onopen = () => this.setStatus("open");

    socket.onmessage = (event: MessageEvent<string>) => {
      const data = typeof event.data === "string" ? event.data : "";
      const message = parseServerMessage(data);
      if (!message) return; // malformed payloads are ignored, never fatal
      this.messageListeners.forEach((listener) => {
        try {
          listener(message);
        } catch (error) {
          console.error("[GameSocket] listener error", error);
        }
      });
    };

    socket.onerror = () => {
      this.setStatus("error");
      this.emitError("Erro de conexão com o servidor do jogo.");
    };

    socket.onclose = () => {
      this.socket = null;
      if (this.status !== "error") this.setStatus("closed");
    };
  }

  disconnect(): void {
    if (!this.socket) {
      this.setStatus("closed");
      return;
    }
    this.setStatus("closing");
    try {
      this.socket.close();
    } catch {
      /* noop */
    }
    this.socket = null;
    this.setStatus("closed");
  }

  /** Never queues: sending is blocked while the socket is not OPEN. */
  send(message: ClientMessage): boolean {
    if (!this.isOpen() || !this.socket) {
      this.emitError("Conexão indisponível. Reconecte antes de jogar.");
      return false;
    }
    try {
      this.socket.send(JSON.stringify(message));
      return true;
    } catch {
      this.emitError("Falha ao enviar a ação para o servidor.");
      return false;
    }
  }
}

export const gameSocket = new GameSocket();

import { useEffect, useState } from "react";
import { useGame } from "@/hooks/useWebsocket/useGame";
import { useWebSocketBridge } from "@/hooks/useWebsocket/useWebSocket";
import { useGameStore } from "@/store/gameStore";
import {
  ANNOUNCEMENTS,
  ANNOUNCEMENT_LABELS,
  ANNOUNCEMENT_RANK,
  type Announcement,
  type Player,
} from "@/types/game";
import {
  initAudioPreference,
  isAudioEnabled,
  setAudioEnabled,
  unlockAudio,
} from "@/services/audio/audio";
import { Dice3D } from "@/three/Dice3D";
import { isSupabaseConfigured, signIn, signUp } from "@/services/auth/supabase";

function ConnectionBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    idle: "Inicializando",
    connecting: "Conectando",
    open: "Online",
    closing: "Encerrando",
    closed: "Desconectado",
    error: "Erro de conexão",
  };

  return <span className={`connection connection-${status}`}>{labels[status] ?? status}</span>;
}

function PlayerList({
  players,
  playerId,
  currentPlayer,
}: {
  players: Player[];
  playerId: string | null;
  currentPlayer: Player | null;
}) {
  return (
    <section className="panel players-panel">
      <div className="section-heading">
        <h2>Jogadores</h2>
        <span>{players.length}</span>
      </div>
      <div className="players-list">
        {players.map((player) => (
          <div
            className={`player-row ${player.id === currentPlayer?.id ? "is-current" : ""} ${
              !player.isActive ? "is-out" : ""
            }`}
            key={player.id}
          >
            <div className="player-avatar">{player.name.slice(0, 1).toUpperCase()}</div>
            <div className="player-info">
              <strong>
                {player.name}
                {player.id === playerId ? " (você)" : ""}
              </strong>
              <small>
                {!player.isActive
                  ? "Eliminado"
                  : player.id === players[0]?.id
                    ? `Anfitrião${player.ready ? " · Pronto" : " · Aguardando"}`
                    : player.id === currentPlayer?.id
                      ? `Sua vez${player.ready ? " · Pronto" : ""}`
                      : player.ready
                        ? "Pronto"
                        : "Na partida"}
              </small>
            </div>
            <div className="lives" aria-label={`${player.lives} vidas`}>
              {"♥".repeat(Math.max(0, player.lives))}
              <span>{"♥".repeat(Math.max(0, 3 - player.lives))}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ResultModal({ result, onClose }: { result: Record<string, unknown>; onClose: () => void }) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 5000);
    return () => window.clearTimeout(timeout);
  }, [onClose]);

  const winner =
    typeof result.winner === "string" ? result.winner : (result.winner as Player | null)?.name;
  const loser =
    typeof result.loser === "string" ? result.loser : (result.loser as Player | null)?.name;

  return (
    <div className="toast-region" aria-live="polite">
      <section className="result-toast">
        <div className="result-mark">!</div>
        <p className="eyebrow">Desafio resolvido</p>
        <h2>{winner ? `${winner} venceu` : "Resultado recebido"}</h2>
        <p>
          {loser
            ? `${loser} perdeu ${String(result.livesLost ?? 1)} vida(s).`
            : "As vidas foram atualizadas."}
        </p>
        <p className="result-reason">
          {typeof result.reason === "string" ? result.reason : ""}
        </p>
        <button className="toast-close" onClick={onClose} aria-label="Fechar anúncio">×</button>
        <div className="toast-progress" />
      </section>
    </div>
  );
}

function AccountPanel() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setFeedback(null);
    const result = mode === "signin" ? await signIn(email, password) : await signUp(email, password);
    setFeedback(result.error?.message ?? (mode === "signup" ? "Confira seu e-mail para confirmar a conta." : "Login realizado."));
    setBusy(false);
  };

  return (
    <section className="account-panel">
      <button className="account-toggle" onClick={() => setOpen(!open)}>
        {open ? "Fechar acesso" : "Acessar com conta"}
      </button>
      {open && (
        <div className="account-form">
          <p className="eyebrow">Conta opcional</p>
          <label htmlFor="account-email">E-mail</label>
          <input id="account-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="account-password">Senha</label>
          <input id="account-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button className="button button-primary" disabled={!email || password.length < 6 || busy} onClick={submit}>
            {busy ? "Enviando..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
          <button className="account-mode" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "Ainda não tenho conta" : "Já tenho uma conta"}
          </button>
          {feedback && <p className="hint">{feedback}</p>}
          {!isSupabaseConfigured && <p className="hint">Login aguardando as variáveis do Supabase.</p>}
        </div>
      )}
    </section>
  );
}

function Lobby() {
  const game = useGame();
  const playerName = useGameStore((state) => state.playerName);
  const setPlayerName = useGameStore((state) => state.setPlayerName);
  const [roomCode, setRoomCode] = useState("");
  const [audio, setAudio] = useState(isAudioEnabled());

  useEffect(() => {
    initAudioPreference();
    setAudio(isAudioEnabled());
  }, []);

  const submit = (action: () => void) => {
    unlockAudio();
    action();
  };

  return (
    <main className="app-shell lobby-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">C</span>
          <span>CRICKET</span>
        </div>
        <div className="topbar-actions">
          <ConnectionBadge status={game.status} />
          <button
            className="icon-button"
            onClick={() => {
              unlockAudio();
              setAudioEnabled(!audio);
              setAudio(!audio);
            }}
            aria-label="Alternar áudio"
          >
            {audio ? "Som" : "Mudo"}
          </button>
        </div>
      </header>

      <section className="lobby-content">
        <div className="intro">
          <p className="eyebrow">Jogo de dados multiplayer</p>
          <h1>Faça sua jogada.</h1>
          <p>Entre em uma mesa, blefe com coragem e desafie o anúncio certo.</p>
        </div>

        <section className="panel lobby-card">
          <label htmlFor="player-name">Seu nome</label>
          <input
            id="player-name"
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Como você quer ser chamado?"
            maxLength={24}
          />
          <button
            className="button button-primary"
            disabled={!playerName.trim() || !game.isOpen || Boolean(game.pendingAction)}
            onClick={() => submit(() => game.createRoom(playerName.trim()))}
          >
            {game.pendingAction === "CREATE_ROOM" ? "Criando..." : "Criar sala"}
          </button>

          <div className="divider">
            <span>ou entre em uma sala</span>
          </div>

          <label htmlFor="room-code">Código da sala</label>
          <input
            id="room-code"
            value={roomCode}
            onChange={(event) =>
              setRoomCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))
            }
            placeholder="ABC123"
            maxLength={8}
          />
          <button
            className="button button-secondary"
            disabled={!playerName.trim() || roomCode.length < 4 || !game.isOpen || Boolean(game.pendingAction)}
            onClick={() => submit(() => game.joinRoom(roomCode, playerName.trim()))}
          >
            {game.pendingAction === "JOIN_ROOM" ? "Entrando..." : "Entrar na sala"}
          </button>

          {game.error && <p className="error-message">{game.error}</p>}
          {!game.isOpen && <p className="hint">Aguardando conexão com o servidor...</p>}
        </section>
        <AccountPanel />
      </section>
    </main>
  );
}

function GameRoom() {
  const game = useGame();
  const playerId = useGameStore((state) => state.playerId);
  const [audio, setAudio] = useState(isAudioEnabled());
  const [copied, setCopied] = useState(false);
  const room = game.room;

  if (!room) return <Lobby />;

  const previousRank = room.currentAnnouncement
    ? (ANNOUNCEMENT_RANK[room.currentAnnouncement as Announcement] ?? -1)
    : -1;
  const canAct = game.isOpen && !game.pendingAction && game.isMyTurn;

  const copyRoom = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard can be unavailable
    }
  };

  return (
    <main className="app-shell game-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">C</span>
          <span>CRICKET</span>
        </div>

        <div className="room-code">
          <small>SALA</small>
          <button onClick={copyRoom}>
            {room.code} <span>{copied ? "Copiado" : "Copiar"}</span>
          </button>
        </div>

        <div className="topbar-actions">
          <ConnectionBadge status={game.status} />
          <button
            className="icon-button"
            onClick={() => {
              unlockAudio();
              setAudioEnabled(!audio);
              setAudio(!audio);
            }}
          >
            {audio ? "Som" : "Mudo"}
          </button>
        </div>
      </header>

      <div className="game-layout">
        <aside>
          <PlayerList
            players={room.players}
            playerId={playerId}
            currentPlayer={game.currentPlayer}
          />
        </aside>

        <section className="game-main">
          <div className="round-line">
            <span>Rodada {room.round}</span>
            <strong>
              {room.gamePhase === "waiting"
                ? "Sala aguardando"
                : room.gamePhase === "ended"
                  ? "Partida encerrada"
                  : `Fase: ${room.gamePhase}`}
            </strong>
          </div>

          <section className={`panel table-panel pulse-${game.turnPulse}`}>
            <div className="turn-banner">
              {game.currentPlayer ? (
                <>
                  <span className="turn-dot" /> Vez de <strong>{game.currentPlayer.name}</strong>
                </>
              ) : (
                "Aguardando jogadores"
              )}
            </div>

            <div className="announcement">
              <small>ANÚNCIO ATUAL</small>
              <strong>
                {room.currentAnnouncement
                  ? ANNOUNCEMENT_LABELS[room.currentAnnouncement as Announcement] ?? room.currentAnnouncement
                  : "Nenhum anúncio"}
              </strong>
              <span>
                {room.lastAnnouncingPlayerIndex !== null
                  ? `Anunciado por ${room.players[room.lastAnnouncingPlayerIndex]?.name ?? "jogador"}`
                  : "A primeira jogada começa em 4"}
              </span>
            </div>

            <Dice3D
              values={game.revealedDice ?? game.privateDice}
              rolling={
                (game.pendingAction === "ROLL_DICE" && game.isMyTurn) ||
                (game.pendingAction === "CHALLENGE" && game.isMyTurn)
              }
            />
          </section>

          <section className="panel actions-panel">
            <div className="section-heading">
              <h2>Ações</h2>
              {game.pendingAction && <span className="pending">Enviando...</span>}
            </div>

            {room.gamePhase === "waiting" && (
              <>
                <p>Todos precisam ficar prontos. O anfitrião inicia quando a sala estiver pronta.</p>
                <button
                  className="button button-secondary"
                  disabled={!game.isOpen || Boolean(game.pendingAction)}
                  onClick={game.toggleReady}
                >
                  {game.pendingAction === "TOGGLE_READY"
                    ? "Atualizando..."
                    : game.me?.ready
                      ? "Cancelar pronto"
                      : "Estou pronto"}
                </button>
                <button
                  className="button button-primary"
                  disabled={
                    room.players.length < 2 ||
                    room.players.some((player) => !player.ready) ||
                    room.players[0]?.id !== playerId ||
                    !game.isOpen ||
                    Boolean(game.pendingAction)
                  }
                  onClick={game.startGame}
                >
                  {room.players[0]?.id === playerId ? "Começar partida" : "Aguardando o anfitrião"}
                </button>
              </>
            )}

            {room.gamePhase === "rolling" && (
              <>
                <p>
                  {game.isMyTurn
                    ? "Role os dados para descobrir sua jogada."
                    : "Aguarde o jogador da vez rolar os dados."}
                </p>
                <button
                  className="button button-primary"
                  disabled={!canAct}
                  onClick={game.rollDice}
                >
                  {game.pendingAction === "ROLL_DICE" ? "Rolando..." : "Rolar dados"}
                </button>
              </>
            )}

            {room.gamePhase === "announcing" && (
              <>
                <p>
                  {game.isMyTurn
                    ? "Escolha um anúncio. Blefar faz parte do jogo."
                    : "O jogador da vez está escolhendo um anúncio."}
                </p>
                <div className="announcement-grid">
                  {ANNOUNCEMENTS.map((announcement) => (
                    <button
                      className="choice-button"
                      key={announcement}
                      disabled={!canAct || (previousRank >= 0 && ANNOUNCEMENT_RANK[announcement] < previousRank)}
                      onClick={() => game.announce(announcement)}
                    >
                      {ANNOUNCEMENT_LABELS[announcement]}
                    </button>
                  ))}
                </div>
              </>
            )}

            {room.gamePhase === "challenging" && (
              <>
                <p>
                  {game.isMyTurn
                    ? "Você aceita esse anúncio ou acha que é blefe?"
                    : "Aguarde o próximo jogador decidir."}
                </p>
                <div className="action-row">
                  <button
                    className="button button-danger"
                    disabled={!canAct}
                    onClick={() => game.challenge("CALL_BLUFF")}
                  >
                    Desafiar
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={!canAct}
                    onClick={() => game.challenge("BUY")}
                  >
                    Comprar
                  </button>
                </div>
              </>
            )}

            {room.gamePhase === "ended" && (
              <div className="ended-copy">
                <strong>
                  {typeof room.winner === "string" ? `${room.winner} venceu!` : "A partida terminou."}
                </strong>
                <p>Volte à tela inicial para começar outra partida.</p>
                <button className="button button-secondary" onClick={game.leaveRoom}>
                  Voltar ao início
                </button>
              </div>
            )}

            {!game.isOpen && (
              <div className="disconnect-box">
                <span>Você está desconectado.</span>
                <button className="button button-secondary" onClick={game.reconnect}>
                  Reconectar
                </button>
              </div>
            )}

            {game.error && <p className="error-message">{game.error}</p>}
          </section>

          <section className="events">
            {game.events.slice(0, 4).map((event) => (
              <p className={`event-${event.tone}`} key={event.id}>
                {event.text}
              </p>
            ))}
          </section>

          <button className="leave-button" onClick={game.leaveRoom}>
            Sair da sala
          </button>
        </section>
      </div>

      {game.challengeResult && (
        <ResultModal
          result={game.challengeResult}
          onClose={() => useGameStore.getState().dismissChallengeResult()}
        />
      )}
    </main>
  );
}

export default function App() {
  useWebSocketBridge();
  const room = useGameStore((state) => state.room);

  return room ? <GameRoom /> : <Lobby />;
}


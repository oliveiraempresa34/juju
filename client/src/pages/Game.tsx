import React, { useEffect, useMemo } from "react";
import { GameScene } from "../game/GameScene";
import { useRoomStore } from "../store/useRoom";
import { useAppStore } from "../store/useApp";
import { useGameStore } from "../store/useGame";

const GamePage: React.FC = () => {
  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  const { setScreen } = useAppStore();
  const { gameMode } = useGameStore();
  const { status, players, localPlayerId, seed, error } = useRoomStore((state) => ({
    status: state.status,
    players: state.players,
    localPlayerId: state.localPlayerId,
    seed: state.seed,
    error: state.error
  }));

  const localPlayer = localPlayerId ? players[localPlayerId] : undefined;
  const remoteDrivers = useMemo(
    () =>
      Object.values(players).filter((player) => player.id !== localPlayerId),
    [players, localPlayerId]
  );

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      <GameScene />

      {/* Mostrador de erro apenas se houver erro */}
      {error && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            background: "rgba(255, 107, 129, 0.18)",
            border: "1px solid rgba(255, 107, 129, 0.55)",
            color: "#ff9aa9",
            padding: "10px 16px",
            borderRadius: 14,
            fontSize: 14,
            backdropFilter: "blur(12px)",
            boxShadow: "0 10px 24px rgba(255, 107, 129, 0.25)"
          }}
        >
          {error}
        </div>
      )}

      {gameMode === 'multiplayer' && remoteDrivers.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            background: "rgba(11, 17, 35, 0.78)",
            border: "1px solid rgba(34, 48, 86, 0.7)",
            color: "#E8ECF3",
            padding: "14px 20px",
            borderRadius: 18,
            maxWidth: 240,
            backdropFilter: "blur(18px)",
            boxShadow: "0 14px 28px rgba(12, 20, 32, 0.55)"
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: 12, color: "#A5AEBC" }}>Ghosts</div>
          {remoteDrivers.map((player) => (
            <div key={player.id} style={{ fontSize: 14, marginBottom: 6, color: "#E8ECF3" }}>
              {player.name} • {player.distance.toFixed(1)} u
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(17, 23, 35, 0.78)",
          border: "1px solid rgba(34, 48, 86, 0.65)",
          color: "#A5AEBC",
          padding: "12px 24px",
          borderRadius: 999,
          fontSize: 14,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          boxShadow: "0 12px 26px rgba(12, 20, 32, 0.45)",
          backdropFilter: "blur(14px)"
        }}
      >
        Hold click / tap / space to drift right
      </div>
    </div>
  );
};

export default GamePage;

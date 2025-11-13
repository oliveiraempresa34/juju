import { create } from "zustand";

export interface PlayerSnapshot {
  id: string;
  name: string;
  platformUserId?: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch?: number; // Inclinação para frente/trás
  roll?: number;  // Inclinação lateral (banking)
  pressing: boolean;
  distance: number;
  opacity: number;
  steering?: number;
  steeringIntensity?: number;
  eliminated?: boolean;
  timeAlive?: number;
  betAmount?: number;
  isWinner?: boolean;
}

type ConnectionStatus = "idle" | "connecting" | "connected" | "error";

interface RoomState {
  status: ConnectionStatus;
  players: Record<string, PlayerSnapshot>;
  localPlayerId?: string;
  seed: number;
  matchStatus?: string;
  betAmount?: number;
  roomType?: string;
  inviteCode?: string;
  prizePool?: number;
  countdown?: number;
  winnerId?: string;
  playerCount?: number;
  hostId?: string;
  error?: string;
  setStatus: (status: ConnectionStatus, error?: string) => void;
  setLocalPlayerId: (id: string) => void;
  setSeed: (seed: number) => void;
  upsertPlayer: (snapshot: PlayerSnapshot) => void;
  removePlayer: (id: string) => void;
  setMatchMeta: (meta: Partial<Omit<RoomState, "players" | "localPlayerId" | "seed" | "error" | "setStatus" | "setLocalPlayerId" | "setSeed" | "upsertPlayer" | "removePlayer" | "setMatchMeta" | "reset">>) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  status: "idle",
  players: {},
  seed: 0,
  setStatus: (status, error) => set({ status, error }),
  setLocalPlayerId: (localPlayerId) => set({ localPlayerId }),
  setSeed: (seed) => set({ seed }),
  upsertPlayer: (snapshot) =>
    set((state) => ({
      players: { ...state.players, [snapshot.id]: snapshot }
    })),
  removePlayer: (id) =>
    set((state) => {
      const nextPlayers = { ...state.players };
      delete nextPlayers[id];
      return { players: nextPlayers };
    }),
  setMatchMeta: (meta) =>
    set((state) => ({
      ...state,
      ...meta
    })),
  reset: () =>
    set({
      status: "idle",
      players: {},
      seed: 0,
      matchStatus: undefined,
      betAmount: undefined,
      roomType: undefined,
      inviteCode: undefined,
      prizePool: undefined,
      countdown: undefined,
      winnerId: undefined,
      playerCount: undefined,
      hostId: undefined,
      localPlayerId: undefined,
      error: undefined
    })
}));

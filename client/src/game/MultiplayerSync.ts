import { Client, Room, RoomAvailable } from "colyseus.js";
import { MESSAGE } from "./messages";
import type { PlayerInputState } from "./LocalPhysics";
import { PlayerSnapshot, useRoomStore } from "../store/useRoom";

interface DriftRoomState {
  players: any;
  seed: number;
  status: string;
  betAmount: number;
  roomType: string;
  inviteCode: string;
  prizePool: number;
  countdown: number;
  winnerId: string;
  playerCount: number;
  hostId: string;
}

export interface LobbyRoomSummary {
  roomId: string;
  betAmount: number;
  roomType: "public" | "private";
  inviteCode?: string;
  status: string;
  clients: number;
  maxClients: number;
  locked: boolean;
}

export interface ConnectOptions {
  queueType: "public" | "private";
  betAmount: number;
  inviteCode?: string;
  roomId?: string;
  createPrivate?: boolean;
  platformUserId?: string;
  displayName?: string;
}

export class MultiplayerSync {
  private readonly endpoint: string;
  private readonly client: Client;
  private room?: Room<DriftRoomState>;
  private syncLoopHandle?: number;
  private lastSyncTime: number = 0;

  constructor() {
    this.endpoint = import.meta.env.VITE_WS_URL || "ws://localhost:2567";
    this.client = new Client(this.endpoint);
  }

  async fetchAvailableRooms(): Promise<LobbyRoomSummary[]> {
    const rooms = await this.client.getAvailableRooms("drift");
    return rooms.map(this.normalizeRoomMetadata).filter(Boolean) as LobbyRoomSummary[];
  }

  async connect(options: ConnectOptions): Promise<void> {
    const store = useRoomStore.getState();
    store.setStatus("connecting");

    try {
      this.room = await this.joinWithOptions(options);
      store.setStatus("connected");
      store.setLocalPlayerId(this.room.sessionId);
      store.setSeed(this.room.state?.seed ?? Date.now());

      // CRITICAL: Atualizar metadata sempre que o state mudar
      this.room.onStateChange(() => {
        this.pushStateMeta();
      });

      this.room.onMessage("seed", ({ seed }) => {
        useRoomStore.getState().setSeed(seed);
      });

      // CRITICAL: Listener para atualizações do lobby (players entrando/saindo)
      this.room.onMessage(MESSAGE.LOBBY_INFO, (meta: any) => {
        console.log('[MultiplayerSync] 📨 LOBBY_INFO received:', meta);

        if (!meta || typeof meta !== "object") {
          return;
        }

        useRoomStore.getState().setMatchMeta({
          roomType: typeof meta.roomType === "string" ? meta.roomType : undefined,
          inviteCode: typeof meta.inviteCode === "string" ? meta.inviteCode.trim().toUpperCase() : undefined,
          hostId: typeof meta.hostId === "string" ? meta.hostId : undefined,
          betAmount: typeof meta.betAmount === "number" ? meta.betAmount : undefined,
          prizePool: typeof meta.prizePool === "number" ? meta.prizePool : undefined,
          playerCount: typeof meta.playerCount === "number" ? meta.playerCount : undefined,
          matchStatus: typeof meta.status === "string" ? meta.status : undefined
        });

        console.log('[MultiplayerSync] ✅ Lobby meta updated:', {
          playerCount: meta.playerCount,
          status: meta.status,
          hostId: meta.hostId
        });
      });

      this.room.onLeave(() => {
        this.stopSyncLoop();
        useRoomStore.getState().reset();
        this.room = undefined;
      });

      // Configurar listeners UMA ÚNICA VEZ
      this.bindStateListeners();
      this.pushStateMeta();

      const preferredName = options.displayName?.trim() || `Pilot-${this.room.sessionId.slice(0, 4)}`;
      this.room.send(MESSAGE.NAME, { name: preferredName });

      console.log('[MultiplayerSync] 🎮 connected', {
        sessionId: this.room.sessionId,
        hostId: (this.room.state as any)?.hostId,
        serverStatePlayers: Array.from((this.room.state.players || new Map()).keys())
      });

      // CRITICAL: Iniciar loop de sincronização contínua
      this.startSyncLoop();

      // Retry mechanism: Re-check players após 2 segundos
      setTimeout(() => {
        const currentPlayers = this.room?.state?.players;
        if (!currentPlayers) {
          console.error('[MultiplayerSync] ❌ NO PLAYERS MAP after 2s!');
          return;
        }

        const playerCount = currentPlayers.size || 0;
        const storePlayerCount = Object.keys(useRoomStore.getState().players).length;

        console.log('[MultiplayerSync] 🔍 Retry check (2s):', {
          mapSchemaSize: playerCount,
          storeSize: storePlayerCount,
          mapKeys: Array.from(currentPlayers.keys())
        });

        // Se há players no MapSchema mas não no store, re-sincronizar
        if (playerCount > 0 && storePlayerCount === 0) {
          console.warn('[MultiplayerSync] ⚠️ DESYNC DETECTED! Forcing re-sync...');
          this.syncExistingPlayers();
        }
      }, 2000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect";
      store.setStatus("error", message);
      throw error;
    }
  }

  sendInput(input: PlayerInputState) {
    if (!this.room) {
      console.warn('[MultiplayerSync] ⚠️ sendInput called but no room exists!');
      return;
    }

    this.room.send(MESSAGE.INPUT, {
      pressing: Boolean(input.accelerate || input.drifting),
      steering: input.steering,
      intensity: input.intensity
    });
  }

  sendPosition(position: { x: number; y: number; z: number; yaw: number; distance: number }) {
    if (!this.room) {
      return;
    }
    this.room.send(MESSAGE.POSITION, position);
  }

  sendPlayerReady() {
    if (!this.room) {
      console.warn('[MultiplayerSync] ⚠️ sendPlayerReady called but no room exists!');
      return;
    }
    console.log('[MultiplayerSync] 📤 Sending PLAYER_READY');
    this.room.send(MESSAGE.PLAYER_READY, { ready: true });
  }

  requestStartMatch() {
    if (!this.room) {
      return;
    }
    this.room.send(MESSAGE.START_MATCH, {});
  }

  dispose() {
    this.stopSyncLoop();
    this.room?.leave();
    this.room = undefined;
  }

  // CRITICAL: Loop de sincronização contínua para garantir atualizações
  private startSyncLoop() {
    if (this.syncLoopHandle !== undefined) {
      return; // Já está rodando
    }

    console.log('[MultiplayerSync] 🔄 Starting continuous sync loop');

    const syncFrame = () => {
      if (!this.room || !this.room.state || !this.room.state.players) {
        return;
      }

      // Sincronizar a cada frame (~16ms para 60fps)
      const now = performance.now();

      // Ler diretamente do state.players (MapSchema)
      const players = this.room.state.players;
      const localPlayerId = useRoomStore.getState().localPlayerId;

      if (players && players.size > 0) {
        // Atualizar todos os jogadores diretamente do state
        // CRITICAL FIX: NÃO sobrescrever o jogador local (controlado por física local)
        players.forEach((player: any, key: string) => {
          if (player && typeof player === "object") {
            // SKIP o jogador local - ele é controlado pela física local (LocalPhysics)
            // Apenas sincronizar outros jogadores (ghosts)
            if (key !== localPlayerId) {
              this.pushSnapshot(player, key);
            }
          }
        });
      }

      this.lastSyncTime = now;
      this.syncLoopHandle = requestAnimationFrame(syncFrame);
    };

    this.syncLoopHandle = requestAnimationFrame(syncFrame);
  }

  private stopSyncLoop() {
    if (this.syncLoopHandle !== undefined) {
      console.log('[MultiplayerSync] ⏸️ Stopping sync loop');
      cancelAnimationFrame(this.syncLoopHandle);
      this.syncLoopHandle = undefined;
    }
  }

  private async joinWithOptions(options: ConnectOptions) {
    const payload = {
      queueType: options.queueType,
      betAmount: options.betAmount,
      inviteCode: options.inviteCode,
      host: options.createPrivate === true,
      platformUserId: options.platformUserId,
      displayName: options.displayName
    };

    if (options.queueType === "private" && options.createPrivate) {
      return this.client.create<DriftRoomState>("drift", payload);
    }

    if (options.roomId) {
      return this.client.joinById<DriftRoomState>(options.roomId, payload);
    }

    return this.client.joinOrCreate<DriftRoomState>("drift", payload);
  }

  private bindStateListeners() {
    const room = this.room;
    if (!room) {
      console.error('[MultiplayerSync] ❌ bindStateListeners: NO ROOM!');
      return;
    }

    console.log('[MultiplayerSync] 🔗 bindStateListeners called', {
      hasState: !!room.state,
      hasPlayers: !!(room.state?.players),
      sessionId: room.sessionId
    });

    const players = room.state?.players;
    if (!players) {
      console.error('[MultiplayerSync] ❌ bindStateListeners: NO PLAYERS MAP!');
      return;
    }

    // Log detalhado do estado atual do MapSchema
    const currentKeys = Array.from(players.keys());
    console.log('[MultiplayerSync] 📊 Players MapSchema state:', {
      size: players.size,
      keys: currentKeys,
      playerObjects: Array.from(players.values()).map((p: any) => ({ id: p.id, name: p.name }))
    });

    // CRITICAL: Registrar callbacks para novos players
    console.log('[MultiplayerSync] 🎯 Registering onAdd callback');
    players.onAdd = (player: any, key: string) => {
      console.log('[MultiplayerSync] ✅ onAdd FIRED!', { key, name: player.name, id: player.id });

      const localPlayerId = useRoomStore.getState().localPlayerId;

      // Push inicial (SKIP se for jogador local)
      if (key !== localPlayerId) {
        this.pushSnapshot(player, key);
      }

      // CRITICAL: Registrar onChange para capturar atualizações adicionais
      // (o loop contínuo é a fonte primária, onChange é backup)
      player.onChange = () => {
        // SKIP jogador local (controlado por física local)
        if (key !== localPlayerId) {
          this.pushSnapshot(player, key);
        }
      };
    };

    players.onRemove = (_player: any, key: string) => {
      console.log('[MultiplayerSync] ❌ player removed:', key);
      useRoomStore.getState().removePlayer(key);
    };

    // CRITICAL: Processar players que já existem (entramos em sala existente)
    const playerCount = players.size || 0;
    const localPlayerId = useRoomStore.getState().localPlayerId;

    if (playerCount > 0) {
      console.log(`[MultiplayerSync] 📦 Processing ${playerCount} existing players`);
      players.forEach((player: any, key: string) => {
        console.log('[MultiplayerSync] 🔄 binding existing player:', { key, name: player.name, id: player.id });

        // Push inicial (SKIP se for jogador local)
        if (key !== localPlayerId) {
          this.pushSnapshot(player, key);
        }

        // CRITICAL: Registrar onChange para capturar mudanças
        player.onChange = () => {
          // SKIP jogador local (controlado por física local)
          if (key !== localPlayerId) {
            this.pushSnapshot(player, key);
          }
        };
      });
    } else {
      console.warn('[MultiplayerSync] ⚠️ NO existing players to bind - waiting for onAdd...');
    }
  }

  private syncExistingPlayers() {
    const players = this.room?.state?.players;
    if (!players) {
      console.error('[MultiplayerSync] ❌ syncExistingPlayers: no players map');
      return;
    }

    const localPlayerId = useRoomStore.getState().localPlayerId;

    console.log('[MultiplayerSync] 🔄 syncExistingPlayers called', {
      mapSize: players.size,
      mapKeys: Array.from(players.keys())
    });

    let syncedCount = 0;
    players.forEach((player: any, key: string) => {
      // SKIP jogador local (controlado por física local)
      if (key === localPlayerId) {
        console.debug('[MultiplayerSync] ⏭️ Skipping local player in sync:', key);
        return;
      }

      // Verificar se já foi processado
      const existing = useRoomStore.getState().players[key];
      if (!existing) {
        console.log('[MultiplayerSync] 🆕 Late sync player:', { key, name: player.name, id: player.id });
        this.pushSnapshot(player, key);
        syncedCount++;

        // CRITICAL: Registrar onChange para capturar movimentos
        player.onChange = () => {
          // SKIP jogador local (controlado por física local)
          if (key !== localPlayerId) {
            this.pushSnapshot(player, key);
          }
        };
      } else {
        console.debug('[MultiplayerSync] ⏭️ Player already synced:', key);
      }
    });

    console.log('[MultiplayerSync] ✅ syncExistingPlayers done:', { syncedCount });
  }

  private pushSnapshot(player: any, fallbackKey?: string) {
    if (!player || typeof player !== "object") {
      console.warn('[MultiplayerSync] ⚠️ pushSnapshot: invalid player object', { player, fallbackKey });
      return;
    }

    const snapshotId = typeof player.id === "string" && player.id.length > 0
      ? player.id
      : fallbackKey ?? "";

    const snapshot: PlayerSnapshot = {
      id: snapshotId,
      name: player.name ?? "Driver",
      platformUserId: player.platformId ?? undefined,
      x: player.x ?? 0,
      y: player.y ?? 0,
      z: player.z ?? 0,
      yaw: player.yaw ?? 0,
      pressing: Boolean(player.pressing),
      distance: player.distance ?? 0,
      opacity: player.opacity ?? 1,
      steering: player.steering ?? 0,
      steeringIntensity: player.steeringIntensity ?? 0,
      eliminated: Boolean(player.eliminated),
      timeAlive: player.timeAlive ?? 0,
      betAmount: player.betAmount ?? undefined,
      isWinner: Boolean(player.isWinner)
    };

    useRoomStore.getState().upsertPlayer(snapshot);
  }

  private pushStateMeta() {
    const room = this.room;
    if (!room) {
      return;
    }

    const state = room.state;
    const nextMeta: Record<string, unknown> = {};

    if (typeof state.status === "string") {
      nextMeta.matchStatus = state.status;
    }
    if (typeof state.betAmount === "number") {
      nextMeta.betAmount = state.betAmount;
    }
    if (typeof state.roomType === "string") {
      nextMeta.roomType = state.roomType;
    }

    const rawInvite = typeof state.inviteCode === "string" ? state.inviteCode.trim().toUpperCase() : "";
    const metadata = (room as any)?.metadata ?? {};
    const metadataInvite = typeof metadata.inviteCode === "string"
      ? (metadata.inviteCode as string).trim().toUpperCase()
      : "";
    const resolvedInvite = state.roomType === "private"
      ? (rawInvite.length >= 4 ? rawInvite : (metadataInvite.length >= 4 ? metadataInvite : undefined))
      : undefined;
    if (resolvedInvite) {
      nextMeta.inviteCode = resolvedInvite;
    }

    if (typeof state.prizePool === "number") {
      nextMeta.prizePool = state.prizePool;
    }
    if (typeof state.countdown === "number") {
      nextMeta.countdown = state.countdown;
    }
    if (typeof state.winnerId === "string" && state.winnerId.length > 0) {
      nextMeta.winnerId = state.winnerId;
    }
    if (typeof state.playerCount === "number") {
      nextMeta.playerCount = state.playerCount;
    }

    const resolvedHostId = typeof state.hostId === "string" && state.hostId.length > 0
      ? state.hostId
      : (typeof metadata.hostId === "string" && metadata.hostId.length > 0 ? metadata.hostId : undefined);
    if (resolvedHostId) {
      nextMeta.hostId = resolvedHostId;
    }

    if (Object.keys(nextMeta).length > 0) {
      console.debug('[MultiplayerSync] match meta update', nextMeta);
      useRoomStore.getState().setMatchMeta(nextMeta);
    }
  }

  private normalizeRoomMetadata(room: RoomAvailable): LobbyRoomSummary | undefined {
    const metadata = room.metadata || {};
    const roomType = metadata.roomType || metadata.queueType || "public";
    const betAmount = Number(metadata.betAmount || metadata.bet);

    return {
      roomId: room.roomId,
      betAmount: Number.isFinite(betAmount) ? betAmount : 0,
      roomType,
      inviteCode: metadata.inviteCode,
      status: metadata.status ?? "waiting",
      clients: room.clients,
      maxClients: room.maxClients,
      locked: Boolean(metadata.locked)
    };
  }
}

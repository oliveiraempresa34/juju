# Drift cash - Estrutura do Projeto

## Frontend (React + Babylon.js + TypeScript)
```
frontend/
├── src/
│   ├── components/
│   │   ├── Game/
│   │   │   ├── BabylonScene.tsx          # Cena principal Babylon.js
│   │   │   ├── GameUI.tsx                # HUD do jogo
│   │   │   ├── CameraController.ts       # Controlador da câmera cinematográfica
│   │   │   ├── CarController.ts          # Física arcade do carro
│   │   │   ├── TrackGenerator.ts         # Gerador procedural da pista
│   │   │   ├── MultiplayerSync.ts        # Sincronização multiplayer
│   │   │   └── ParticleSystem.ts         # Sistema de partículas
│   │   ├── UI/
│   │   │   ├── Login.tsx                 # Tela de login
│   │   │   ├── Lobby.tsx                 # Sala de espera
│   │   │   ├── RoomSelection.tsx         # Seleção/criação de salas
│   │   │   └── Results.tsx               # Resultados da corrida
│   │   └── Common/
│   │       ├── LoadingScreen.tsx
│   │       └── ErrorBoundary.tsx
│   ├── hooks/
│   │   ├── useColyseus.ts               # Hook do Colyseus
│   │   ├── useGameState.ts              # Estado do jogo
│   │   └── useWallet.ts                 # Gerenciamento de saldo
│   ├── store/
│   │   ├── gameStore.ts                 # Zustand store
│   │   └── slices/
│   │       ├── authSlice.ts
│   │       ├── gameSlice.ts
│   │       └── multiplayerSlice.ts
│   ├── services/
│   │   ├── api.ts                       # Cliente REST/GraphQL
│   │   ├── babylon.ts                   # Inicialização Babylon
│   │   ├── colyseus.ts                  # Cliente Colyseus
│   │   └── physics.ts                   # Sistema físico arcade
│   ├── types/
│   │   ├── game.ts                      # Tipos do jogo
│   │   ├── multiplayer.ts               # Tipos multiplayer
│   │   └── api.ts                       # Tipos da API
│   └── utils/
│       ├── math.ts                      # Utilitários matemáticos
│       ├── interpolation.ts             # Interpolação de estados
│       └── constants.ts                 # Constantes tunables
├── public/
│   └── assets/
│       ├── models/                      # Modelos 3D low-poly
│       ├── textures/                    # Texturas PBR
│       └── sounds/                      # Áudio
├── package.json
├── vite.config.ts
└── tsconfig.json

## Backend Multiplayer (Colyseus + Node.js)
```
multiplayer-server/
├── src/
│   ├── rooms/
│   │   ├── DriftRoom.ts                 # Sala principal do jogo
│   │   └── schema/
│   │       ├── DriftState.ts            # Schema de estado
│   │       ├── Player.ts                # Schema do jogador
│   │       └── Track.ts                 # Schema da pista
│   ├── logic/
│   │   ├── TrackGenerator.ts            # Gerador server-side
│   │   ├── Physics.ts                   # Física autoritativa
│   │   ├── AntiCheat.ts                 # Validações anti-cheat
│   │   └── Difficulty.ts                # Sistema de dificuldade
│   ├── utils/
│   │   ├── math.ts
│   │   └── prng.ts                      # Gerador pseudo-aleatório
│   └── index.ts
├── package.json
└── tsconfig.json

## Backend Business (NestJS + Postgres)
```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── dto/
│   │   ├── wallet/
│   │   │   ├── wallet.controller.ts
│   │   │   ├── wallet.service.ts
│   │   │   └── dto/
│   │   ├── games/
│   │   │   ├── games.controller.ts
│   │   │   ├── games.service.ts
│   │   │   └── dto/
│   │   ├── affiliates/
│   │   ├── ranking/
│   │   └── payments/
│   ├── entities/
│   │   ├── user.entity.ts
│   │   ├── wallet.entity.ts
│   │   ├── game-session.entity.ts
│   │   ├── bet.entity.ts
│   │   └── ranking.entity.ts
│   ├── database/
│   │   ├── migrations/
│   │   └── seeds/
│   ├── common/
│   │   ├── guards/
│   │   ├── decorators/
│   │   └── filters/
│   └── main.ts
├── package.json
└── tsconfig.json

## Configuração de Desenvolvimento
```
docker-compose.yml              # Postgres + Redis
.env.example                    # Variáveis de ambiente
README.md                       # Documentação
scripts/
├── build-all.sh               # Build completo
├── dev-setup.sh               # Setup desenvolvimento
└── deploy.sh                  # Deploy produção
```

## Parâmetros Tunables (constants.ts)
```typescript
export const GAME_CONFIG = {
  // Física
  MAX_VELOCITY_INITIAL: 22,        // u/s
  ACCELERATION_BASE: 6,            // u/s²
  DRIFT_FACTOR_INITIAL: 0.85,     
  SLIP_DAMPING: 8,                 // s⁻¹
  
  // Pista
  TRACK_WIDTH: 7.0,                // unidades
  GUARDRAIL_HEIGHT: 0.6,           // unidades
  DIFFICULTY_INTERVAL: 300,        // metros
  
  // Câmera
  CAMERA_OFFSET: { x: 0.8, y: 2.4, z: -6.5 },
  FOV_BASE: 65,                    // graus
  FOV_MIN: 60,
  FOV_MAX: 75,
  ROLL_MAX: 3,                     // graus
  
  // Multiplayer
  TICK_RATE: 30,                   // Hz
  SNAPSHOT_RATE: 18,               // Hz
  INTERPOLATION_BUFFER: 120,       // ms
  GHOST_OPACITY: 0.5,
  
  // Seeds
  DEFAULT_SEED: 1337
};
```
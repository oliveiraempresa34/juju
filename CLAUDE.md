# CLAUDE.md - Drift Cash (DRIFRR) Multiplayer Racing Game

## Project Overview

**Drift Cash** is a real-time multiplayer drift racing game built with React, Babylon.js, and Colyseus. Players compete in arcade-style races where they must drift right while staying on procedurally generated tracks. Features public matchmaking, private rooms, and betting mechanics.

**Project Type**: Full-stack TypeScript multiplayer game
**Architecture**: Client-authoritative physics with Colyseus state synchronization
**Status**: Active development (production deployment ready)

---

## Quick Start

### Development Setup

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Setup environment
cp server/.env.example server/.env
# Edit server/.env with your configuration

# Run (2 terminals)
cd server && npm run dev  # http://localhost:2567
cd client && npm run dev  # http://localhost:5173
```

### Production Deployment

```bash
# Full deployment
./deploy-full.sh

# Server only (~10s)
./deploy-full.sh --server-only

# Client only (~15min)
./deploy-full.sh --client-only
```

---

## Project Structure

```
/home/user/juju/
├── client/                 # Frontend (Vite + React + Babylon.js)
│   ├── src/
│   │   ├── components/    # UI components (lobby, admin, wallet, etc.)
│   │   ├── game/          # Babylon.js game engine code
│   │   ├── pages/         # Main pages (Login, Lobby, Game, Privacy)
│   │   ├── store/         # Zustand state stores
│   │   ├── services/      # API service layer
│   │   ├── utils/         # Utilities (sound, QR, usernames)
│   │   └── styles/        # CSS (theme.css)
│   ├── public/            # Static assets (logo.webp)
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── server/                 # Backend (Colyseus + Express)
│   ├── src/
│   │   ├── rooms/         # Colyseus room logic (DriftRoom.ts)
│   │   ├── schema/        # State schemas (DriftState, Player)
│   │   ├── routes/        # REST API (users, settings)
│   │   ├── middleware/    # Security, auth, rate limiting
│   │   ├── track/         # Track generation
│   │   └── utils/         # Logger, validators
│   ├── __tests__/         # Jest tests
│   ├── package.json
│   ├── tsconfig.json
│   ├── ecosystem.config.js  # PM2 config
│   └── .env.example
│
├── _legacy/               # Legacy NestJS modules (~5,400 LOC)
│   ├── auth_module.ts
│   ├── wallet_module.ts
│   ├── payments_module.ts
│   ├── games_module.ts
│   ├── anti_cheat.ts
│   └── difficulty_system.ts
│
├── deploy/                # Deployment configs
│   ├── nginx/            # Nginx reverse proxy configs
│   └── ADMIN_DEPLOY.md
│
├── constants.ts           # Game physics/camera constants
├── deploy-full.sh         # Main deployment script
├── deploy-server.sh       # Server deployment
├── deploy-client.sh       # Client deployment
├── README.md
├── DEPLOY.md
└── CHANGELOG.md
```

---

## Technology Stack

### Frontend
| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | React | 18.2 | UI components |
| **3D Engine** | Babylon.js | 7.0 | 3D rendering, physics, particles |
| **Build Tool** | Vite | 5.2 | Fast dev server & bundling |
| **Language** | TypeScript | 5.4 | Type-safe JavaScript |
| **State** | Zustand | 4.5 | State management |
| **Routing** | React Router DOM | 6.30 | Client-side routing |
| **Multiplayer** | Colyseus.js | 0.15 | WebSocket client |

### Backend
| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Runtime** | Node.js | - | JavaScript runtime |
| **Language** | TypeScript | 5.4 | Type-safe JavaScript |
| **Game Server** | Colyseus | 0.15 | Multiplayer state sync |
| **Web Framework** | Express | 4.19 | REST API |
| **Database** | SQLite3 | 5.1 | Embedded database |
| **Auth** | JWT + bcrypt | 9.0 / 6.0 | Authentication & hashing |
| **Security** | Helmet, CORS | 8.1 / 2.8 | Security headers & CORS |
| **Logging** | Winston | 3.18 | Structured logging |
| **Validation** | express-validator | 7.2 | Input validation |

### DevOps & Tooling
| Category | Technology | Purpose |
|----------|-----------|---------|
| **Testing** | Jest + ts-jest | Unit tests (server only) |
| **Linting** | ESLint + TS-ESLint | Code quality |
| **Formatting** | Prettier | Code formatting |
| **Dev Server** | ts-node-dev (server), Vite (client) | Development |
| **Process Manager** | PM2 | Production process management |
| **Web Server** | Nginx | Reverse proxy, static files |

---

## Key Files Reference

### Entry Points
- `client/src/main.tsx` - Client application entry
- `client/src/App.tsx` - React root with screen routing
- `server/src/index.ts` - Server entry (Express + Colyseus)

### Core Game Logic
- `server/src/rooms/DriftRoom.ts` - Multiplayer room (600+ LOC)
- `server/src/schema/State.ts` - Colyseus state schema
- `client/src/game/GameScene.tsx` - Babylon.js scene setup
- `client/src/game/CarController.ts` - Car physics
- `client/src/game/TrackGenerator.ts` - Procedural tracks
- `client/src/game/MultiplayerSync.ts` - Client-server sync
- `constants.ts` - Physics constants (MAX_VELOCITY, DRIFT_FACTOR, etc.)

### State Management (Zustand)
- `client/src/store/useGame.ts` - Game mode, score, multiplayer state
- `client/src/store/useAuth.ts` - Authentication
- `client/src/store/usePlatformStore.ts` - Platform-wide state
- `client/src/store/useRoom.ts` - Room state

### API & Networking
- `server/src/routes/userRoutes.ts` - User management API
- `server/src/routes/settingsRoutes.ts` - Settings API
- `server/src/middleware/authMiddleware.ts` - JWT auth
- `server/src/middleware/security.ts` - Security headers
- `server/src/middleware/rateLimiters.ts` - Rate limiting
- `server/src/messages.ts` - Message type definitions
- `client/src/game/messages.ts` - Client message types

### UI Components
- `client/src/pages/Login.tsx` - Login page
- `client/src/pages/Lobby.tsx` - Main lobby
- `client/src/pages/Game.tsx` - Game page
- `client/src/components/WaitingLobby.tsx` - Pre-match lobby
- `client/src/components/AdminPanel.tsx` - Admin interface
- `client/src/components/WalletPanel.tsx` - Wallet management
- `client/src/components/GameOverModal.tsx` - Game over screen

---

## Architecture Patterns

### Client Architecture
- **Component-Based**: React functional components with hooks
- **State Management**: Zustand stores (not Redux)
- **Screen Flow**: login → lobby → waiting → game
- **3D Rendering**: Babylon.js Engine → Scene → Meshes → Camera
- **Physics**: Client-authoritative (each player controls their own car)
- **Input**: Pointer/Touch/Keyboard via InputManager
- **Communication**: Colyseus WebSocket messages

### Server Architecture
- **Room-Based**: Colyseus DriftRoom handles game sessions
- **State Sync**: Schema-based delta compression
- **Message Handling**: Typed payloads (INPUT, NAME, START_MATCH, POSITION_UPDATE)
- **Anti-Cheat**: Input rate limiting, position validation, steering delta checks
- **REST API**: Express routes for user/settings management
- **Middleware Pipeline**: Security → CORS → Auth → Rate Limiting → Routes

### Multiplayer Flow
```
1. Client connects to Colyseus room with options (betAmount, queueType, inviteCode)
2. Server validates via onAuth(), creates Player schema
3. Client sends NAME message with display name
4. Waiting phase: Players marked ready, host can start match
5. Countdown: 5 seconds before match start
6. Match active: Clients send POSITION_UPDATE messages (client-authoritative)
7. Server validates positions, broadcasts to other players
8. Match ends: Winner determined, results broadcast
```

---

## Game Constants & Configuration

Game physics are tunable via `constants.ts`:

### Physics
- `MAX_VELOCITY_INITIAL`: 22 u/s
- `ACCELERATION_BASE`: 6 u/s²
- `DRIFT_FACTOR_INITIAL`: 0.85
- `YAW_RATE_MAX`: 2π rad/s (360°/s)
- `TRACK_HALF_WIDTH`: 5.8 units

### Multiplayer Settings (DriftRoom.ts)
- `MATCH_CAPACITY`: 5 players
- `MIN_PLAYERS_PRIVATE`: 2
- `MIN_PLAYERS_PUBLIC`: 5 (full room)
- `MATCH_DURATION_MS`: 120,000 (2 minutes)
- `COUNTDOWN_SECONDS`: 5
- `SIMULATION_RATE`: 1000/30 (30 TPS)

### Scoring
```typescript
Score = (TimeAlive × 100) + DistanceTraveled
```

---

## Environment Variables

### Server (`server/.env`)
```bash
PORT=2567
NODE_ENV=development

# CORS allowed origins (comma-separated)
FRONTEND_URL=http://localhost:5173,http://driftcash.com,https://driftcash.com

# Database
DATABASE_PATH=database.sqlite

# Security (CRITICAL: Change in production!)
JWT_SECRET=CHANGE_THIS_IN_PRODUCTION
JWT_EXPIRES_IN=4h
BCRYPT_SALT_ROUNDS=10

# Domain restrictions
ADMIN_PANEL_HOSTS=admin.driftcash.com
CLIENT_APP_HOSTS=driftcash.com,www.driftcash.com
```

### Client
```bash
# Build version for cache busting (auto-generated)
VITE_BUILD_VERSION=<timestamp>
```

---

## Build & Deployment

### Build Commands

```bash
# Server (TypeScript → CommonJS)
cd server
npm run build  # → dist/

# Client (Vite → optimized bundle)
cd client
npm run build  # → dist/
```

### Deployment Scripts

```bash
# Full deployment (server + client)
./deploy-full.sh

# Server only (~10 seconds)
./deploy-full.sh --server-only

# Client only (~15 minutes - large Babylon.js bundle)
./deploy-full.sh --client-only
```

### Production Stack

- **Process Manager**: PM2 (`ecosystem.config.js`)
  - App name: `drift-server`
  - Port: 2567
  - Logs: `/var/log/pm2/drift-server-*.log`

- **Web Server**: Nginx
  - Config: `deploy/nginx/admin.driftcash.conf`
  - Reverse proxy: `http://127.0.0.1:2567`
  - WebSocket upgrade support
  - Static files: `/var/www/html/` or `/var/www/admin.driftcash.com/`

- **TLS**: Let's Encrypt certificates
- **Database**: SQLite file (`database.sqlite`)

---

## Testing

### Server Tests (Jest)
```bash
cd server
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**Test Files**:
- `__tests__/logger.test.ts` - Winston logger
- `__tests__/security.test.ts` - Security middleware

### Client Tests
- No test framework configured
- TODO: Set up Vitest or Jest

---

## Message Protocol

### Client → Server Messages

```typescript
// Player input
MESSAGE.INPUT: { pressing: boolean, steering?: number, intensity?: number }

// Set player name
MESSAGE.NAME: { name: string }

// Request match start (host only)
MESSAGE.START_MATCH: { force?: boolean }

// Client position update (client-authoritative)
MESSAGE.POSITION_UPDATE: {
  x: number,
  y: number,
  z: number,
  yaw: number,
  distance: number,
  eliminated: boolean
}

// Player ready status
MESSAGE.PLAYER_READY: { ready: boolean }
```

### State Schema (Server → Client)

```typescript
DriftState {
  players: MapSchema<Player>  // All players in room
  seed: number               // Track generation seed
  status: "waiting" | "countdown" | "active" | "finished"
  roomType: "public" | "private"
  betAmount: number
  inviteCode: string
  prizePool: number
  countdown: number
  winnerId: string
  playerCount: number
  hostId: string
}

Player {
  id: string
  name: string
  platformId: string
  x, y, z: number           // Position
  yaw: number               // Rotation
  pressing: boolean         // Input state
  steering: number
  steeringIntensity: number
  distance: number          // Distance traveled
  opacity: number           // Visual opacity
  eliminated: boolean       // Out of bounds
  timeAlive: number
  betAmount: number
  isWinner: boolean
  ready: boolean
}
```

---

## Security Features

### Authentication
- JWT tokens in HTTP-only cookies
- bcrypt password hashing (10 rounds)
- Domain-based auth restrictions (admin vs client)

### API Security
- Helmet security headers
- CORS with origin whitelist
- Rate limiting on endpoints
- Input validation (express-validator)
- NoSQL injection sanitization (express-mongo-sanitize)
- Request body size limits (10MB)

### Anti-Cheat (Server-side)
- Max steering delta per input: 0.6
- Input rate limiting: 60 inputs/sec max
- Position jump validation: 5 units max
- Max acceleration validation: 15 u/s²
- Teleport detection: 20 unit threshold

---

## Known Issues & TODOs

### Critical Issues
1. **Missing Database Class**: `server/src/database/Database.ts` is imported but not in repository
   - Routes reference it: `userRoutes.ts`, `settingsRoutes.ts`, `index.ts`
   - Needs implementation or removal

### Missing Infrastructure
- No Docker/Docker Compose setup
- No CI/CD pipeline (GitHub Actions, GitLab CI)
- No client-side tests
- No client `.env.example` file

### Recommendations from Docs
1. Implement semantic versioning (v1.0.0, v1.1.0)
2. Set up staging environment
3. Add integration tests
4. Implement structured monitoring
5. CI/CD automation
6. Migrate legacy NestJS modules from `_legacy/`

---

## Development Workflow

### Making Changes

1. **Code Changes**
   ```bash
   # Edit files in client/src or server/src
   # Dev servers auto-reload
   ```

2. **Linting/Formatting**
   ```bash
   cd server
   npm run lint       # Check
   npm run lint:fix   # Fix
   npm run format     # Prettier format
   ```

3. **Testing**
   ```bash
   cd server
   npm test
   ```

4. **Deployment**
   ```bash
   # From project root
   ./deploy-full.sh --server-only  # If only server changed
   ./deploy-full.sh --client-only  # If only client changed
   ```

5. **Cache Busting**
   - Client builds include `VITE_BUILD_VERSION` for cache busting
   - Users need to hard refresh (Ctrl+Shift+R) after client deploys

---

## Legacy Code

The `_legacy/` directory contains ~5,400 lines of NestJS backend code for future integration:

- `auth_module.ts` (415 LOC) - Authentication system
- `wallet_module.ts` (728 LOC) - Wallet/balance management
- `payments_module.ts` (864 LOC) - Payment processing
- `games_module.ts` (755 LOC) - Game history/records
- `database_entities.ts` (778 LOC) - TypeORM entities
- `anti_cheat.ts` (415 LOC) - Anti-cheat validation
- `difficulty_system.ts` (368 LOC) - Dynamic difficulty
- `server_physics.ts` (302 LOC) - Server-side physics
- `server_track_generator.ts` (392 LOC) - Server track gen
- `backend_main.ts` (427 LOC) - NestJS main

These modules are preserved for integration once the core gameplay loop stabilizes.

---

## API Endpoints

### User Management (`/api/users`)
- `POST /api/users/login` - User login (JWT auth)
- Routes defined in `server/src/routes/userRoutes.ts`
- Domain-restricted (admin panel vs client app)

### Settings (`/api/settings`)
- Routes defined in `server/src/routes/settingsRoutes.ts`

### Health Check
- `GET /` - Returns "OK"

---

## Troubleshooting

### Common Issues

**Logo doesn't update after deploy**
- Build generates new `?v=timestamp` query param
- Clear browser cache: Ctrl+Shift+R
- Check logo at `client/public/logo.webp`

**Client build slow (~15 minutes)**
- Normal! Vite processes 2000+ modules
- Babylon.js is a large library (~5.5MB bundle, ~1.25MB gzipped)

**Database errors**
- Database class is missing from repository
- Check if `database.sqlite` exists
- Verify `.env` DATABASE_PATH

**Permission denied on deploy scripts**
```bash
chmod +x deploy-*.sh
```

**CORS errors**
- Check `FRONTEND_URL` in `server/.env`
- Verify origin in browser matches allowed origins
- Check nginx proxy headers

---

## Performance Characteristics

### Server
- Build time: ~10 seconds
- Bundle size: ~200KB
- Tick rate: 30 TPS
- Patch rate: 30 updates/sec

### Client
- Build time: ~15 minutes
- Bundle size: ~5.5MB (~1.25MB gzipped)
- Modules: 2048
- Target FPS: 60
- Dev server port: 5173

---

## Code Style

### ESLint Rules (Server)
- TypeScript recommended rules
- `@typescript-eslint/no-explicit-any`: warn
- `@typescript-eslint/no-unused-vars`: error (ignore `_` prefix)
- `no-console`: warn

### Prettier Config
- Semi-colons: yes
- Trailing commas: ES5
- Single quotes: yes
- Print width: 100
- Tab width: 2
- Line endings: LF

---

## Conventions for AI Assistants

### When Working with This Codebase

1. **Always check both client and server** when making changes to shared functionality
2. **Message protocol changes** require updates in both `server/src/messages.ts` and `client/src/game/messages.ts`
3. **State schema changes** in `server/src/schema/` require corresponding client updates
4. **Physics constants** in `constants.ts` are shared - changes affect both client and server
5. **Never commit** the Database class until its implementation is clarified
6. **Test server changes** with `npm test` before deploying
7. **Client builds are slow** - be patient, it's normal
8. **Always update CHANGELOG.md** when making significant changes
9. **Follow Prettier formatting** - run `npm run format` before committing
10. **Respect the middleware pipeline** order in server/src/index.ts

### File Naming Conventions
- React components: PascalCase (e.g., `GameOverModal.tsx`)
- Utilities: camelCase (e.g., `soundManager.ts`)
- Stores: `use*` prefix (e.g., `useGame.ts`)
- Constants: UPPER_SNAKE_CASE in `constants.ts`

### Common Patterns
- **Zustand stores**: Use `create()` with TypeScript interfaces
- **Babylon.js meshes**: Dispose on cleanup to prevent memory leaks
- **Colyseus messages**: Always validate with TypeScript types
- **Environment variables**: Access via `process.env.VARIABLE_NAME`
- **Logging**: Use Winston logger in server, console in client (dev only)

---

## Additional Resources

- **README.md** - Quick start guide
- **DEPLOY.md** - Comprehensive deployment guide (Portuguese)
- **CHANGELOG.md** - Recent changes and fixes
- **deploy/ADMIN_DEPLOY.md** - Admin panel deployment
- **drift_project_structure.ts** - Planned project structure

---

**Last Updated**: 2025-11-13
**Generated By**: Claude AI Assistant
**Purpose**: Help AI assistants understand the Drift Cash codebase structure, technologies, and development workflows

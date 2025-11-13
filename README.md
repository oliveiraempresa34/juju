# Drift cash - Workspace Snapshot

## Structure

- `client/`: Vite + React + Babylon front-end prototype.
- `server/`: Minimal Colyseus authority server.
- `_legacy/`: Original backend modules preserved for later integration.
- Misc legacy files remain at the repo root for reference.

## Getting Started

### Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### Environment

Copy the provided examples and adjust if needed:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

### Run

In one terminal tab:

```bash
cd server
npm run dev
```

In another tab:

```bash
cd client
npm run dev
```

Open http://localhost:5173 to load the game client. The client connects to `ws://localhost:2567` by default.

## Smoke Tests

1. **Server**: `curl http://localhost:2567/` should return `OK`.
2. **Client**: Vite dev server loads without console errors; the Babylon canvas renders the track and a local car.
3. **Multiplayer**: Room join succeeds; the console logs no Colyseus exceptions.
4. **Input**: Holding click/touch/space triggers the drift (car yaws to the right); releasing straightens the yaw.
5. **Bounds**: Drive outside the track width to trigger a server-side reset.

## Manual Test Plan

1. Launch the server and client as described above.
2. Open two browser windows at http://localhost:5173.
3. Verify both players join the same room (seed is identical in the HUD).
4. Observe the local car rendered opaque and the remote car semi-transparent with a floating name label.
5. Hold click/touch/space in each window to drift right; release to realign.
6. Drive beyond the track bounds (|z| > ~6 units) and confirm the server resets the player to the start.
7. Ensure no collisions occur between cars and both clients continue receiving live updates.

## Next Steps

- Expand the track generator into deterministic streaming segments.
- Improve interpolation/reconciliation for smoother remote movement.
- Bring the NestJS/DB services from `_legacy/` back as dedicated apps once the gameplay loop stabilises.

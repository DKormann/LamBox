
# LamBox

JS Lambdas in a box

Small platform to publish and call sandboxed JavaScript functions ("lambdas") between users, authenticated with Nostr keys. Includes demo apps (Chat, Chess, Console, Ant Farm) to showcase the model.

## Features
- Sandboxed lambda execution in a worker via `vm2`
- Nostr-signed requests (publish/host/call)
- Minimal per-user/app key-value store mediated by the server
- Vite + TypeScript frontend with simple HTML helpers and reactive stores

## Quick Start

Prerequisites: Node 18+ and npm

1) Install

```bash
npm install
```

2) Run frontend (Vite)

```bash
npm run dev
```

3) Run backend (Node server)

```bash
npm run dev:server
```

4) Open the app

- For local frontend and local server, open: `http://localhost:5173/local/`
  - The `local` path segment tells the client to use the local server at `http://localhost:8080`.

## Build

- Frontend build:
```bash
npm run build
```

- Server build and run:

```bash
npm run build:server
npm run start:server
```

### Request types
- publish: send serialized `Box` (code + hashes)
- host: mark caller as allowed host for an app
- call: invoke a specific lambda on a target pubkey with an argument

## Key Files
- Frontend entry/router: `src/client.ts`
- UI helpers: `src/html.ts`, reactive store: `src/store.ts`
- Auth (nostr): `src/auth.ts`
- Box model and client requests: `src/userspace.ts`
- Type safety for serializable data: `src/dataSchemas.ts`
- Server: `src/server.ts`, in-memory DB + worker orchestration: `src/database.ts`
- Worker sandbox: `src/runtime.ts`
- Demo apps: `src/client/chat.ts`, `src/client/chess.ts`, `src/client/consola.ts`, `src/client/antfarm.ts`



# Ayo Olopon - Multiplayer Board Game

## Overview
A full-stack multiplayer version of Ayo Olopon (Oware), an ancient African strategy board game. Features a hyper-realistic 3D carved wooden board with natural Oware seeds (sage green, olive, stone grey), brushed brass hinges, realistic wood grain textures, Framer Motion animations, and real-time multiplayer via Socket.io.

## Tech Stack
- **Frontend**: React, Framer Motion, Tailwind CSS, Shadcn UI, Wouter (routing), TanStack Query
- **Backend**: Node.js, Express, Socket.io (WebSockets)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Replit Auth (OpenID Connect) - supports Google, GitHub, Apple, email/password

## Architecture
- `shared/schema.ts` - Data models (contacts, games) + re-exports auth models
- `shared/models/auth.ts` - User and session models (managed by Replit Auth integration)
- `server/routes.ts` - REST API + Socket.io event handlers
- `server/storage.ts` - Database operations via Drizzle
- `server/gameLogic.ts` - Ayo Olopon game rules (Oware variant)
- `server/replit_integrations/auth/` - Replit Auth setup (OIDC, session, routes)
- `client/src/pages/` - LandingPage, LobbyPage, GamePage
- `client/src/components/` - GameBoard, Pit, Marble, ScoreStore
- `client/src/hooks/use-auth.ts` - Auth hook (useAuth) for frontend
- `client/src/lib/socket.ts` - Socket.io client wrapper (session-based auth)

## Auth Flow
- Landing page shown when not authenticated
- `/api/login` redirects to Replit OIDC provider
- `/api/callback` handles OIDC callback, upserts user in DB
- `/api/auth/user` returns current authenticated user
- `/api/logout` ends session and redirects to OIDC logout
- Socket.io uses session middleware for auth (withCredentials: true)

## Game Rules (Ayo Olopon / Oware)
- 12 pits (6 per player), 4 seeds each = 48 total
- Player picks up all seeds from one of their pits, distributes counter-clockwise one at a time
- Skip the starting pit when sowing (if seeds >= 12)
- Relay sowing: only triggers if sowing crossed through opponent's territory AND last seed lands on your own side in a non-empty pit (now 2+). If seeds stayed on your own side only, no relay. Stop when last seed lands on an empty own pit (now 1) or on opponent's side
- Capture from opponent's side when last seed lands in a pit with 2 or 3 seeds (chain capture backwards)
- Cannot capture if it would leave opponent with no seeds
- Players can only select/count their own pits (opponent pits are not clickable)
- When a player captures 25+ seeds, both players are prompted to continue or end
- Game ends when both agree to end, all seeds are captured, or no moves remain
- Remaining seeds go to the player whose side they're on
- Games opened but not played (no moves made) are not scored
- New games start with board closed; player who opens gets first turn

## Key Features
- Replit Auth (OIDC) authentication
- Email-based contact management
- Real-time game invites via Socket.io
- Animated seed distribution with Framer Motion
- 3D wooden board visual design
- Game state persistence in PostgreSQL

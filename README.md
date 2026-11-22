# DevPulse

A live workspace for developer teams. Channels, a shared whiteboard, a visual AI agent builder and a console sit side by side, and every change reaches your team the moment it happens.

![React 19](https://img.shields.io/badge/React-19-111318?style=flat-square&logo=react)
![Tailwind CSS v4](https://img.shields.io/badge/Tailwind-v4-111318?style=flat-square&logo=tailwindcss)
![Express](https://img.shields.io/badge/Express-4-111318?style=flat-square&logo=express)
![Socket.io](https://img.shields.io/badge/Socket.io-4-111318?style=flat-square&logo=socketdotio)
![Gemini](https://img.shields.io/badge/Gemini-API-111318?style=flat-square&logo=googlegemini)

## What's inside

**Chat.** Channels, direct messages, threads, reactions, pins, typing indicators, presence and unread badges. Messages support Markdown, fenced code blocks with syntax highlighting, and shared snippets; JavaScript snippets have a **Run** button that executes them in an isolated Web Worker. Mention `@gemini` in any channel (or post in `#ai-lounge`) and Gemini answers with the recent conversation as context.

**Communities and events.** Join or leave communities, each with its own channels. Schedule events with a date, call link and community, RSVP, and open a discussion channel per event.

**Groups.** Anyone can create a community group, find it under Groups and join it. Each group has its own real-time chat in the sidebar, with history visible only to members. Share an event or call link from Meetup, Luma, Eventbrite, Partiful, Zoom, Google Meet, Discord and other platforms; the link becomes a card showing the platform.

**Profiles.** Each developer has a public profile: a photo (resized in the browser and stored on the server), a display name, bio, location, skills, status, and links to GitHub, LinkedIn, X, Stack Overflow, dev.to, Medium, YouTube, Hashnode, Kaggle, CodePen and a website. Links must point to their own site.

**Whiteboard.** One board shared by everyone: select and move, pen, rectangle, ellipse, line, arrow, text and a real eraser. Live strokes and cursors, pan and zoom, undo for your own shapes, PNG export. Colours follow the light/dark theme.

**Agent studio.** Build workflows on a canvas from five step types and run them for real:

| Step | What it does |
| --- | --- |
| Trigger | Starts a run with a test input, available as `{{trigger.message}}` |
| Gemini | Calls Gemini with your prompt, system instruction and temperature |
| Web search | Gemini grounded on Google Search, returns a summary plus cited sources |
| JavaScript | Runs your script in an isolated worker (4 s limit) to reshape data |
| Action | Posts into a DevPulse channel as the agent, or to an https webhook (Slack, Discord, anything) |

Steps reference earlier output with `{{prev}}` or `{{<stepId>.result}}`. Workflows are saved per user. Three templates are included.

**Console.** ``Ctrl + ` `` from anywhere: `whoami`, `users`, `channels`, `events`, `stats`, `ai <prompt>`, with history and tab completion.

**Everything else.** Email/username sign-up with JWT sessions, profile editing (avatar, role, skills, status, bio, GitHub), a `Ctrl + K` command palette, light and dark themes, a responsive layout, and a Free / Pro / Enterprise upgrade flow.

## Quick start

Requires Node.js 18+.

```bash
npm install
cp .env.example .env    # optional: add GEMINI_API_KEY for live AI
npm run dev
```

Open http://localhost:3000 and create an account. With no database configured, data is stored in `backend-data.json`.

## Configuration

All variables are optional for local development. See `.env.example`.

| Variable | Purpose |
| --- | --- |
| `PORT` | Port for the combined API + web server (default `3000`) |
| `JWT_SECRET` | Signs session tokens. **Required when `NODE_ENV=production`**: the server refuses to start without it. |
| `GEMINI_API_KEY` | Enables `@gemini` replies, the console `ai` command and Gemini/search steps |
| `GEMINI_MODEL` | Override the model (default `gemini-3.5-flash`) |
| `DATABASE_URL` | PostgreSQL connection string. When reachable, users, messages, communities and events are mirrored with Prisma |
| `STRIPE_SECRET_KEY` | Switches checkout from demo mode to Stripe (see limitations) |

To use PostgreSQL:

```bash
npm run db:generate
npm run db:push
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Express + Socket.io with Vite middleware and hot reload |
| `npm run build` | Builds the client to `dist/` and bundles the server to `dist/server.cjs` |
| `npm start` | Runs the production build (run from the project root) |
| `npm run lint` | Type-checks the whole project |

## Architecture

```text
server.ts                 Express app, REST routes, Socket.io, Vite (dev) or static files (prod)
backend/
  db.ts                   JSON store: users, credentials, channels, messages, board, events, workflows
  prismaClient.ts         Optional PostgreSQL mirror, created only when DATABASE_URL works
  sockets.ts              Authenticated real-time events: chat, DMs, threads, board, console, Gemini
  gemini.ts               Gemini text generation and Google Search grounding
  realtime.ts             Shared Socket.io handle and presence broadcasting
  middleware/auth.ts      JWT signing and verification
  routes/                 auth, communities, events, payments, agents
frontend/
  App.tsx                 Session restore and screen routing
  lib/workspace.tsx       Workspace context: connection, channels, presence, unread, theme
  lib/markdown.tsx        Message rendering and the code block with Run
  lib/runCode.ts          Web Worker sandbox for JavaScript
  components/             Shell, ChatWorkspace, CommunitiesView, EventsView, Whiteboard,
                          AgentWorkflowBuilder, Terminal, CommandPalette, modals, ui primitives
src/index.css             Design tokens for light and dark themes
```

Security notes: REST calls and socket connections both require a valid token; the server builds every message from the authenticated user rather than trusting client fields; credentials are stored apart from public profiles; webhook actions only reach public https addresses; user JavaScript only ever runs in the browser, inside a worker.

## Design

The interface is deliberately quiet: cool grey surfaces, ink for text and primary actions, IBM Plex Sans and Mono for reading and data, and Bricolage Grotesque for headlines. One coral accent is reserved for live signals. The signature is the heartbeat trace: it draws across the landing page, sits in the logo, and runs along the status bar, spiking whenever a message lands anywhere you can see.

## Known limitations

- **Live Stripe payments.** Without `STRIPE_SECRET_KEY`, checkout runs in demo mode and upgrades instantly. With a key, the server creates and verifies real PaymentIntents, but the card form still needs Stripe's Payment Element (`@stripe/react-stripe-js`) before live checkout can be enabled.
- **Agent triggers run from the studio.** Workflows run when you press Run, using the trigger's test input. Scheduled and incoming-webhook triggers need a server-side runner, which is the natural next step.
- **One shared whiteboard** for the whole workspace.

## License

MIT

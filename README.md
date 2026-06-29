# ⚡ DevPulse ⚡

[![React](https://img.shields.io/badge/React-19.x-blue?style=flat-square&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind--CSS-v4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.x-61dafb?style=flat-square&logo=express)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2d3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![Google Gemini API](https://img.shields.io/badge/Gemini-2.5--Pro%2FFlash-9b51e0?style=flat-square&logo=google-gemini)](https://ai.google.dev/)
[![Socket.io](https://img.shields.io/badge/Socket.io-Real--time-010101?style=flat-square&logo=socket.io)](https://socket.io/)

DevPulse is a next-generation, high-performance **full-stack collaborative developer workspace** built for modern tech teams. Seamlessly blending community communication, interactive system diagramming, and autonomous workflow design under a unified, cyberpunk-themed twilight dashboard.

DevPulse is designed to serve as a comprehensive visual playground and mission control center, letting developers chat in real-time, construct and test AI-driven workflows on a visual canvas, and sketch software blueprints side-by-side.

---

## 🚀 Key Modules & Capabilities

### 1. 🤖 Autonomous AI Agent Studio
A visual node-based workspace inspired by modern automation utilities (like n8n and Node-RED). Create and simulate AI workflows directly in the browser:
* **Toolbox Node Palette:** Build multi-step pipelines containing:
  * **Triggers:** Webhook listeners, Cron schedules (`* * * * *`), or chat message prompts.
  * **Cognitive Processing:** Powered by **Google Gemini (using `@google/genai` v2.5)** with configurable temperatures, custom instructions, and system model parameters.
  * **Information Retrieval:** Dynamic Google Web Search query nodes.
  * **Sandboxed Code Execution:** Isolated JavaScript compilation nodes to sanitize data.
  * **Action Dispatchers:** Send final webhooks, Slack pings, or Discord notifications.
* **Interactive Connecting Canvas:** Drag nodes around and connect them with real-time responsive SVG Bézier curves. Complete with flowing "signal pulse" animations tracking execution streams.
* **Telemetry Inspection:** Select any node to customize inputs, inspect logs, or review outputs using live step-by-step runtime simulations.

### 2. 🎨 Co-Design Vector Sketchboard
An integrated vector whiteboard designed specifically for system architecture:
* **Rich Shape & Connection Tools:** Place containers, draw customizable text, select multiple colors, and link boxes to layout sequence flows or database designs.
* **Real-time Synchronized Drawing:** Ideal for drafting UML mockups and structural schematics collaboratively.
* **Persistence Ready:** Work is saved automatically so you can resume design operations anytime.

### 3. 💬 Real-Time Collaborative Chat
The interactive center of the DevPulse platform:
* **Dynamic Communication Channels:** Multiple designated forums (e.g., `#general`, `#announcements`, `#support-dispatch`) to coordinate operations.
* **Live Presence Indicators:** Track active team member statuses, roles, and connected developer profiles in real-time.
* **System Broadcast Integrations:** Integrated seamlessly with the Agent Studio—automated dispatches from your active AI pipelines appear directly within the chat interface.

### 4. 📟 Interactive Developer Terminal
A visual command shell that mimics a production Unix container environment:
* Monitor real-time system logs, network status, and database synchronizations.
* Execute diagnostics, clear system state, and inspect background task queues.

---

## 🛠️ Full-Stack Technical Architecture

### Frontend
* **Core Framework:** React 19 (Functional Hooks, Custom Context State) with TypeScript.
* **Styling & Theme:** Tailwind CSS v4 featuring custom dark/neon color systems (`slate`, `cyan`, `purple`, `pink`, `emerald`) for an optimal twilight vibe.
* **Animations:** Smooth layouts, slide-in inspectors, and fade transitions using the next-generation `motion` library.
* **Bundler:** Vite v6 with `@tailwindcss/vite` integration.

### Backend
* **Server Framework:** Express (Node.js) with custom API routing for user profiles, Stripe billing parameters, subscription tiers, and agent history tracking.
* **Real-Time Pipeline:** Socket.io for persistent, low-latency client-server synchronization, enabling instant chat distribution and whiteboard updates.
* **Database Layer:** Prisma ORM for simplified PostgreSQL relational storage and dynamic schema migrations.
* **Compiler & Build:** Custom `esbuild` configurations to bundle backend TypeScript code into a single, highly performant, server-side asset (`dist/server.cjs`). This prevents module-resolution failures on production Cloud runtimes.

---

## 📂 Project Directory Structure

```text
├── backend/                   # Node.js + Express Backend Source
│   ├── prisma/                # Prisma PostgreSQL schema & database models
│   ├── routes/                # Express API endpoint controllers
│   ├── middleware/            # JWT authentication & session parsers
│   ├── db.ts                  # Database connection pool setup
│   ├── sockets.ts             # Socket.io real-time event managers
│   └── server.ts              # Core backend entry point (used in production bundle)
│
├── frontend/                  # React + Vite Frontend Application
│   ├── components/            # Workspace sub-modules
│   │   ├── AgentWorkflowBuilder.tsx # Autonomous AI Agent Pipeline Builder
│   │   ├── Whiteboard.tsx           # Co-Design Vector Sketchboard
│   │   ├── ChatWorkspace.tsx        # Real-time Chat & Channel Workspace
│   │   ├── Terminal.tsx             # Interactive Developer Shell
│   │   ├── CheckoutModal.tsx        # Stripe billing mockup
│   │   ├── ProfileSelector.tsx      # Member presence directory
│   │   └── SpaceBackground.tsx      # Ambient canvas stars background
│   ├── App.tsx                # Main view router & tab context controller
│   └── types.ts               # Shared TypeScript schemas and interface types
│
├── .env.example               # Template environment configuration
├── server.ts                  # Hybrid Development/Production Express server runner
├── vite.config.ts             # Vite bundler, React and Tailwind compiler configuration
└── package.json               # Dependencies, scripts, and production triggers
```

---

## ⚙️ Local Development & Setup

Follow these steps to run DevPulse locally on your machine.

### Prerequisites
* **Node.js** (v18.x or newer recommended)
* **npm** (v9.x or newer)
* **PostgreSQL** (or standard Prisma-supported SQL database)

### 1. Installation
Clone this repository and install all of the client and server dependencies:
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory. Copy the placeholders from `.env.example`:
```bash
cp .env.example .env
```
Populate the missing credentials:
```env
# Server Ingress Settings
PORT=3000
NODE_ENV=development

# Database Settings
DATABASE_URL="postgresql://user:password@localhost:5432/devpulse"

# Security & Sessions
JWT_SECRET="YOUR_SECURE_JWT_SECRET"

# AI cognitive services (Do not prefix with VITE_ to keep it safe on the server)
GEMINI_API_KEY="YOUR_GOOGLE_GEMINI_API_KEY"

# Billing Integrations (optional)
STRIPE_SECRET_KEY="YOUR_STRIPE_SECRET_KEY"
```

### 3. Run Database Migrations
Initialize your database schemas using Prisma:
```bash
npx prisma db push
```

### 4. Fire Up the Development Server
Launch the local hybrid development platform:
```bash
npm run dev
```
The server will boot on `http://localhost:3000`. Open it in your browser to experience the DevPulse playground!

---

## 📦 Production Bundling & Deployment

To compile the application for deployment or serverless container runtimes:

### 1. Build the App
Run the standard build script:
```bash
npm run build
```
This single trigger executes:
1. Prisma Client code generation (`prisma generate`).
2. Frontend optimization, asset outputting, and minification to the static `/dist` directory via Vite.
3. Backend TypeScript compilation and bundling of `server.ts` into a self-contained CommonJS Node module (`dist/server.cjs`) via `esbuild`.

### 2. Run in Production Mode
Launch the production server:
```bash
npm run start
```
This boots Node directly using the optimized bundle `dist/server.cjs` on port `3000`.

---

## 🌌 Core Aesthetic Theme
DevPulse utilizes a **Slate Cosmic Twilight** visual style:
* Centered around a deeply dark background (`#080611`) accented by neon borders (`#06b6d4`, `#7c3aed`).
* Utilizes **Inter** as the primary body font for extreme legibility during developer operations.
* Paired with **JetBrains Mono** or **Fira Code** for console terminals, system telemetry indicators, and node configurations.
* Framed with micro-animations and glowing interactive states to provide tactile, high-tech interface responses.

---

## 📜 License
This project is licensed under the MIT License - see the LICENSE file for details.

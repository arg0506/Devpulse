
# DevPulse ⚡

> An ultra-clean, real-time chat and community platform built specifically for developers. It eliminates constant context-switching by combining instant team messaging with native code formatting, inline execution sandboxes, and keyboard-first (⌘K) navigation into a single, sleek ecosystem.

---

## 🖼️ Interface Preview

![DevPulse Desktop Interface](watermarked_img_13347180578365302995.png)

---

## ✨ Key Features

*   **💬 High-Velocity Messaging:** Real-time 1-on-1 direct messages and group chats optimized with low-latency WebSockets.
*   **💻 Native Code Workspaces:** Auto-detection and markdown rendering for code blocks with localized syntax highlighting. Features a simulated execution wrapper to preview code behaviors instantly.
*   **⌨️ Command Palette (⌘K):** Fully keyboard-driven UI overlay. Switch channels, open files, trigger snippets, or lookup team dependencies without lifting your hands from the keys.
*   **🌐 Tech-Stack Communities:** Build public or private developer networks divided into dedicated, multi-tier text channels (`#general`, `#help`, `#showcase`).
*   **📅 Bento-Grid Events:** A beautiful, asymmetrical events dashboard mapping out upcoming hackathons, webinars, and meetups with native RSVP tracking and auto-generated calendar event synching.
*   **🐙 Deep Git Integration:** Live webhook notifications for commits, PR status upgrades, and issue tracking rendered inside active discussion rooms as interactable rich UI cards.

---

## 🛠️ Tech Stack

| Layer | Technology | Key Utility |
| :--- | :--- | :--- |
| **Frontend** | React (v18+), TypeScript, Tailwind CSS | High information density, modern dark UI styling, and custom layout frameworks. |
| **Backend** | Node.js, Express, TypeScript | Modular architectural controller API and JWT-based request handling. |
| **Real-Time** | Socket.io | Bi-directional communication conduit for instantaneous message delivery. |
| **Database** | PostgreSQL + Prisma ORM | Relational performance charting user profiles, stack arrays, and membership maps. |

---

## ⚙️ Getting Started

### Prerequisites
*   **Node.js** (v18.0.0 or higher)
*   **PostgreSQL** (v14 or higher instance running locally or hosted)

### 1. Installation & Environment Configuration

Clone the repository and install dependencies for both the frontend and backend microservices:

```bash
git clone [https://github.com/your-username/devpulse.git](https://github.com/your-username/devpulse.git)
cd devpulse

# Setup backend environment
cd backend && npm install
cp .env.example .env

# Setup frontend environment
cd ../frontend && npm install

```

### 2. Configure Environment Variables

Populate the backend configuration matrix inside your newly created `.env` file:

```env
PORT=5000
DATABASE_URL="postgresql://<db_user>:<db_password>@localhost:5432/devpulse?schema=public"
JWT_SECRET="generate_a_cryptographically_secure_string_here"
CORS_ORIGIN="http://localhost:3000"

```

### 3. Database Sync & Seed

Generate data-structures inside PostgreSQL using the embedded Prisma schema files:

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate

```

### 4. Running the Ecosystem

Execute development environments on separate terminal threads to initiate parallel hot-reloads:

```bash
# Run Backend Engine (From /backend directory)
npm run dev

# Run Frontend Interface (From /frontend directory)
npm start

```

Open your browser to `http://localhost:3000` to interact with the system.

---

## ⌨️ Developer CLI Companion

DevPulse provides an internal package wrapper allowing developers to tap directly into team chats straight from their terminal window.

```bash
# Authenticate the local shell profile
dp login --token=<your_profile_jwt>

# Directly send a text string to a team member
dp send message --to @alexg "Production builds are stable. Merging branch main now."

# Stream a local code block asset directly into a specified target channel
dp send snippet --to #dev-team-alpha --lang python --file ./utils/process_data.py

```

---

## 🤝 Contributing

Contributions are what make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.


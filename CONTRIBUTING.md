# Contributing to Lemo

Thanks for helping. This guide covers how to get the project running, where things live, and what we expect from a change.

## Set up

Requires **Node.js 20** (18 works, 20 matches CI).

```bash
git clone https://github.com/arg0506/Devpulse.git
cd Devpulse
npm install
npm run dev            # http://localhost:3000
```

Useful commands:

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run lint` | Type-checks the whole project (client and server) |
| `npm test` | Runs the test suite in `tests/` |
| `npm run build` | Production build of the client and server |
| `npm start` | Runs the production build (needs `JWT_SECRET`) |

Run `npm run lint && npm test && npm run build` before you push. CI runs the same three steps.

## Project layout

- `server.ts`: the Express app, middleware and the Socket.io server
- `backend/db.ts`: the data store. All reads and writes go through it
- `backend/sockets.ts`: real-time events and their permission checks
- `backend/routes/`: REST routes, one file per area
- `backend/middleware/`: authentication and rate limiting
- `frontend/lib/permissions.ts`: community permission rules, shared with the server
- `frontend/types.ts`: data shapes shared by client and server
- `frontend/components/`: screens and dialogs
- `tests/`: unit tests for permissions, sessions, rate limiting, history and uploads
- `docs/API.md`: the REST and socket reference. Update it when you add or change an endpoint

## Ground rules

1. **Check permissions on the server.** The client may hide a button, but every action must be checked again in the route or socket handler. A feature is not finished until the server refuses the wrong person.
2. **Keep the permission rules in one place.** Add new rules to `frontend/lib/permissions.ts` and test them in `tests/permissions.test.ts`.
3. **Never trust client data.** Build messages, owners and timestamps from the authenticated user on the server. Validate lengths and types on every input.
4. **Do not store secrets in the browser.** Sessions live in the HttpOnly cookie. Do not add tokens to `localStorage`.
5. **Keep the data file safe.** Writes must go through `db`, which saves atomically. Do not write `backend-data.json` directly.
6. **Add a test for behaviour you change.** Pure rules are easy to test; see the existing files for the pattern. For a bug fix, write the test that fails first.

## Adding an endpoint

1. Add the handler in the matching file under `backend/routes/`, or in `backend/sockets.ts` for real-time events.
2. Check authentication (`authMiddleware`) and, for community actions, `requirePermission`.
3. Validate the input and return a clear `400`, `403` or `404` with a message.
4. Document it in `docs/API.md`.
5. Add the screen or call in `frontend/` and check the flow in the browser.

## Commits and pull requests

- Keep commits focused: one fix or feature per commit, with a short imperative subject (for example, `Add message search filters`).
- Explain *why* in the body when the change is not obvious.
- Each commit should pass `npm run lint` and `npm test`. Run the build before a release.
- In a pull request, say what you tested and how. Include screenshots for visual changes.

## Reporting security issues

Please do not open a public issue for a vulnerability. Use a private security advisory on GitHub so it can be fixed before it is announced.

## Code style

- TypeScript throughout. Avoid `any` in new code where a type fits.
- Follow the existing formatting (Prettier-style, two spaces, single quotes).
- Use the design tokens and utility classes in `src/index.css` rather than hard-coded colours where a token exists.
- Keep components small and focused. Shared pieces belong in `ui.tsx`.

## License

By contributing you agree that your work is released under the MIT License in `LICENSE`.

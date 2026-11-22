# Lemo API reference

Lemo exposes a REST API under `/api`, a Socket.io connection for live events, and static uploads under `/uploads`.

## Authentication

- Sign-up and sign-in set an **HttpOnly, SameSite=Strict session cookie** named `lemo_session` (7 days). The browser sends it automatically with requests and the socket handshake.
- Other clients can send `Authorization: Bearer <token>` instead. The token is the same value that the cookie carries.
- Sign-out (`POST /api/auth/logout`) invalidates every token issued to the account, on every device, and disconnects its live sockets.
- Sign-up and sign-in are rate limited to **10 attempts per IP address per 15 minutes**. A refused request gets `429` with a `Retry-After` header.

Error responses are JSON: `{ "error": "message" }`.

| Status | Meaning |
|---|---|
| `400` | The request is malformed or breaks a rule (for example, a built-in role cannot be deleted) |
| `401` | Not signed in, or the session has been revoked |
| `403` | Signed in, but not allowed to do this here |
| `404` | Not found |
| `429` | Too many attempts |

---

## REST endpoints

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | Storage type, whether Gemini is configured, server time |

### Auth — `/api/auth`

| Method | Path | Auth | Body | Description |
|---|---|---|---|---|
| POST | `/register` | — | `{ email, username, password, role?, avatarEmoji?, skills?, bio?, gitHubHandle? }` | Creates an account and sets the session cookie. Returns `{ user }`. |
| POST | `/firebase` | — | `{ idToken, username?, role?, avatarEmoji?, skills? }` | Starts a session from a Firebase sign-in. Creates the Lemo profile on first use. Returns `{ user }`. |
| POST | `/login` | — | `{ loginCredential, password }` | Signs in with email or username. Sets the cookie. Returns `{ user }`. |
| POST | `/logout` | ✓ | — | Ends every session for the account. |
| GET | `/me` | ✓ | — | The signed-in user's profile. |
| PATCH | `/me` | ✓ | any of `role`, `avatarEmoji`, `skills`, `customStatus`, `bio`, `gitHubHandle`, `status` | Updates the profile. |
| GET | `/profile` | ✓ | — | Same as `/me`, kept for older clients. |

Passwords must be 8 to 72 bytes. Usernames are 3 to 20 lowercase letters, numbers or underscores.

### Channels and messages

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/channels` | ✓ | Channels the user can see |
| GET | `/api/channels/:channelId/messages` | ✓ | The newest 50 messages: `{ messages, hasMore }`. Use the socket `messages:older` for earlier pages. |
| GET | `/api/users` | ✓ | Public profiles of everyone in the workspace |

### Communities (servers) — `/api/communities`

| Method | Path | Permission | Description |
|---|---|---|---|
| GET | `/` | — | Every community, without invite codes |
| POST | `/` | — | Create a community; the creator becomes its owner. Body: `{ name, description? }` |
| POST | `/:id/join` | — | Join, or leave if already a member |
| POST | `/join-invite` | — | Join with an invite code. Body: `{ code }` |
| GET | `/:id/invite` | `manage_invites` | The current invite code |
| POST | `/:id/invite/regenerate` | `manage_invites` | Replace the invite code; the old one stops working |
| POST | `/:id/roles` | `manage_roles` | Create a role. Body: `{ name, color?, permissions[] }` |
| PATCH | `/:id/roles/:roleId` | `manage_roles` | Edit a role. Body: any of `name`, `color`, `permissions` |
| DELETE | `/:id/roles/:roleId` | `manage_roles` | Delete a custom role |
| PUT | `/:id/members/:userId/roles` | `manage_roles` | Replace a member's roles. Body: `{ roleIds[] }` |
| DELETE | `/:id/members/:userId` | `kick_members` | Remove a member |
| POST | `/:id/channels` | `manage_channels` | Add a channel. Body: `{ name, description? }` |

Permissions: `administrator`, `manage_channels`, `manage_roles`, `manage_messages`, `manage_invites`, `kick_members`, `send_messages`. You can only grant permissions you hold.

### Events — `/api/events`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | — | Upcoming events |
| POST | `/` | ✓ | Create an event |
| POST | `/:id/rsvp` | ✓ | Toggle your RSVP |

### Payments — `/api/payments`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/config` | — | Whether checkout is in demo mode |
| POST | `/create-payment-intent` | ✓ | Start a checkout for a plan |
| POST | `/confirm-payment` | ✓ | Confirm a checkout |

### Agents — `/api/agents`

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/status` | ✓ | Whether Gemini is available |
| GET | `/workflows` | ✓ | The user's saved workflows |
| PUT | `/workflows/:id` | ✓ | Save a workflow |
| DELETE | `/workflows/:id` | ✓ | Delete a workflow |
| POST | `/llm` | ✓ | Run a Gemini step (rate limited per user) |
| POST | `/search` | ✓ | Run a grounded web search step (rate limited per user) |
| POST | `/dispatch` | ✓ | Post an action result to a channel or an https webhook |

### Uploads — `/uploads/:file`

Stored attachments. Images display inline; other files download. Responses carry `X-Content-Type-Options: nosniff` and a sandboxed `Content-Security-Policy`.

---

## Socket.io events

Connect to the same origin as the app. The session cookie authenticates the handshake. Without a session the connection is refused with `unauthorized`, or with `banned` for a banned account.

### Client → server

| Event | Payload | Notes |
|---|---|---|
| `user:join-channel` | `{ channelId }` | Joins the channel room and receives `init:messages` |
| `messages:older` | `{ channelId, beforeId }` | Requests the page of history before `beforeId` |
| `message:send` | `{ channelId, text, codeSnippet?, replyToId?, attachment? }` | Slash commands are run here. Refused for timed-out members and members without `send_messages` |
| `message:edit` | `{ messageId, text }` | Authors only |
| `message:delete` | `{ messageId }` | Authors only |
| `message:react` | `{ messageId, emoji }` | Toggles a reaction |
| `message:pin` | `{ messageId }` | Toggles a pin |
| `thread:get-replies` / `thread:send-reply` | `messageId` / `{ messageId, text }` | Threads |
| `typing:start` / `typing:stop` | `{ channelId }` | Typing indicators |
| `dm:open` | `{ userId }` | Opens a direct message |
| `channel:create` | `{ name, description?, category? }` | Creates a workspace channel |
| `event:open-channel` | `{ eventId }` | Opens an event's discussion channel |
| `whiteboard:get-state` / `whiteboard:draw` / `whiteboard:delete` / `whiteboard:clear` / `whiteboard:cursor` | board payloads | The shared whiteboard |
| `terminal:command` | `{ command }` | Runs a console command |
| `social:get` | — | Requests the caller's `social:data` |
| `friend:request` | `{ username }` | Acknowledged with `{ ok }` or `{ error }` |
| `friend:respond` | `{ requestId, accept }` | Accept or decline an incoming request |
| `friend:remove` | `{ userId }` | Remove a friend |
| `user:block` | `{ userId, blocked }` | Block or unblock |
| `mod:timeout` | `{ userId, minutes }` | Admins only. 1 to 10080 minutes |
| `mod:untimeout` | `{ userId }` | Admins only |
| `mod:ban` | `{ userId, reason }` | Admins only. Disconnects the user |
| `mod:unban` | `{ userId }` | Admins only |
| `mod:delete` | `{ messageId }` | Admins, or members with `manage_messages` in that community |

### Server → client

| Event | Meaning |
|---|---|
| `init:channels`, `init:messages`, `init:whiteboard`, `social:data`, `presence:list` | Initial state after connecting or joining |
| `messages:older` | A page of older messages, with `hasMore` |
| `message:new`, `message:update`, `message:deleted` | Live message changes in the joined channel |
| `notification:mention` | Someone mentioned you (sent to your personal room) |
| `mod:notice` | Private notice: a refused action, a timeout, a ban |
| `community:new`, `community:update`, `channel:new` | Community and channel changes |
| `social:data` | Friends, requests, blocks, and (for admins) members and the audit log |
| `thread:replies-list`, `thread:reply-new` | Thread updates |
| `typing:start`, `typing:stop` | Typing indicators |
| `whiteboard:*` | Board updates |
| `terminal:response` | Console output |

---

## Data limits

| Item | Limit |
|---|---|
| JSON request body | 1 MB |
| Message text | 8,000 characters |
| Attachment | 500 KB, images and most documents; HTML, SVG and XML are refused |
| Message history per page | 50 |
| Code snippet | 20,000 characters |

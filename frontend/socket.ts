import { io } from 'socket.io-client';

/** One shared connection to the Lemo server. Connect after sign-in. */
export const socket = io({
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  // No token here: the browser sends the HttpOnly session cookie with the handshake.
});

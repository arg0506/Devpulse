import { io } from 'socket.io-client';
import { getToken } from './lib/api';

/** One shared connection to the Lemo server. Connect after sign-in. */
export const socket = io({
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  auth: (cb) => cb({ token: getToken() }),
});

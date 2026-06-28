import { io } from 'socket.io-client';

// Establish Socket connection to the same host serving the site
export const socket = io(
  typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.host}` 
    : '', 
  {
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  }
);

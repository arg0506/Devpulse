import type { Server as SocketIOServer } from 'socket.io';
import { db, BOT_IDS } from './db';
import { ChatPresence, DevUser } from '../frontend/types';

let ioRef: SocketIOServer | null = null;

/** userId -> number of open sockets */
export const connectionCounts = new Map<string, number>();

export function setIO(io: SocketIOServer) {
  ioRef = io;
}

/** The Socket.io server, available once sockets are initialised. */
export function getIO(): SocketIOServer | null {
  return ioRef;
}

/** Public view of a profile: everything except billing details, with the photo as a flag (it is served separately). */
export function toPublicProfile(user: DevUser) {
  const { avatarImage, paymentIntentId, paymentStatus, ...rest } = user as DevUser & Record<string, unknown>;
  return { ...rest, hasAvatar: !!avatarImage, avatarVersion: user.avatarVersion || 0 };
}

export function buildPresenceList(): ChatPresence[] {
  return db.getUsers().map((user) => {
    const connected = BOT_IDS.has(user.id) || (connectionCounts.get(user.id) || 0) > 0;
    const status = connected ? (user.status === 'offline' ? 'online' : user.status) : 'offline';
    return {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      avatarEmoji: user.avatarEmoji,
      hasAvatar: !!user.avatarImage,
      avatarVersion: user.avatarVersion || 0,
      status,
      customStatus: user.customStatus,
      skills: user.skills,
      xpPoints: user.xpPoints,
      tier: user.tier,
    };
  });
}

export function broadcastPresence() {
  ioRef?.emit('presence:list', buildPresenceList());
}

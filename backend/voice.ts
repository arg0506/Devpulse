/**
 * Who is in each voice channel. The server only tracks membership and relays WebRTC
 * signalling between the people in a room; audio and video travel directly between browsers.
 */
export interface VoicePeer {
  socketId: string;
  userId: string;
  username: string;
  avatarEmoji: string;
}

export class VoiceRooms {
  private rooms = new Map<string, Map<string, VoicePeer>>();
  private socketRoom = new Map<string, string>();

  /** Adds a peer to a room, moving them out of any room they were in. Returns the room they left, if any. */
  join(channelId: string, peer: VoicePeer): string | undefined {
    const previous = this.leave(peer.socketId);
    if (!this.rooms.has(channelId)) this.rooms.set(channelId, new Map());
    this.rooms.get(channelId)!.set(peer.socketId, peer);
    this.socketRoom.set(peer.socketId, channelId);
    return previous;
  }

  /** Removes a socket from its room. Returns the room it was in, or undefined. */
  leave(socketId: string): string | undefined {
    const channelId = this.socketRoom.get(socketId);
    if (!channelId) return undefined;
    this.socketRoom.delete(socketId);
    const room = this.rooms.get(channelId);
    room?.delete(socketId);
    if (room && room.size === 0) this.rooms.delete(channelId);
    return channelId;
  }

  roomOf(socketId: string): string | undefined {
    return this.socketRoom.get(socketId);
  }

  /** Everyone in a room, optionally leaving one socket out. */
  peers(channelId: string, exceptSocketId?: string): VoicePeer[] {
    return [...(this.rooms.get(channelId)?.values() ?? [])].filter((p) => p.socketId !== exceptSocketId);
  }

  /** True when both sockets are in the same room, so one may signal the other. */
  sameRoom(a: string, b: string): boolean {
    const room = this.socketRoom.get(a);
    return !!room && room === this.socketRoom.get(b);
  }
}

export const voiceRooms = new VoiceRooms();

/** STUN servers used to find a route between browsers. Set VOICE_ICE_SERVERS (JSON) to add TURN. */
export function iceServers(): { urls: string | string[]; username?: string; credential?: string }[] {
  const custom = process.env.VOICE_ICE_SERVERS;
  if (custom) {
    try {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      console.warn('[voice] VOICE_ICE_SERVERS is not valid JSON; using the default STUN server.');
    }
  }
  return [{ urls: 'stun:stun.l.google.com:19302' }];
}

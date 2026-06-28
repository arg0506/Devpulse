export interface DevUser {
  id: string;
  username: string;
  role: string;
  avatarEmoji: string;
  skills: string[];
  status: 'online' | 'away' | 'dnd' | 'offline';
  customStatus?: string;
  streakCount: number;
  xpPoints: number;
}

export interface CodeSnippet {
  code: string;
  language: string;
  title: string;
}

export interface MessageReaction {
  emoji: string;
  userIds: string[];
}

export interface DevMessage {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  role: string;
  avatarEmoji: string;
  text: string;
  timestamp: string;
  codeSnippet?: CodeSnippet;
  repliesCount: number;
  reactions: MessageReaction[];
  isPinned?: boolean;
}

export interface DevChannel {
  id: string;
  name: string;
  description: string;
  category: 'Channels' | 'Guilds' | 'Direct Messages';
  isPrivate?: boolean;
}

export interface ThreadReply {
  id: string;
  messageId: string;
  userId: string;
  username: string;
  role: string;
  avatarEmoji: string;
  text: string;
  timestamp: string;
}

export type WhiteboardTool = 'select' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'eraser';

export interface WhiteboardElement {
  id: string;
  type: 'rectangle' | 'circle' | 'line' | 'arrow' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  text?: string;
  points?: number[];
  createdBy: string;
  username: string;
}

export interface ChatPresence {
  userId: string;
  username: string;
  role: string;
  avatarEmoji: string;
  status: 'online' | 'away' | 'dnd' | 'offline';
  customStatus?: string;
  typingInChannel?: string; // channel ID if typing
}

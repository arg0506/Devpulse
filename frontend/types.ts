export type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';
export type PlanTier = 'Free' | 'Pro' | 'Enterprise';

export interface DevUser {
  id: string;
  username: string;
  role: string;
  avatarEmoji: string;
  skills: string[];
  status: PresenceStatus;
  customStatus?: string;
  bio?: string;
  gitHubHandle?: string;
  streakCount: number;
  xpPoints: number;
  tier?: PlanTier;
  paymentStatus?: string;
  paymentIntentId?: string;
  createdAt?: string;
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
  isBot?: boolean;
  /** The message this one replies to, with a short preview of its text. */
  replyTo?: { id: string; username: string; text: string };
  /** An inline image, sent as a data URL. */
  attachment?: { name: string; type: string; dataUrl: string };
  /** Usernames mentioned with @name in the text. */
  mentions?: string[];
  editedAt?: string;
}

export type ChannelCategory = 'Channels' | 'Guilds' | 'Direct Messages' | 'Events';

export interface DevChannel {
  id: string;
  name: string;
  description: string;
  category: ChannelCategory;
  isPrivate?: boolean;
  /** Participants, only set for direct messages. */
  members?: string[];
  communityId?: string;
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

export type WhiteboardTool = 'select' | 'pen' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text' | 'eraser';

export interface WhiteboardElement {
  id: string;
  type: 'pen' | 'rectangle' | 'circle' | 'line' | 'arrow' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  strokeWidth?: number;
  text?: string;
  /** Flat [x0, y0, x1, y1, ...] list, relative to x/y, for freehand strokes. */
  points?: number[];
  createdBy: string;
  username: string;
}

export interface ChatPresence {
  userId: string;
  username: string;
  role: string;
  avatarEmoji: string;
  status: PresenceStatus;
  customStatus?: string;
  skills?: string[];
  xpPoints?: number;
  tier?: PlanTier;
}

export type Permission =
  | 'administrator'
  | 'manage_channels'
  | 'manage_roles'
  | 'manage_messages'
  | 'manage_invites'
  | 'kick_members'
  | 'send_messages';

export interface CommunityRole {
  id: string;
  name: string;
  color: string;
  permissions: Permission[];
  /** Built-in roles cannot be deleted. */
  isDefault?: boolean;
}

export interface DevCommunity {
  id: string;
  name: string;
  description: string;
  channels: string[];
  members: string[];
  ownerId?: string;
  /** Only sent to members who can manage invites. */
  inviteCode?: string;
  roles?: CommunityRole[];
  /** userId -> role ids. Everyone also holds the "member" role. */
  memberRoles?: Record<string, string[]>;
}

export interface DevEvent {
  id: string;
  title: string;
  description: string;
  /** ISO 8601 date-time. */
  date: string;
  meetLink: string;
  creator: string;
  communityId: string;
  rsvps: string[];
}

// ---------- Agent studio ----------

export type AgentNodeType = 'trigger' | 'gemini' | 'search' | 'code' | 'action';

export interface AgentNodeConfig {
  triggerType?: 'manual' | 'chat_message' | 'webhook' | 'schedule';
  cron?: string;
  samplePayload?: string;
  prompt?: string;
  systemInstruction?: string;
  temperature?: number;
  searchQuery?: string;
  script?: string;
  dispatchType?: 'channel' | 'webhook';
  channel?: string;
  webhookUrl?: string;
  payloadTemplate?: string;
}

export interface AgentNode {
  id: string;
  type: AgentNodeType;
  title: string;
  x: number;
  y: number;
  config: AgentNodeConfig;
}

export interface AgentEdge {
  id: string;
  fromId: string;
  toId: string;
}

export interface AgentWorkflow {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  nodes: AgentNode[];
  edges: AgentEdge[];
  updatedAt: string;
}

export type PresenceStatus = 'online' | 'away' | 'dnd' | 'offline';
export type PlanTier = 'Free' | 'Pro' | 'Enterprise';

/** Profile links a developer can add. Each key is checked against its own sites on the server. */
export type LinkKey = 'website' | 'github' | 'linkedin' | 'x' | 'stackoverflow' | 'devto' | 'medium' | 'youtube' | 'hashnode' | 'kaggle' | 'codepen';

export interface DevUser {
  id: string;
  username: string;
  /** Shown instead of the @username when set. */
  displayName?: string;
  role: string;
  avatarEmoji: string;
  /** Profile photo as a data URL. Served from /api/users/:id/avatar to everyone else. */
  avatarImage?: string;
  avatarVersion?: number;
  skills: string[];
  status: PresenceStatus;
  customStatus?: string;
  bio?: string;
  location?: string;
  links?: Partial<Record<LinkKey, string>>;
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
  linkCard?: LinkCard;
}

export type ChannelCategory = 'Channels' | 'Guilds' | 'Direct Messages' | 'Events' | 'Groups';

/** An event or call link shared in chat, recognised from its address. */
export interface LinkCard {
  url: string;
  host: string;
  platform: string;
  kind: 'event' | 'call' | 'community' | 'link';
}

export interface DevChannel {
  id: string;
  name: string;
  description: string;
  category: ChannelCategory;
  isPrivate?: boolean;
  /** Participants, set for direct messages and group chats. */
  members?: string[];
  communityId?: string;
  /** Set on the chat channel of a group. */
  groupId?: string;
}

/** A community group: members chat in its channel and share event links. */
export interface DevGroup {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  channelId: string;
  members: string[];
  createdAt: string;
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
  displayName?: string;
  role: string;
  avatarEmoji: string;
  hasAvatar?: boolean;
  avatarVersion?: number;
  status: PresenceStatus;
  customStatus?: string;
  skills?: string[];
  xpPoints?: number;
  tier?: PlanTier;
}

export interface DevCommunity {
  id: string;
  name: string;
  description: string;
  channels: string[];
  members: string[];
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

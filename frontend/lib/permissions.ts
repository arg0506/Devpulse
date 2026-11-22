import type { CommunityRole, DevCommunity, Permission } from '../types';

/** Shared by the server and the client, so both sides agree on who can do what. */
export const ALL_PERMISSIONS: Permission[] = [
  'administrator',
  'manage_channels',
  'manage_roles',
  'manage_messages',
  'manage_invites',
  'kick_members',
  'send_messages',
];

export const PERMISSION_LABELS: Record<Permission, { label: string; hint: string }> = {
  administrator: { label: 'Administrator', hint: 'Everything, including every permission below.' },
  manage_channels: { label: 'Manage channels', hint: 'Create channels in this community.' },
  manage_roles: { label: 'Manage roles', hint: 'Create roles and give them to members.' },
  manage_messages: { label: 'Manage messages', hint: 'Delete other members’ messages in this community.' },
  manage_invites: { label: 'Manage invites', hint: 'Create and reset the invite link.' },
  kick_members: { label: 'Kick members', hint: 'Remove members from the community.' },
  send_messages: { label: 'Send messages', hint: 'Post in this community’s channels.' },
};

/** Role ids: "owner" is the creator, "member" applies to everyone in the community. */
export const DEFAULT_ROLES: CommunityRole[] = [
  { id: 'owner', name: 'Owner', color: '#ffd23f', permissions: ['administrator'], isDefault: true },
  {
    id: 'admin',
    name: 'Admin',
    color: '#ff8fc7',
    permissions: ['manage_channels', 'manage_roles', 'manage_messages', 'manage_invites', 'kick_members', 'send_messages'],
    isDefault: true,
  },
  { id: 'mod', name: 'Moderator', color: '#7cc4ff', permissions: ['manage_messages', 'kick_members', 'send_messages'], isDefault: true },
  { id: 'member', name: 'Member', color: '#a1a7b3', permissions: ['send_messages'], isDefault: true },
];

/** Every permission a member holds in a community. Non-members hold none. */
export function communityPermissions(community: DevCommunity, userId: string): Set<Permission> {
  const isMember = community.members.includes(userId) || community.ownerId === userId;
  if (!isMember) return new Set();
  if (community.ownerId === userId) return new Set(ALL_PERMISSIONS);

  const roles = community.roles ?? DEFAULT_ROLES;
  const held = new Set(['member', ...(community.memberRoles?.[userId] ?? [])]);
  const perms = new Set<Permission>();
  for (const role of roles) {
    if (held.has(role.id)) role.permissions.forEach((p) => perms.add(p));
  }
  return perms.has('administrator') ? new Set(ALL_PERMISSIONS) : perms;
}

export function hasPermission(community: DevCommunity | undefined, userId: string, permission: Permission): boolean {
  return !!community && communityPermissions(community, userId).has(permission);
}

/** The role that gives a member their colour: the first role in precedence order they hold. */
export function topRole(community: DevCommunity, userId: string): CommunityRole | undefined {
  const roles = community.roles ?? DEFAULT_ROLES;
  if (community.ownerId === userId) return roles.find((r) => r.id === 'owner');
  const held = new Set(community.memberRoles?.[userId] ?? []);
  return roles.find((r) => held.has(r.id) && r.id !== 'member') ?? roles.find((r) => r.id === 'member');
}

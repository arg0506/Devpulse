import { Router, Response } from 'express';
import { randomBytes } from 'crypto';
import { db } from '../db';
import prisma, { isPrismaEnabled } from '../prismaClient';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { getIO } from '../realtime';
import { ALL_PERMISSIONS, communityPermissions, hasPermission } from '../../frontend/lib/permissions';
import { CommunityRole, DevCommunity, Permission } from '../../frontend/types';

const router = Router();

/** Best-effort copy into Postgres. The JSON store stays the source of truth for the live workspace. */
function mirror(task: () => Promise<unknown>) {
  if (!isPrismaEnabled()) return;
  task().catch((err) => console.warn('[communities] Postgres mirror failed:', err.message));
}

/** What everyone may see. The invite link is only sent to people who can manage invites. */
function publicView(c: DevCommunity): DevCommunity {
  return { ...c, inviteCode: undefined };
}

function announce(c: DevCommunity) {
  getIO()?.emit('community:update', publicView(c));
}

/** The community when the signed-in user holds `permission` in it. Otherwise sends the error and returns null. */
function requirePermission(req: AuthenticatedRequest, res: Response, permission: Permission): DevCommunity | null {
  const community = db.findCommunity(String(req.params.id));
  if (!community) {
    res.status(404).json({ error: 'That community no longer exists.' });
    return null;
  }
  if (!hasPermission(community, req.user!.userId, permission)) {
    res.status(403).json({ error: 'You do not have permission to do that here.' });
    return null;
  }
  return community;
}

/** Permissions can only be granted if the granter holds them too. */
function canGrant(community: DevCommunity, userId: string, permissions: Permission[]): boolean {
  const held = communityPermissions(community, userId);
  return permissions.every((p) => held.has(p));
}

function cleanPermissions(raw: unknown): Permission[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map(String))].filter((p): p is Permission => (ALL_PERMISSIONS as string[]).includes(p));
}

function cleanColour(raw: unknown, fallback: string): string {
  return typeof raw === 'string' && /^#[0-9a-f]{6}$/i.test(raw) ? raw : fallback;
}

function mirrorMembership(communityId: string, userId: string, joined: boolean) {
  mirror(async () => {
    if (joined) {
      await prisma.communityMember.upsert({
        where: { userId_communityId: { userId, communityId } },
        update: {},
        create: { userId, communityId },
      });
    } else {
      await prisma.communityMember.deleteMany({ where: { userId, communityId } });
    }
  });
}

router.get('/', (_req, res) => {
  res.json(db.getCommunities().map(publicView));
});

router.post('/', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  if (name.length < 3) return res.status(400).json({ error: 'Community names need at least 3 characters.' });

  const userId = req.user!.userId;
  const community = db.createCommunity(name.slice(0, 40), description.slice(0, 200), userId);
  const io = getIO();
  io?.emit('community:new', publicView(community));
  community.channels.forEach((id) => {
    const chan = db.getChannel(id);
    if (chan) io?.emit('channel:new', chan);
  });

  mirror(async () => {
    await prisma.community.upsert({
      where: { id: community.id },
      update: {},
      create: {
        id: community.id,
        name: community.name,
        description: community.description,
        ownerId: userId,
        members: { create: { userId, role: 'ADMIN' } },
      },
    });
  });

  // The creator owns the community, so they receive the invite link too.
  return res.status(201).json(community);
});

/** Join, or leave when already a member. */
router.post('/:id/join', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.userId;
  if (db.isBannedFromCommunity(String(req.params.id), userId)) {
    return res.status(403).json({ error: 'You are banned from this community.' });
  }
  const community = db.toggleCommunityMembership(String(req.params.id), userId);
  if (!community) return res.status(404).json({ error: 'That community no longer exists.' });
  announce(community);
  mirrorMembership(community.id, userId, community.members.includes(userId));
  return res.json(publicView(community));
});

/** Join with an invite link code. */
router.post('/join-invite', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const code = String(req.body?.code || '')
    .trim()
    .toLowerCase();
  const found = code ? db.findCommunityByInvite(code) : undefined;
  if (!found) return res.status(404).json({ error: 'That invite is no longer valid.' });
  const userId = req.user!.userId;
  if (db.isBannedFromCommunity(found.id, userId)) {
    return res.status(403).json({ error: 'You are banned from this community.' });
  }
  const community = db.joinCommunity(found.id, userId);
  if (!community) return res.status(404).json({ error: 'That community no longer exists.' });
  announce(community);
  mirrorMembership(community.id, userId, true);
  return res.json(publicView(community));
});

router.get('/:id/invite', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const community = requirePermission(req, res, 'manage_invites');
  if (community) res.json({ code: community.inviteCode });
});

router.post('/:id/invite/regenerate', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const community = requirePermission(req, res, 'manage_invites');
  if (!community) return;
  res.json({ code: db.regenerateInvite(community.id) });
});

router.post('/:id/roles', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const community = requirePermission(req, res, 'manage_roles');
  if (!community) return;
  const name = String(req.body?.name || '').trim();
  if (name.length < 2 || name.length > 24) return res.status(400).json({ error: 'Role names use 2–24 characters.' });
  const permissions = cleanPermissions(req.body?.permissions);
  if (!canGrant(community, req.user!.userId, permissions)) {
    return res.status(403).json({ error: 'You cannot grant permissions you do not have.' });
  }
  const role: CommunityRole = {
    id: `role-${randomBytes(4).toString('hex')}`,
    name,
    color: cleanColour(req.body?.color, '#7cc4ff'),
    permissions,
  };
  db.createCommunityRole(community.id, role);
  announce(db.findCommunity(community.id)!);
  return res.status(201).json(role);
});

router.patch('/:id/roles/:roleId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const community = requirePermission(req, res, 'manage_roles');
  if (!community) return;
  const role = community.roles?.find((r) => r.id === req.params.roleId);
  if (!role) return res.status(404).json({ error: 'That role no longer exists.' });
  if (role.id === 'owner') return res.status(403).json({ error: 'The owner role cannot be changed.' });

  const patch: Partial<CommunityRole> = {};
  if (typeof req.body?.name === 'string') {
    const name = req.body.name.trim();
    if (name.length < 2 || name.length > 24) return res.status(400).json({ error: 'Role names use 2–24 characters.' });
    patch.name = name;
  }
  if (req.body?.color !== undefined) patch.color = cleanColour(req.body.color, role.color);
  if (req.body?.permissions !== undefined) {
    const permissions = cleanPermissions(req.body.permissions);
    if (!canGrant(community, req.user!.userId, permissions)) {
      return res.status(403).json({ error: 'You cannot grant permissions you do not have.' });
    }
    patch.permissions = permissions;
  }
  const updated = db.updateCommunityRole(community.id, role.id, patch);
  announce(db.findCommunity(community.id)!);
  return res.json(updated);
});

router.delete('/:id/roles/:roleId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const community = requirePermission(req, res, 'manage_roles');
  if (!community) return;
  const role = community.roles?.find((r) => r.id === req.params.roleId);
  if (!role) return res.status(404).json({ error: 'That role no longer exists.' });
  if (role.isDefault) return res.status(400).json({ error: 'Built-in roles cannot be deleted.' });
  db.deleteCommunityRole(community.id, role.id);
  announce(db.findCommunity(community.id)!);
  return res.json({ ok: true });
});

/** Replaces a member's roles. Owner and member roles are fixed, and roles that grant more than the actor holds are refused. */
router.put('/:id/members/:userId/roles', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const community = requirePermission(req, res, 'manage_roles');
  if (!community) return;
  const target = String(req.params.userId);
  if (!community.members.includes(target) || community.ownerId === target) {
    return res.status(400).json({ error: 'That member’s roles cannot be changed.' });
  }
  const requested = Array.isArray(req.body?.roleIds) ? req.body.roleIds.map(String) : [];
  const roles = (community.roles || []).filter((r) => requested.includes(r.id) && r.id !== 'owner' && r.id !== 'member');
  const grants = roles.flatMap((r) => r.permissions);
  if (!canGrant(community, req.user!.userId, grants)) {
    return res.status(403).json({ error: 'You cannot give out roles with permissions you do not have.' });
  }
  db.setMemberRoles(community.id, target, roles.map((r) => r.id));
  announce(db.findCommunity(community.id)!);
  return res.json({ roleIds: roles.map((r) => r.id) });
});

/** Bans a member. A banned person is removed and cannot rejoin until unbanned. */
router.post('/:id/bans', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const community = requirePermission(req, res, 'ban_members');
  if (!community) return;
  const target = String(req.body?.userId || '');
  if (!target || target === req.user!.userId || community.ownerId === target) {
    return res.status(400).json({ error: 'That person cannot be banned.' });
  }
  if (!db.getUser(target)) return res.status(404).json({ error: 'That account no longer exists.' });
  const reason = String(req.body?.reason || '').trim().slice(0, 140) || 'No reason given';
  db.banFromCommunity(community.id, target, reason);
  announce(db.findCommunity(community.id)!);
  mirrorMembership(community.id, target, false);
  return res.status(201).json({ ok: true });
});

router.delete('/:id/bans/:userId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const community = requirePermission(req, res, 'ban_members');
  if (!community) return;
  db.unbanFromCommunity(community.id, String(req.params.userId));
  announce(db.findCommunity(community.id)!);
  return res.json({ ok: true });
});

router.delete('/:id/members/:userId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const community = requirePermission(req, res, 'kick_members');
  if (!community) return;
  const target = String(req.params.userId);
  if (target === req.user!.userId || community.ownerId === target) {
    return res.status(400).json({ error: 'That member cannot be removed.' });
  }
  db.kickMember(community.id, target);
  announce(db.findCommunity(community.id)!);
  mirrorMembership(community.id, target, false);
  return res.json({ ok: true });
});

/** Limits a community channel to some roles, or opens it to everyone with an empty list. */
router.patch('/:id/channels/:channelId', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const community = requirePermission(req, res, 'manage_channels');
  if (!community) return;
  if (!community.channels.includes(String(req.params.channelId))) {
    return res.status(404).json({ error: 'That channel is not in this community.' });
  }
  const valid = new Set((community.roles || []).map((r) => r.id).filter((id) => id !== 'owner'));
  const requested: string[] = Array.isArray(req.body?.roleIds) ? (req.body.roleIds as unknown[]).map((id) => String(id)) : [];
  const roleIds = [...new Set(requested)].filter((id) => valid.has(id) && id !== 'member');
  const channel = db.setChannelRoles(String(req.params.channelId), roleIds);
  if (!channel) return res.status(404).json({ error: 'That channel no longer exists.' });
  getIO()?.emit('channel:new', channel);
  announce(db.findCommunity(community.id)!);
  return res.json(channel);
});

router.post('/:id/channels', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const community = requirePermission(req, res, 'manage_channels');
  if (!community) return;
  const name = String(req.body?.name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  if (name.length < 2) return res.status(400).json({ error: 'Channel names need at least 2 letters or numbers.' });
  const kind = req.body?.kind === 'voice' ? 'voice' : 'text';
  const channel = db.addCommunityChannel(community.id, name, String(req.body?.description || '').slice(0, 140), kind);
  if (!channel) return res.status(404).json({ error: 'That community no longer exists.' });
  getIO()?.emit('channel:new', channel);
  announce(db.findCommunity(community.id)!);
  return res.status(201).json(channel);
});

export default router;

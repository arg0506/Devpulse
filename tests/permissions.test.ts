import { test } from 'node:test';
import assert from 'node:assert/strict';
import { communityPermissions, hasPermission, topRole, ALL_PERMISSIONS } from '../frontend/lib/permissions';
import type { DevCommunity } from '../frontend/types';

const OWNER = 'user-owner';
const ADMIN = 'user-admin';
const MOD = 'user-mod';
const MEMBER = 'user-member';
const OUTSIDER = 'user-outsider';

function community(overrides: Partial<DevCommunity> = {}): DevCommunity {
  return {
    id: 'comm-test',
    name: 'Test',
    description: '',
    channels: ['test-general'],
    members: [OWNER, ADMIN, MOD, MEMBER],
    ownerId: OWNER,
    memberRoles: {
      [ADMIN]: ['admin'],
      [MOD]: ['mod'],
    },
    ...overrides,
  };
}

test('the owner holds every permission', () => {
  const c = community();
  for (const p of ALL_PERMISSIONS) assert.equal(hasPermission(c, OWNER, p), true, p);
});

test('an admin can manage channels, roles, messages and invites but not the owner role', () => {
  const c = community();
  assert.equal(hasPermission(c, ADMIN, 'manage_channels'), true);
  assert.equal(hasPermission(c, ADMIN, 'manage_roles'), true);
  assert.equal(hasPermission(c, ADMIN, 'manage_messages'), true);
  assert.equal(hasPermission(c, ADMIN, 'manage_invites'), true);
  assert.equal(hasPermission(c, ADMIN, 'administrator'), false);
});

test('a moderator can delete messages and kick, but cannot manage channels', () => {
  const c = community();
  assert.equal(hasPermission(c, MOD, 'manage_messages'), true);
  assert.equal(hasPermission(c, MOD, 'kick_members'), true);
  assert.equal(hasPermission(c, MOD, 'manage_channels'), false);
  assert.equal(hasPermission(c, MOD, 'manage_roles'), false);
});

test('a plain member can only send messages', () => {
  const c = community();
  assert.equal(hasPermission(c, MEMBER, 'send_messages'), true);
  for (const p of ALL_PERMISSIONS.filter((p) => p !== 'send_messages' && p !== 'administrator')) {
    assert.equal(hasPermission(c, MEMBER, p), false, p);
  }
});

test('a non-member holds no permissions, not even send_messages', () => {
  const c = community();
  assert.equal(communityPermissions(c, OUTSIDER).size, 0);
});

test('the administrator permission grants everything', () => {
  const c = community({
    roles: [
      { id: 'member', name: 'Member', color: '#fff', permissions: ['send_messages'], isDefault: true },
      { id: 'boss', name: 'Boss', color: '#fff', permissions: ['administrator'] },
    ],
    memberRoles: { [MEMBER]: ['boss'] },
  });
  for (const p of ALL_PERMISSIONS) assert.equal(hasPermission(c, MEMBER, p), true, p);
});

test('a custom role adds exactly the permissions it lists', () => {
  const c = community({
    roles: [
      { id: 'member', name: 'Member', color: '#fff', permissions: ['send_messages'], isDefault: true },
      { id: 'helper', name: 'Helper', color: '#fff', permissions: ['manage_messages'] },
    ],
    memberRoles: { [MEMBER]: ['helper'] },
  });
  assert.equal(hasPermission(c, MEMBER, 'manage_messages'), true);
  assert.equal(hasPermission(c, MEMBER, 'manage_channels'), false);
});

test('removing a member removes their permissions', () => {
  const c = community({ members: [OWNER, ADMIN], memberRoles: { [MEMBER]: ['admin'] } });
  assert.equal(hasPermission(c, MEMBER, 'manage_channels'), false);
});

test('a missing community grants nothing', () => {
  assert.equal(hasPermission(undefined, OWNER, 'send_messages'), false);
});

test('topRole picks the most senior role a member holds', () => {
  const c = community({ memberRoles: { [ADMIN]: ['admin'], [MOD]: ['mod'], [MEMBER]: ['mod', 'admin'] } });
  assert.equal(topRole(c, MEMBER)?.id, 'admin');
  assert.equal(topRole(c, OWNER)?.id, 'owner');
  assert.equal(topRole(c, MOD)?.id, 'mod');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lemo-private-'));
process.env.DEVPULSE_DATA_FILE = path.join(dir, 'data.json');

test('a private community channel is visible only to owners, admins and its roles', async () => {
  const { db } = await import('../backend/db');
  const owner = 'user-pc-owner';
  const admin = 'user-pc-admin';
  const helper = 'user-pc-helper';
  const plain = 'user-pc-plain';
  const outsider = 'user-pc-outsider';

  db.setCredential(owner, 'pc-owner@example.com', 'x');
  const comm = db.createCommunity('Private Crew', 'test', owner);
  db.joinCommunity(comm.id, admin);
  db.joinCommunity(comm.id, helper);
  db.joinCommunity(comm.id, plain);
  db.setMemberRoles(comm.id, admin, ['admin']);
  const role = db.createCommunityRole(comm.id, {
    id: 'role-helper-test',
    name: 'Helper',
    color: '#3ddc97',
    permissions: ['send_messages'],
  })!;
  db.setMemberRoles(comm.id, helper, [role.id]);

  const channel = db.addCommunityChannel(comm.id, 'staff-only', 'private room')!;
  assert.equal(db.canAccessChannel(channel.id, owner), true, 'public until restricted');

  db.setChannelRoles(channel.id, ['role-helper-test']);
  assert.equal(db.canAccessChannel(channel.id, owner), true, 'owner always sees it');
  assert.equal(db.canAccessChannel(channel.id, admin), true, 'people who manage channels always see it');
  assert.equal(db.canAccessChannel(channel.id, helper), true, 'the listed role sees it');
  assert.equal(db.canAccessChannel(channel.id, plain), false, 'other members do not');
  assert.equal(db.canAccessChannel(channel.id, outsider), false, 'non-members do not');

  assert.equal(
    db.getChannelsForUser(plain).some((c) => c.id === channel.id),
    false,
    'the channel is hidden from the list',
  );
  assert.equal(
    db.getChannelsForUser(helper).some((c) => c.id === channel.id),
    true,
    'the channel is listed for the role',
  );

  db.setChannelRoles(channel.id, []);
  assert.equal(db.canAccessChannel(channel.id, plain), true, 'clearing the roles opens it again');
});

test('banned people lose access to a community', async () => {
  const { db } = await import('../backend/db');
  const owner = 'user-ban-owner';
  const member = 'user-ban-member';
  db.setCredential(owner, 'ban-owner@example.com', 'x');
  const comm = db.createCommunity('Ban Test Crew', 'test', owner);
  db.joinCommunity(comm.id, member);
  assert.equal(db.isBannedFromCommunity(comm.id, member), false);
  db.banFromCommunity(comm.id, member, 'spam');
  assert.equal(db.isBannedFromCommunity(comm.id, member), true);
  assert.equal(db.findCommunity(comm.id)!.members.includes(member), false);
  db.unbanFromCommunity(comm.id, member);
  assert.equal(db.isBannedFromCommunity(comm.id, member), false);
});

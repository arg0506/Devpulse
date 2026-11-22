import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lemo-groups-'));
process.env.DEVPULSE_DATA_FILE = path.join(dir, 'data.json');

async function setup() {
  const { db } = await import('../backend/db');
  const ids = ['user-g-ana', 'user-g-ben', 'user-g-cy', 'user-g-dev'];
  for (const id of ids) db.setCredential(id, `${id}@example.com`, 'x');
  for (const id of ids) db.saveUser({ id, username: id.replace('user-', ''), role: 'Developer', avatarEmoji: '🙂', skills: [], status: 'online', streakCount: 1, xpPoints: 0, tier: 'Free', createdAt: new Date().toISOString() });
  return { db, ana: ids[0], ben: ids[1], cy: ids[2], dev: ids[3] };
}

test('a group has its creator as the first admin and only its members can see it', async () => {
  const { db, ana, ben, cy } = await setup();
  const group = db.createGroup('Weekend plans', ana, [ben]);
  assert.equal(group.category, 'Groups');
  assert.deepEqual(group.admins, [ana]);
  assert.deepEqual([...group.members!].sort(), [ana, ben].sort());
  assert.equal(db.canAccessChannel(group.id, ben), true);
  assert.equal(db.canAccessChannel(group.id, cy), false, 'people outside the group cannot see it');
  assert.equal(db.getChannelsForUser(cy).some((c) => c.id === group.id), false);
  assert.equal(db.getChannelsForUser(ben).some((c) => c.id === group.id), true);
});

test('only admins can change the group; admin-only mode is stored', async () => {
  const { db, ana, ben } = await setup();
  const group = db.createGroup('Rules', ana, [ben]);
  assert.equal(db.isGroupAdmin(group.id, ana), true);
  assert.equal(db.isGroupAdmin(group.id, ben), false);
  db.updateGroup(group.id, { name: 'Renamed', adminOnly: true });
  assert.equal(db.getChannel(group.id)!.name, 'Renamed');
  assert.equal(db.getChannel(group.id)!.adminOnly, true);
});

test('adding and removing members keeps the member list right', async () => {
  const { db, ana, ben, cy } = await setup();
  const group = db.createGroup('Crew', ana, [ben]);
  assert.deepEqual(db.addGroupMembers(group.id, [cy, cy, 'user-missing']), [cy], 'unknown users are ignored and duplicates merged');
  assert.equal(db.canAccessChannel(group.id, cy), true);
  db.removeGroupMember(group.id, cy);
  assert.equal(db.canAccessChannel(group.id, cy), false);
});

test('when the last admin leaves, the longest-standing member becomes admin', async () => {
  const { db, ana, ben } = await setup();
  const group = db.createGroup('Handover', ana, [ben]);
  db.removeGroupMember(group.id, ana);
  assert.deepEqual(db.getChannel(group.id)!.admins, [ben]);
});

test('invite codes join people, and can be reset so the old one stops working', async () => {
  const { db, ana } = await setup();
  const group = db.createGroup('Link', ana, []);
  const code = group.inviteCode!;
  assert.equal(db.findGroupByInvite(code)?.id, group.id);
  const next = db.regenerateGroupInvite(group.id)!;
  assert.notEqual(next, code);
  assert.equal(db.findGroupByInvite(code), undefined);
  assert.equal(db.findGroupByInvite(next)?.id, group.id);
});

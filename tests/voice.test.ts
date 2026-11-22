import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VoiceRooms, iceServers } from '../backend/voice';

const peer = (socketId: string, userId = socketId) => ({ socketId, userId, username: userId, avatarEmoji: '🙂' });

test('people who join a room see each other, and not themselves', () => {
  const rooms = new VoiceRooms();
  rooms.join('voice-1', peer('s1'));
  rooms.join('voice-1', peer('s2'));
  assert.deepEqual(rooms.peers('voice-1', 's1').map((p) => p.socketId), ['s2']);
  assert.deepEqual(rooms.peers('voice-1', 's2').map((p) => p.socketId), ['s1']);
  assert.equal(rooms.sameRoom('s1', 's2'), true);
});

test('leaving removes the peer and empties the room', () => {
  const rooms = new VoiceRooms();
  rooms.join('voice-1', peer('s1'));
  assert.equal(rooms.leave('s1'), 'voice-1');
  assert.deepEqual(rooms.peers('voice-1'), []);
  assert.equal(rooms.leave('s1'), undefined, 'leaving twice is harmless');
});

test('joining another room moves the peer out of the first', () => {
  const rooms = new VoiceRooms();
  rooms.join('voice-1', peer('s1'));
  rooms.join('voice-2', peer('s2'));
  const left = rooms.join('voice-2', peer('s1'));
  assert.equal(left, 'voice-1');
  assert.deepEqual(rooms.peers('voice-1'), []);
  assert.equal(rooms.roomOf('s1'), 'voice-2');
});

test('signalling is only allowed between sockets in the same room', () => {
  const rooms = new VoiceRooms();
  rooms.join('voice-1', peer('s1'));
  rooms.join('voice-1', peer('s2'));
  rooms.join('voice-2', peer('s3'));
  assert.equal(rooms.sameRoom('s1', 's2'), true);
  assert.equal(rooms.sameRoom('s1', 's3'), false);
  assert.equal(rooms.sameRoom('s1', 'unknown'), false);
});

test('the default ICE server is a STUN server', () => {
  const saved = process.env.VOICE_ICE_SERVERS;
  delete process.env.VOICE_ICE_SERVERS;
  assert.deepEqual(iceServers(), [{ urls: 'stun:stun.l.google.com:19302' }]);
  if (saved !== undefined) process.env.VOICE_ICE_SERVERS = saved;
});

test('a custom ICE list is used when it is valid JSON, and ignored when it is not', () => {
  const saved = process.env.VOICE_ICE_SERVERS;
  process.env.VOICE_ICE_SERVERS = JSON.stringify([{ urls: 'turn:turn.example.org:3478', username: 'u', credential: 'c' }]);
  assert.equal(iceServers()[0].urls, 'turn:turn.example.org:3478');
  process.env.VOICE_ICE_SERVERS = 'not json';
  assert.deepEqual(iceServers(), [{ urls: 'stun:stun.l.google.com:19302' }]);
  if (saved === undefined) delete process.env.VOICE_ICE_SERVERS;
  else process.env.VOICE_ICE_SERVERS = saved;
});

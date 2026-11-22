import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Video, VideoOff, Volume2 } from 'lucide-react';
import { socket } from '../socket';
import { api } from '../lib/api';
import { DevChannel } from '../types';
import { Avatar, Button, cx } from './ui';

interface Person {
  username: string;
  avatarEmoji: string;
}

interface RemoteTile extends Person {
  socketId: string;
  stream?: MediaStream;
}

const DEFAULT_ICE: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

/**
 * A voice or video room. Browsers connect to each other directly (a mesh), so calls work
 * best with a handful of people. The server only passes the connection setup messages.
 */
export default function VoiceRoom({ channel }: { channel: DevChannel }) {
  const [joined, setJoined] = useState(false);
  const [tiles, setTiles] = useState<Record<string, RemoteTile>>({});
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const localVideo = useRef<HTMLVideoElement>(null);
  const localStream = useRef<MediaStream | null>(null);
  const connections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const people = useRef<Map<string, Person>>(new Map());
  const iceServers = useRef<RTCIceServer[]>(DEFAULT_ICE);

  const removePeer = (socketId: string) => {
    connections.current.get(socketId)?.close();
    connections.current.delete(socketId);
    people.current.delete(socketId);
    setTiles((prev) => {
      const next = { ...prev };
      delete next[socketId];
      return next;
    });
  };

  const connectionTo = (socketId: string): RTCPeerConnection => {
    const existing = connections.current.get(socketId);
    if (existing) return existing;
    const pc = new RTCPeerConnection({ iceServers: iceServers.current });
    connections.current.set(socketId, pc);
    localStream.current?.getTracks().forEach((track) => pc.addTrack(track, localStream.current!));

    const remote = new MediaStream();
    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => remote.addTrack(track));
      const person = people.current.get(socketId) ?? { username: 'guest', avatarEmoji: '🙂' };
      setTiles((prev) => ({ ...prev, [socketId]: { socketId, ...person, stream: remote } }));
    };
    pc.onicecandidate = (event) => {
      if (event.candidate) socket.emit('voice:signal', { to: socketId, data: { candidate: event.candidate } });
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') removePeer(socketId);
    };
    return pc;
  };

  const offerTo = async (socketId: string) => {
    const pc = connectionTo(socketId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('voice:signal', { to: socketId, data: { sdp: pc.localDescription } });
  };

  // Listen for room changes and signalling while this room is on screen.
  useEffect(() => {
    const onRoster = ({ peers }: { peers: (Person & { socketId: string })[] }) => {
      for (const p of peers) {
        people.current.set(p.socketId, { username: p.username, avatarEmoji: p.avatarEmoji });
        offerTo(p.socketId).catch(() => undefined);
      }
    };
    const onJoined = (p: Person & { socketId: string }) => {
      people.current.set(p.socketId, { username: p.username, avatarEmoji: p.avatarEmoji });
    };
    const onLeft = ({ socketId }: { socketId: string }) => removePeer(socketId);
    const onSignal = async ({ from, data }: { from: string; data: any }) => {
      try {
        if (data.sdp) {
          const pc = connectionTo(from);
          await pc.setRemoteDescription(data.sdp);
          if (data.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('voice:signal', { to: from, data: { sdp: pc.localDescription } });
          }
        } else if (data.candidate) {
          await connections.current.get(from)?.addIceCandidate(data.candidate).catch(() => undefined);
        }
      } catch {
        removePeer(from);
      }
    };

    socket.on('voice:roster', onRoster);
    socket.on('voice:peer-joined', onJoined);
    socket.on('voice:peer-left', onLeft);
    socket.on('voice:signal', onSignal);
    return () => {
      socket.off('voice:roster', onRoster);
      socket.off('voice:peer-joined', onJoined);
      socket.off('voice:peer-left', onLeft);
      socket.off('voice:signal', onSignal);
      leave();
    };
    // The handlers only read refs, so they are safe to register once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the local preview attached to the stream.
  useEffect(() => {
    if (localVideo.current && localStream.current) localVideo.current.srcObject = localStream.current;
  }, [joined]);

  const join = async () => {
    setError('');
    setBusy(true);
    try {
      try {
        localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      } catch {
        // No camera, or camera refused: join with audio only.
        localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setCameraOff(true);
      }
    } catch {
      setBusy(false);
      setError('Microphone access is needed to join this voice channel.');
      return;
    }
    const config = await api<{ iceServers: RTCIceServer[] }>('/api/voice/config').catch(() => null);
    if (config?.iceServers?.length) iceServers.current = config.iceServers;
    socket.emit('voice:join', { channelId: channel.id });
    setJoined(true);
    setBusy(false);
  };

  function leave() {
    socket.emit('voice:leave');
    connections.current.forEach((pc) => pc.close());
    connections.current.clear();
    people.current.clear();
    localStream.current?.getTracks().forEach((track) => track.stop());
    localStream.current = null;
    setTiles({});
    setMuted(false);
    setCameraOff(false);
    setJoined(false);
  }

  const toggleMute = () => {
    const next = !muted;
    localStream.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
  };

  const toggleCamera = () => {
    const next = !cameraOff;
    localStream.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
    setCameraOff(next);
  };

  const remoteList = Object.values(tiles);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-canvas">
      <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-line px-5">
        <div className="min-w-0">
          <p className="truncate font-display text-[16px] font-bold">{channel.name}</p>
          <p className="font-mono text-[11px] text-ink-3">voice · {joined ? `${remoteList.length + 1} in the room` : 'not joined'}</p>
        </div>
        <div className="flex items-center gap-2">
          {joined ? (
            <>
              <button
                type="button"
                onClick={toggleMute}
                aria-pressed={muted}
                aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
                className={cx('flex h-9 w-9 items-center justify-center rounded-full border border-line', muted && 'bg-err/15 text-err')}
              >
                {muted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <button
                type="button"
                onClick={toggleCamera}
                aria-pressed={cameraOff}
                aria-label={cameraOff ? 'Turn camera on' : 'Turn camera off'}
                className={cx('flex h-9 w-9 items-center justify-center rounded-full border border-line', cameraOff && 'bg-subtle')}
              >
                {cameraOff ? <VideoOff size={16} /> : <Video size={16} />}
              </button>
              <Button variant="danger" size="sm" onClick={leave}>
                <PhoneOff size={14} /> Leave
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={join} loading={busy}>
              <Volume2 size={14} /> Join voice
            </Button>
          )}
        </div>
      </header>

      {error && <p className="px-5 pt-3 text-[13px] text-err">{error}</p>}

      <div className="grid flex-1 content-start gap-3 overflow-y-auto p-5 sm:grid-cols-2 xl:grid-cols-3">
        {!joined && (
          <p className="col-span-full py-16 text-center text-[13.5px] text-ink-3">
            Join to talk with everyone in this channel. Your browser will ask for microphone and camera access.
          </p>
        )}
        {joined && (
          <Tile name="you" emoji="🙂" muted>
            <video ref={localVideo} autoPlay playsInline muted className={cx('h-full w-full object-cover', cameraOff && 'hidden')} />
            {cameraOff && <Avatar emoji="🙂" size={64} className="m-auto" />}
          </Tile>
        )}
        {remoteList.map((p) => (
          <Tile key={p.socketId} name={p.username} emoji={p.avatarEmoji}>
            <RemoteMedia stream={p.stream} />
          </Tile>
        ))}
      </div>
    </div>
  );
}

function Tile({ name, emoji, muted, children }: { name: string; emoji: string; muted?: boolean; children: React.ReactNode }) {
  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-line bg-surface">
      {children}
      <span className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-md bg-canvas/80 px-2 py-1 font-mono text-[11px]">
        <span aria-hidden="true">{emoji}</span> {name} {muted && <MicOff size={11} />}
      </span>
    </div>
  );
}

/** A remote stream. Video and audio share one element so both play. */
function RemoteMedia({ stream }: { stream?: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && stream && ref.current.srcObject !== stream) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline className="h-full w-full object-cover" />;
}


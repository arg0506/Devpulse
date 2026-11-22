import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Hash,
  Plus,
  Users,
  Pin,
  MessageSquare,
  SmilePlus,
  Trash2,
  X,
  Code2,
  SendHorizontal,
  Menu,
  Search,
  Sparkles,
  CalendarDays,
  PenSquare,
  Paperclip,
  Smile,
  Pencil,
  CornerUpLeft,
  UserPlus,
} from 'lucide-react';
import { SocialModal, useSocial } from './SocialModal';
import VoiceRoom from './VoiceRoom';
import { api } from '../lib/api';
import { hasPermission } from '../lib/permissions';
import { DevCommunity } from '../types';
import { socket } from '../socket';
import { useWorkspace, channelLabel } from '../lib/workspace';
import { DevChannel, DevMessage, ThreadReply } from '../types';
import { Markdown, CodeBlock } from '../lib/markdown';
import { dayLabel, timeShort } from '../lib/format';
import { Avatar, Button, EmptyState, IconButton, Modal, ViewHeader, cx } from './ui';

const QUICK_REACTIONS = ['👍', '❤️', '🎉', '🚀', '👀', '😂'];
const LANGUAGES = ['typescript', 'javascript', 'python', 'rust', 'go', 'sql', 'html', 'css', 'bash', 'json'];

// ---------- Sidebar ----------

function Sidebar({
  onNewChannel,
  onNewDM,
  onNavigate,
  onSocial,
}: {
  onNewChannel: () => void;
  onNewDM: () => void;
  onNavigate: () => void;
  onSocial: () => void;
}) {
  const { channels, activeChannelId, openChannel, unread, user, presenceOf } = useWorkspace();
  const rooms = channels.filter((c) => c.category === 'Channels' || c.category === 'Guilds');
  const dms = channels.filter((c) => c.category === 'Direct Messages');

  const item = (c: DevChannel, icon: React.ReactNode, label: string) => {
    const count = unread[c.id] || 0;
    const active = c.id === activeChannelId;
    return (
      <li key={c.id}>
        <button
          type="button"
          onClick={() => {
            openChannel(c.id);
            onNavigate();
          }}
          className={cx(
            'group flex h-8 w-full items-center gap-2 rounded-md px-2 text-left text-[13px] transition-colors',
            active ? 'brand-gradient font-semibold text-[#0a0b0d]' : count ? 'font-medium text-ink hover:bg-subtle' : 'text-ink-2 hover:bg-subtle hover:text-ink',
          )}
        >
          {icon}
          <span className="min-w-0 flex-1 truncate">{label}</span>
          {count > 0 && !active && (
            <span className="rounded-full bg-accent px-1.5 text-[10px] leading-4 font-semibold text-white">{count > 99 ? '99+' : count}</span>
          )}
        </button>
      </li>
    );
  };

  return (
    <div className="m-2 mr-0 flex h-[calc(100%-1rem)] w-[248px] flex-col overflow-hidden rounded-2xl border border-line bg-surface">
      <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-line px-4">
        <span className="font-display text-[19px] font-extrabold tracking-[-0.03em]">Chat</span>
        <div className="flex items-center">
          <IconButton label="Friends and moderation" onClick={onSocial}>
            <UserPlus size={15} />
          </IconButton>
          <IconButton label="New direct message" onClick={onNewDM}>
          <PenSquare size={15} />
          </IconButton>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-3">
        <div className="mb-1 flex items-center justify-between px-2">
          <span className="eyebrow">Channels</span>
          <IconButton label="New channel" onClick={onNewChannel} className="h-6 w-6">
            <Plus size={14} />
          </IconButton>
        </div>
        <ul className="space-y-px">
          {rooms.map((c) =>
            item(
              c,
              c.id === 'ai-lounge' ? (
                <Sparkles size={14} className="flex-shrink-0 text-ink-3" />
              ) : (
                <Hash size={14} className="flex-shrink-0 text-ink-3" />
              ),
              c.name,
            ),
          )}
        </ul>

        <div className="mt-5 mb-1 flex items-center justify-between px-2">
          <span className="eyebrow">Direct messages</span>
          <IconButton label="New direct message" onClick={onNewDM} className="h-6 w-6">
            <Plus size={14} />
          </IconButton>
        </div>
        {dms.length === 0 ? (
          <button
            type="button"
            onClick={onNewDM}
            className="w-full rounded-md px-2 py-1.5 text-left text-[12.5px] text-ink-3 hover:bg-subtle hover:text-ink"
          >
            Start a conversation
          </button>
        ) : (
          <ul className="space-y-px">
            {dms.map((c) => {
              const otherId = (c.members || []).find((m) => m !== user.id) || user.id;
              const p = presenceOf(otherId);
              return item(c, <Avatar emoji={p?.avatarEmoji || '👤'} size={18} status={p?.status} />, channelLabel(c, user.id, presenceOf));
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ---------- Message ----------

function Reactions({ msg, onToggle }: { msg: DevMessage; onToggle: (emoji: string) => void }) {
  const { user } = useWorkspace();
  if (!msg.reactions?.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {msg.reactions.map((r) => {
        const mine = r.userIds.includes(user.id);
        return (
          <button
            key={r.emoji}
            type="button"
            onClick={() => onToggle(r.emoji)}
            className={cx(
              'inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[12px] transition-colors',
              mine ? 'border-ink/40 bg-subtle text-ink' : 'border-line text-ink-2 hover:border-line-strong',
            )}
          >
            <span>{r.emoji}</span>
            <span className="font-mono text-[11px]">{r.userIds.length}</span>
          </button>
        );
      })}
    </div>
  );
}

interface Preview {
  url: string;
  title?: string;
  description?: string;
  siteName?: string;
  image?: string;
}

// Previews are shared across rows, so each link is requested once per session.
const previewCache = new Map<string, Promise<Preview | null>>();

function firstLink(text: string): string | undefined {
  return /https?:\/\/[^\s<>"'`)]+/.exec(text)?.[0];
}

/** A small card for the first web link in a message. Quietly shows nothing when no preview exists. */
function LinkPreviewCard({ url }: { url: string }) {
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    let alive = true;
    let pending = previewCache.get(url);
    if (!pending) {
      pending = api<Preview>('/api/links/preview', { body: { url } }).catch(() => null);
      previewCache.set(url, pending);
    }
    pending.then((p) => alive && setPreview(p));
    return () => {
      alive = false;
    };
  }, [url]);

  if (!preview || !(preview.title || preview.description)) return null;
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noreferrer noopener"
      className="mt-2 flex max-w-md overflow-hidden rounded-xl border border-line bg-subtle transition-colors hover:border-line-strong"
    >
      {preview.image && <img src={preview.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-20 w-24 flex-shrink-0 object-cover" />}
      <span className="min-w-0 flex-1 p-3">
        {preview.siteName && <span className="block font-mono text-[10.5px] text-ink-3">{preview.siteName}</span>}
        {preview.title && <span className="block truncate text-[13px] font-semibold">{preview.title}</span>}
        {preview.description && <span className="line-clamp-2 block text-[12px] text-ink-2">{preview.description}</span>}
      </span>
    </a>
  );
}

function MessageRow({
  msg,
  compact,
  onThread,
  onReply,
  canModerate,
}: {
  msg: DevMessage;
  compact: boolean;
  onThread: (m: DevMessage) => void;
  onReply?: (m: DevMessage) => void;
  canModerate?: boolean;
}) {
  const { user, showProfile } = useWorkspace();
  const [picker, setPicker] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(msg.text);
  const mine = msg.userId === user.id;
  const mentionsMe = !!msg.mentions?.includes(user.username);
  const react = (emoji: string) => {
    socket.emit('message:react', { messageId: msg.id, emoji });
    setPicker(false);
  };
  const saveEdit = () => {
    const next = draft.trim();
    if (next && next !== msg.text) socket.emit('message:edit', { messageId: msg.id, text: next });
    setEditing(false);
  };

  return (
    <div
      className={cx(
        'group relative flex gap-3 px-5 hover:bg-subtle/60',
        compact ? 'py-0.5' : 'pt-3 pb-0.5',
        mentionsMe && 'bg-[#ffd23f]/10 hover:bg-[#ffd23f]/15',
      )}
    >
      <div className="w-8 flex-shrink-0">
        {!compact ? (
          <button type="button" onClick={() => showProfile(msg.userId)} aria-label={`View @${msg.username}`}>
            <Avatar emoji={msg.avatarEmoji} size={32} />
          </button>
        ) : (
          <span className="block pt-1 text-right font-mono text-[10px] text-ink-3 opacity-0 group-hover:opacity-100">{timeShort(msg.timestamp)}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {!compact && (
          <div className="flex items-baseline gap-2">
            <button type="button" onClick={() => showProfile(msg.userId)} className="truncate text-[13.5px] font-semibold text-ink hover:underline">
              {msg.username}
            </button>
            <span className="hidden truncate text-[12px] text-ink-3 sm:inline">{msg.role}</span>
            <span className="font-mono text-[11px] text-ink-3">{timeShort(msg.timestamp)}</span>
            {msg.isPinned && (
              <span className="inline-flex items-center gap-0.5 text-[11px] text-accent">
                <Pin size={10} /> pinned
              </span>
            )}
          </div>
        )}
        {msg.replyTo && (
          <div className="mb-1 flex min-w-0 items-center gap-1.5 border-l-2 border-line-strong pl-2 text-[12px] text-ink-3">
            <CornerUpLeft size={12} className="flex-shrink-0" />
            <span className="font-semibold text-ink-2">@{msg.replyTo.username}</span>
            <span className="truncate">{msg.replyTo.text}</span>
          </div>
        )}
        {editing ? (
          <div className="mt-1">
            <textarea
              autoFocus
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveEdit();
                }
                if (e.key === 'Escape') setEditing(false);
              }}
              className="w-full resize-none rounded-lg border border-line bg-canvas px-3 py-2 text-[14px] focus:border-line-strong focus:outline-none"
            />
            <p className="mt-1 text-[11.5px] text-ink-3">
              Enter to save · Escape to cancel
            </p>
          </div>
        ) : (
          msg.text && (
            <>
              <Markdown text={msg.text} />
              {firstLink(msg.text) && <LinkPreviewCard url={firstLink(msg.text)!} />}
              {msg.editedAt && <span className="ml-1 text-[11px] text-ink-3">(edited)</span>}
            </>
          )
        )}
        {msg.attachment &&
          (msg.attachment.type.startsWith('image/') ? (
            <img src={msg.attachment.url} alt={msg.attachment.name} className="mt-2 max-h-72 rounded-xl border border-line object-contain" />
          ) : (
            <a
              href={msg.attachment.url}
              download={msg.attachment.name}
              className="mt-2 inline-flex items-center gap-2 rounded-xl border border-line bg-subtle px-3 py-2 text-[13px] font-medium hover:border-line-strong"
            >
              <Paperclip size={14} /> {msg.attachment.name}
            </a>
          ))}
        {msg.gif && (
          <img
            src={msg.gif.url}
            alt={msg.gif.title || 'GIF'}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="mt-2 max-h-64 rounded-xl border border-line object-contain"
          />
        )}
        {msg.codeSnippet && <CodeBlock code={msg.codeSnippet.code} language={msg.codeSnippet.language} title={msg.codeSnippet.title} />}
        <Reactions msg={msg} onToggle={react} />
        {msg.repliesCount > 0 && (
          <button
            type="button"
            onClick={() => onThread(msg)}
            className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-ink hover:underline"
          >
            <MessageSquare size={12} /> {msg.repliesCount} {msg.repliesCount === 1 ? 'reply' : 'replies'}
          </button>
        )}
      </div>

      <div
        className={cx(
          'absolute -top-3 right-4 flex items-center rounded-lg border border-line bg-surface p-0.5 shadow-pop',
          picker ? 'flex' : 'hidden group-focus-within:flex group-hover:flex',
        )}
      >
        {picker ? (
          <>
            {QUICK_REACTIONS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => react(e)}
                className="h-7 w-7 rounded-md text-[15px] hover:bg-subtle"
                aria-label={`React ${e}`}
              >
                {e}
              </button>
            ))}
            <IconButton label="Close reactions" className="h-7 w-7" onClick={() => setPicker(false)}>
              <X size={13} />
            </IconButton>
          </>
        ) : (
          <>
            <IconButton label="Add reaction" className="h-7 w-7" onClick={() => setPicker(true)}>
              <SmilePlus size={14} />
            </IconButton>
            {onReply && (
              <IconButton label="Reply" className="h-7 w-7" onClick={() => onReply(msg)}>
                <CornerUpLeft size={14} />
              </IconButton>
            )}
            <IconButton label="Reply in thread" className="h-7 w-7" onClick={() => onThread(msg)}>
              <MessageSquare size={14} />
            </IconButton>
            <IconButton label={msg.isPinned ? 'Unpin' : 'Pin'} className="h-7 w-7" onClick={() => socket.emit('message:pin', { messageId: msg.id })}>
              <Pin size={14} />
            </IconButton>
            {mine && msg.text && (
              <IconButton
                label="Edit message"
                className="h-7 w-7"
                onClick={() => {
                  setDraft(msg.text);
                  setEditing(true);
                }}
              >
                <Pencil size={14} />
              </IconButton>
            )}
            {mine && (
              <IconButton
                label="Delete message"
                className="h-7 w-7 hover:text-err"
                onClick={() => confirm('Delete this message?') && socket.emit('message:delete', { messageId: msg.id })}
              >
                <Trash2 size={14} />
              </IconButton>
            )}
            {canModerate && !mine && (
              <IconButton
                label="Delete message as moderator"
                className="h-7 w-7 text-err hover:text-err"
                onClick={() => confirm(`Delete @${msg.username}'s message as a moderator?`) && socket.emit('mod:delete', { messageId: msg.id })}
              >
                <Trash2 size={14} />
              </IconButton>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Composer ----------

type Attachment = { name: string; type: string; dataUrl: string };
type SendExtra = { attachment?: Attachment; replyToId?: string; gif?: { url: string; title?: string } };
type GifHit = { id: string; title: string; preview: string; url: string };

// Whether the server has GIF search configured. Checked once per session.
let gifStatus: Promise<boolean> | null = null;
function gifsAvailable(): Promise<boolean> {
  if (!gifStatus) gifStatus = api<{ enabled: boolean }>('/api/gifs/status').then((r) => r.enabled).catch(() => false);
  return gifStatus;
}

const EMOJI_PALETTE = ['😀', '😂', '🥹', '😎', '🤔', '🙌', '👏', '🔥', '🚀', '🎉', '💯', '✅', '❌', '⚡', '🐛', '🛠️', '💡', '👀', '❤️', '🙏', '👍', '👎', '😅', '🤝'];
const MAX_ATTACHMENT_BYTES = 500_000;

function Composer({
  placeholder,
  onSend,
  onSnippet,
  onTyping,
  autoFocusKey,
  replyTo,
  onCancelReply,
}: {
  placeholder: string;
  onSend: (text: string, extra?: SendExtra) => void;
  onSnippet?: () => void;
  onTyping?: () => void;
  autoFocusKey?: string;
  replyTo?: DevMessage | null;
  onCancelReply?: () => void;
}) {
  const [text, setText] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [attachError, setAttachError] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [gif, setGif] = useState<{ url: string; title?: string } | null>(null);
  const [gifOpen, setGifOpen] = useState(false);
  const [gifEnabled, setGifEnabled] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifHits, setGifHits] = useState<GifHit[]>([]);
  const [gifError, setGifError] = useState('');

  useEffect(() => {
    gifsAvailable().then(setGifEnabled);
  }, []);

  const searchGifs = async (query: string) => {
    setGifError('');
    try {
      setGifHits(await api<GifHit[]>(`/api/gifs/search?q=${encodeURIComponent(query)}`));
    } catch (err: any) {
      setGifError(err.message);
    }
  };
  const fileRef = useRef<HTMLInputElement>(null);
  const ref = useRef<HTMLTextAreaElement>(null);

  const pickFile = (file: File | undefined) => {
    setAttachError('');
    if (!file) return;
    if (/^(text\/html|application\/xhtml|image\/svg\+xml|application\/xml|text\/xml)$/i.test(file.type)) {
      return setAttachError('That file type cannot be shared.');
    }
    if (file.size > MAX_ATTACHMENT_BYTES) return setAttachError('Files must be 500 KB or smaller.');
    const reader = new FileReader();
    reader.onload = () => setAttachment({ name: file.name, type: file.type, dataUrl: String(reader.result) });
    reader.readAsDataURL(file);
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [text]);

  useEffect(() => {
    ref.current?.focus();
  }, [autoFocusKey]);

  const submit = () => {
    const t = text.trim();
    if (!t && !attachment && !gif) return;
    onSend(t, { attachment: attachment ?? undefined, replyToId: replyTo?.id, gif: gif ?? undefined });
    setText('');
    setAttachment(null);
    setGif(null);
    setGifOpen(false);
    setAttachError('');
    onCancelReply?.();
  };

  return (
    <div className="rounded-xl border border-line bg-surface transition-colors focus-within:border-line-strong">
      {replyTo && (
        <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-2 text-[12px] text-ink-3">
          <span className="flex min-w-0 items-center gap-1.5">
            <CornerUpLeft size={12} className="flex-shrink-0" />
            Replying to <span className="font-semibold text-ink-2">@{replyTo.username}</span>
            <span className="truncate">{replyTo.text}</span>
          </span>
          <IconButton label="Cancel reply" className="h-6 w-6" onClick={() => onCancelReply?.()}>
            <X size={13} />
          </IconButton>
        </div>
      )}
      {attachment && (
        <div className="flex items-center gap-3 px-3.5 pt-3">
          {attachment.type.startsWith('image/') ? (
            <img src={attachment.dataUrl} alt={attachment.name} className="h-16 w-16 rounded-lg border border-line object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-lg border border-line bg-subtle">
              <Paperclip size={18} />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-[12px] text-ink-3">{attachment.name}</span>
          <IconButton label="Remove image" className="h-6 w-6" onClick={() => setAttachment(null)}>
            <X size={13} />
          </IconButton>
        </div>
      )}
      {attachError && <p className="px-3.5 pt-2 text-[12px] text-err">{attachError}</p>}
      {gif && (
        <div className="flex items-center gap-3 px-3.5 pt-3">
          <img src={gif.url} alt={gif.title || 'GIF'} className="h-16 rounded-lg border border-line object-cover" />
          <span className="min-w-0 flex-1 truncate text-[12px] text-ink-3">{gif.title || 'GIF'}</span>
          <IconButton label="Remove GIF" className="h-6 w-6" onClick={() => setGif(null)}>
            <X size={13} />
          </IconButton>
        </div>
      )}
      {gifOpen && (
        <div className="space-y-2 border-b border-line p-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              searchGifs(gifQuery.trim());
            }}
            className="flex gap-2"
          >
            <input className="field flex-1" placeholder="Search GIFs" value={gifQuery} onChange={(e) => setGifQuery(e.target.value)} aria-label="Search GIFs" />
            <Button type="submit" disabled={!gifQuery.trim()}>
              Search
            </Button>
          </form>
          {gifError && <p className="text-[12px] text-err">{gifError}</p>}
          <div className="grid max-h-56 grid-cols-3 gap-1.5 overflow-y-auto sm:grid-cols-4">
            {gifHits.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setGif({ url: g.url, title: g.title });
                  setGifOpen(false);
                }}
                className="overflow-hidden rounded-lg border border-line hover:border-line-strong"
                aria-label={g.title || 'Choose GIF'}
              >
                <img src={g.preview} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-20 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
      {emojiOpen && (
        <div className="grid grid-cols-8 gap-0.5 border-b border-line px-2 py-2 sm:grid-cols-12">
          {EMOJI_PALETTE.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setText((t) => t + e)}
              className="h-8 w-8 rounded-md text-[17px] hover:bg-subtle"
              aria-label={`Insert ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
      <textarea
        ref={ref}
        rows={1}
        value={text}
        placeholder={placeholder}
        onChange={(e) => {
          setText(e.target.value);
          onTyping?.();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        className="block max-h-[200px] w-full resize-none bg-transparent px-3.5 pt-3 pb-1 text-[14px] text-ink placeholder:text-ink-3 focus:outline-none"
        aria-label={placeholder}
      />
      <div className="flex items-center justify-between px-2 pb-2">
        <div className="flex items-center gap-0.5">
          {onSnippet && (
            <IconButton label="Share a code snippet" onClick={onSnippet}>
              <Code2 size={15} />
            </IconButton>
          )}
          <IconButton label="Attach a file" onClick={() => fileRef.current?.click()}>
            <Paperclip size={15} />
          </IconButton>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <IconButton label="Emoji" onClick={() => setEmojiOpen((o) => !o)}>
            <Smile size={15} />
          </IconButton>
          {gifEnabled && (
            <IconButton label="Add a GIF" onClick={() => setGifOpen((o) => !o)}>
              <span className="font-mono text-[10px] font-bold">GIF</span>
            </IconButton>
          )}
          <span className="ml-1 hidden text-[11.5px] text-ink-3 sm:inline">
            <span className="font-mono">**bold**</span> · <span className="font-mono">`code`</span> · <span className="font-mono">```</span> blocks ·
            Shift + Enter for a new line
          </span>
        </div>
        <IconButton
          label="Send"
          onClick={submit}
          disabled={!text.trim() && !attachment && !gif}
          className={cx((text.trim() || attachment || gif) && 'bg-ink text-inverse hover:bg-ink hover:text-inverse')}
        >
          <SendHorizontal size={15} />
        </IconButton>
      </div>
    </div>
  );
}

// ---------- Thread panel ----------

function ThreadPanel({ parent, onClose }: { parent: DevMessage; onClose: () => void }) {
  const [replies, setReplies] = useState<ThreadReply[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReplies([]);
    const onList = ({ messageId, replies: list }: { messageId: string; replies: ThreadReply[] }) => messageId === parent.id && setReplies(list);
    const onNew = (r: ThreadReply) => r.messageId === parent.id && setReplies((prev) => (prev.some((x) => x.id === r.id) ? prev : [...prev, r]));
    socket.on('thread:replies-list', onList);
    socket.on('thread:reply-new', onNew);
    socket.emit('thread:get-replies', parent.id);
    return () => {
      socket.off('thread:replies-list', onList);
      socket.off('thread:reply-new', onNew);
    };
  }, [parent.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [replies.length]);

  return (
    <aside className="flex h-full w-full flex-col border-l border-line bg-surface lg:w-[340px]">
      <ViewHeader
        title="Thread"
        subtitle={`${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
        actions={
          <IconButton label="Close thread" onClick={onClose}>
            <X size={16} />
          </IconButton>
        }
      />
      <div className="flex-1 overflow-y-auto py-2">
        <MessageRow msg={parent} compact={false} onThread={() => undefined} />
        <div className="mx-5 my-3 border-t border-line" />
        {replies.map((r) => (
          <div key={r.id} className="flex gap-3 px-5 py-2">
            <Avatar emoji={r.avatarEmoji} size={28} />
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-[13px] font-semibold">{r.username}</span>
                <span className="font-mono text-[11px] text-ink-3">{timeShort(r.timestamp)}</span>
              </div>
              <Markdown text={r.text} />
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div className="p-3">
        <Composer
          placeholder="Reply in thread"
          autoFocusKey={parent.id}
          onSend={(text) => socket.emit('thread:send-reply', { messageId: parent.id, text })}
        />
      </div>
    </aside>
  );
}

// ---------- Members panel ----------

function MembersPanel({ channel, onClose }: { channel?: DevChannel; onClose: () => void }) {
  const { presences, showProfile, user } = useWorkspace();
  const visible = channel?.category === 'Direct Messages' ? presences.filter((p) => (channel.members || []).includes(p.userId)) : presences;
  const online = visible.filter((p) => p.status !== 'offline');
  const offline = visible.filter((p) => p.status === 'offline');
  const row = (p: (typeof presences)[number]) => (
    <li key={p.userId}>
      <button
        type="button"
        onClick={() => showProfile(p.userId)}
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-subtle"
      >
        <Avatar emoji={p.avatarEmoji} size={28} status={p.status} />
        <div className="min-w-0">
          <p className={cx('truncate text-[13px]', p.status === 'offline' ? 'text-ink-3' : 'text-ink')}>
            {p.username} {p.userId === user.id && <span className="text-ink-3">(you)</span>}
          </p>
          <p className="truncate text-[11.5px] text-ink-3">{p.customStatus || p.role}</p>
        </div>
      </button>
    </li>
  );
  return (
    <aside className="flex h-full w-full flex-col border-l border-line bg-surface lg:w-[280px]">
      <ViewHeader
        title="People"
        subtitle={`${online.length} online`}
        actions={
          <IconButton label="Close people" onClick={onClose}>
            <X size={16} />
          </IconButton>
        }
      />
      <div className="flex-1 overflow-y-auto p-2">
        <p className="eyebrow px-2 pt-2 pb-1">Online</p>
        <ul>{online.map(row)}</ul>
        {offline.length > 0 && (
          <>
            <p className="eyebrow px-2 pt-4 pb-1">Offline</p>
            <ul>{offline.map(row)}</ul>
          </>
        )}
      </div>
    </aside>
  );
}

// ---------- Main ----------

export default function ChatWorkspace() {
  const { channels, activeChannelId, user, presenceOf, presences, openDM, openChannel, view, connected, setView } = useWorkspace();
  const [messages, setMessages] = useState<DevMessage[]>([]);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [typing, setTyping] = useState<Record<string, string>>({});
  const [panel, setPanel] = useState<'none' | 'members' | 'thread'>('none');
  const [threadMsg, setThreadMsg] = useState<DevMessage | null>(null);
  const [filter, setFilter] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);

  const [snippetOpen, setSnippetOpen] = useState(false);
  const [snippet, setSnippet] = useState({ title: '', language: 'typescript', code: '' });
  const [channelModal, setChannelModal] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', description: '', error: '' });
  const [dmModal, setDmModal] = useState(false);
  const [dmQuery, setDmQuery] = useState('');
  const [replyTo, setReplyTo] = useState<DevMessage | null>(null);
  const [mention, setMention] = useState<{ channelId: string; from: string; text: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const loadOlder = () => {
    const oldest = messages[0];
    if (!oldest || loadingOlder) return;
    setLoadingOlder(true);
    stickToBottom.current = false;
    socket.emit('messages:older', { channelId: activeChannelId, beforeId: oldest.id });
  };
  const [socialOpen, setSocialOpen] = useState(false);
  const social = useSocial();

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  const channel = channels.find((c) => c.id === activeChannelId);
  const label = channelLabel(channel, user.id, presenceOf) || activeChannelId;
  const isDM = channel?.category === 'Direct Messages';
  const isEvent = channel?.category === 'Events' || activeChannelId.startsWith('event-');

  // The community this channel belongs to, so its moderators can delete messages here.
  const [community, setCommunity] = useState<DevCommunity | undefined>();
  useEffect(() => {
    const id = channel?.communityId;
    if (!id) {
      setCommunity(undefined);
      return;
    }
    api<DevCommunity[]>('/api/communities')
      .then((list) => setCommunity(list.find((c) => c.id === id)))
      .catch(() => undefined);
    const upsert = (c: DevCommunity) => {
      if (c.id === id) setCommunity(c);
    };
    socket.on('community:update', upsert);
    return () => {
      socket.off('community:update', upsert);
    };
  }, [channel?.communityId]);

  // Join the active channel (and re-join after reconnects).
  useEffect(() => {
    const join = () => socket.emit('user:join-channel', { channelId: activeChannelId });
    setMessages([]);
    setLoadedFor(null);
    setHasMore(false);
    setLoadingOlder(false);
    setTyping({});
    setThreadMsg(null);
    setReplyTo(null);
    setPanel((p) => (p === 'thread' ? 'none' : p));
    setPinnedOnly(false);
    stickToBottom.current = true;
    if (socket.connected) join();
    socket.on('connect', join);
    return () => {
      socket.off('connect', join);
    };
  }, [activeChannelId]);

  useEffect(() => {
    const onInit = ({ channelId, messages: list, hasMore: more }: { channelId: string; messages: DevMessage[]; hasMore: boolean }) => {
      if (channelId !== activeChannelId) return;
      setMessages(list);
      setHasMore(more);
      setLoadedFor(channelId);
    };
    const onOlder = ({ channelId, messages: older, hasMore: more }: { channelId: string; messages: DevMessage[]; hasMore: boolean }) => {
      if (channelId !== activeChannelId) return;
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        return [...older.filter((m) => !known.has(m.id)), ...prev];
      });
      setHasMore(more);
      setLoadingOlder(false);
    };
    const onNew = (m: DevMessage) =>
      m.channelId === activeChannelId && setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    const onUpdate = (m: DevMessage) => {
      if (m.channelId !== activeChannelId) return;
      setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
      setThreadMsg((t) => (t && t.id === m.id ? m : t));
    };
    const onDeleted = ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((x) => x.id !== messageId));
      setThreadMsg((t) => (t && t.id === messageId ? null : t));
    };
    const onTypingStart = ({ userId, username, channelId }: { userId: string; username: string; channelId: string }) =>
      channelId === activeChannelId && userId !== user.id && setTyping((p) => ({ ...p, [userId]: username }));
    const onTypingStop = ({ userId }: { userId: string }) =>
      setTyping((p) => {
        const n = { ...p };
        delete n[userId];
        return n;
      });

    socket.on('init:messages', onInit);
    socket.on('messages:older', onOlder);
    socket.on('message:new', onNew);
    socket.on('message:update', onUpdate);
    socket.on('message:deleted', onDeleted);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    return () => {
      socket.off('init:messages', onInit);
      socket.off('messages:older', onOlder);
      socket.off('message:new', onNew);
      socket.off('message:update', onUpdate);
      socket.off('message:deleted', onDeleted);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
    };
  }, [activeChannelId, user.id]);

  // Mentions and moderation notices arrive on the personal room, whichever channel is open.
  useEffect(() => {
    const onMention = (m: { channelId: string; from: string; text: string }) => setMention(m);
    const onNotice = ({ text }: { text: string }) => setNotice(text);
    socket.on('notification:mention', onMention);
    socket.on('mod:notice', onNotice);
    return () => {
      socket.off('notification:mention', onMention);
      socket.off('mod:notice', onNotice);
    };
  }, []);

  // Keep the view pinned to the newest message unless the reader scrolled up.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, view]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const stopTyping = () => {
    if (isTyping.current) socket.emit('typing:stop', { channelId: activeChannelId });
    isTyping.current = false;
    if (typingTimer.current) clearTimeout(typingTimer.current);
  };
  const noteTyping = () => {
    if (!isTyping.current) {
      isTyping.current = true;
      socket.emit('typing:start', { channelId: activeChannelId });
    }
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(stopTyping, 2000);
  };

  const send = (text: string, extra?: SendExtra) => {
    stopTyping();
    stickToBottom.current = true;
    socket.emit('message:send', { channelId: activeChannelId, text, ...extra });
  };

  const sendSnippet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snippet.code.trim()) return;
    socket.emit('message:send', {
      channelId: activeChannelId,
      text: '',
      codeSnippet: { title: snippet.title.trim() || `snippet.${snippet.language}`, language: snippet.language, code: snippet.code },
    });
    setSnippet({ title: '', language: snippet.language, code: '' });
    setSnippetOpen(false);
  };

  const createChannel = (e: React.FormEvent) => {
    e.preventDefault();
    socket.emit('channel:create', { name: newChannel.name, description: newChannel.description }, (res: { channel?: DevChannel; error?: string }) => {
      if (res?.error) return setNewChannel((c) => ({ ...c, error: res.error! }));
      setChannelModal(false);
      setNewChannel({ name: '', description: '', error: '' });
      if (res?.channel) openChannel(res.channel.id);
    });
  };

  const openThread = (m: DevMessage) => {
    setThreadMsg(m);
    setPanel('thread');
  };

  const visible = useMemo(() => {
    let list = messages;
    if (social.blocked.length) list = list.filter((m) => !social.blocked.some((b) => b.id === m.userId));
    if (pinnedOnly) list = list.filter((m) => m.isPinned);
    if (filter.trim()) {
      const q = filter.toLowerCase();
      list = list.filter((m) => m.text.toLowerCase().includes(q) || m.username.includes(q) || m.codeSnippet?.code.toLowerCase().includes(q));
    }
    return list;
  }, [messages, pinnedOnly, filter, social.blocked]);

  const typingNames = Object.values(typing);
  const dmCandidates = presences.filter((p) => p.userId !== user.id && p.userId !== 'system-bot' && p.username.includes(dmQuery.toLowerCase()));

  const headerIcon = isDM ? (
    <Avatar emoji={presenceOf((channel?.members || []).find((m) => m !== user.id) || '')?.avatarEmoji || '👤'} size={22} />
  ) : isEvent ? (
    <CalendarDays size={16} className="text-ink-3" />
  ) : (
    <Hash size={16} className="text-ink-3" />
  );

  return (
    <div className="flex min-w-0 flex-1">
      {/* Sidebar: inline on desktop, overlay on small screens */}
      <div className="hidden md:block">
        <Sidebar onNewChannel={() => setChannelModal(true)} onNewDM={() => setDmModal(true)} onNavigate={() => undefined} onSocial={() => setSocialOpen(true)} />
      </div>
      {mobileSidebar && (
        <div className="fixed inset-0 z-50 flex md:hidden" onClick={() => setMobileSidebar(false)}>
          <div className="h-full shadow-pop" onClick={(e) => e.stopPropagation()}>
            <Sidebar
              onNewChannel={() => setChannelModal(true)}
              onNewDM={() => setDmModal(true)}
              onNavigate={() => setMobileSidebar(false)}
              onSocial={() => setSocialOpen(true)}
            />
          </div>
          <div className="flex-1 bg-ink/20" />
        </div>
      )}

      {channel?.kind === 'voice' ? (
        <VoiceRoom channel={channel} />
      ) : (
      <section className="flex min-w-0 flex-1 flex-col bg-surface">
        <ViewHeader
          leading={
            <>
              <IconButton label="Show channels" className="md:hidden" onClick={() => setMobileSidebar(true)}>
                <Menu size={16} />
              </IconButton>
              {headerIcon}
            </>
          }
          title={label}
          subtitle={isDM ? presenceOf((channel?.members || []).find((m) => m !== user.id) || '')?.role : channel?.description}
          actions={
            <>
              {isEvent && (
                <Button size="sm" variant="ghost" onClick={() => setView('events')}>
                  Event details
                </Button>
              )}
              <IconButton
                label="Search this channel"
                active={showSearch}
                onClick={() => {
                  setShowSearch((s) => !s);
                  setFilter('');
                }}
              >
                <Search size={16} />
              </IconButton>
              <IconButton
                label={pinnedOnly ? 'Show all messages' : 'Show pinned messages'}
                active={pinnedOnly}
                onClick={() => setPinnedOnly((p) => !p)}
              >
                <Pin size={16} />
              </IconButton>
              <IconButton label="People" active={panel === 'members'} onClick={() => setPanel((p) => (p === 'members' ? 'none' : 'members'))}>
                <Users size={16} />
              </IconButton>
            </>
          }
        />
        {showSearch && (
          <div className="border-b border-line px-4 py-2">
            <input
              autoFocus
              className="field h-8 text-[13px]"
              placeholder={`Search in ${isDM ? label : '#' + label}`}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
        )}

        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-y-auto pb-3">
          {loadedFor === activeChannelId && messages.length === 0 && (
            <EmptyState
              icon={isDM ? <MessageSquare size={22} /> : <Hash size={22} />}
              title={isDM ? `This is the start of your conversation with ${label}` : `This is the start of #${label}`}
              body={
                channel?.id === 'ai-lounge'
                  ? 'Gemini answers every message posted here.'
                  : 'Say hello, share a snippet, or mention @gemini to ask the AI.'
              }
            />
          )}
          {loadedFor !== activeChannelId && (
            <p className="px-5 py-8 text-[13px] text-ink-3">{connected ? 'Loading messages…' : 'Waiting for connection…'}</p>
          )}
          {hasMore && loadedFor === activeChannelId && !filter && !pinnedOnly && (
            <div className="flex justify-center py-3">
              <Button size="sm" loading={loadingOlder} onClick={loadOlder}>
                Load older messages
              </Button>
            </div>
          )}
          {(filter || pinnedOnly) && loadedFor === activeChannelId && visible.length === 0 && messages.length > 0 && (
            <EmptyState
              title={pinnedOnly ? 'No pinned messages yet' : 'No messages match'}
              body={pinnedOnly ? 'Hover a message and choose the pin to keep it here.' : 'Try a different word.'}
            />
          )}
          {visible.map((m, i) => {
            const prev = visible[i - 1];
            const newDay = !prev || new Date(prev.timestamp).toDateString() !== new Date(m.timestamp).toDateString();
            const compact =
              !!prev &&
              !newDay &&
              prev.userId === m.userId &&
              prev.username === m.username &&
              Date.parse(m.timestamp) - Date.parse(prev.timestamp) < 5 * 60000;
            return (
              <React.Fragment key={m.id}>
                {newDay && (
                  <div className="flex items-center gap-3 px-5 pt-5 pb-1">
                    <span className="h-px flex-1 bg-line" />
                    <span className="font-mono text-[11px] text-ink-3">{dayLabel(m.timestamp)}</span>
                    <span className="h-px flex-1 bg-line" />
                  </div>
                )}
                <MessageRow
                  msg={m}
                  compact={compact}
                  onThread={openThread}
                  onReply={setReplyTo}
                  canModerate={social.isAdmin || hasPermission(community, user.id, 'manage_messages')}
                />
              </React.Fragment>
            );
          })}
        </div>

        {notice && (
          <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-err/40 bg-err/10 px-3.5 py-2 text-[12.5px]">
            <span className="min-w-0 flex-1 truncate">{notice}</span>
            <IconButton label="Dismiss notice" className="h-6 w-6" onClick={() => setNotice(null)}>
              <X size={13} />
            </IconButton>
          </div>
        )}
        {mention && mention.channelId !== activeChannelId && (
          <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-[#ffd23f]/40 bg-[#ffd23f]/10 px-3.5 py-2 text-[12.5px]">
            <button
              type="button"
              onClick={() => {
                openChannel(mention.channelId);
                setMention(null);
              }}
              className="min-w-0 flex-1 truncate text-left"
            >
              <span className="font-semibold">@{mention.from}</span> mentioned you: <span className="text-ink-2">{mention.text}</span>
            </button>
            <IconButton label="Dismiss mention" className="h-6 w-6" onClick={() => setMention(null)}>
              <X size={13} />
            </IconButton>
          </div>
        )}
        <div className="px-4 pb-4">
          <p className="h-5 px-1 text-[12px] text-ink-3" aria-live="polite">
            {typingNames.length > 0 && (
              <>
                <span className="font-medium text-ink-2">{typingNames.slice(0, 2).join(', ')}</span>
                {typingNames.length > 2 ? ` and ${typingNames.length - 2} more are` : typingNames.length > 1 ? ' are' : ' is'} typing
                <span className="animate-blink">…</span>
              </>
            )}
          </p>
          <Composer
            key={activeChannelId}
            autoFocusKey={activeChannelId}
            placeholder={isDM ? `Message ${label}` : `Message #${label}`}
            onSend={send}
            onTyping={noteTyping}
            onSnippet={() => setSnippetOpen(true)}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
          />
        </div>
      </section>
      )}

      {panel === 'thread' && threadMsg && (
        <div className="fixed inset-0 z-40 lg:static lg:z-auto">
          <ThreadPanel parent={threadMsg} onClose={() => setPanel('none')} />
        </div>
      )}
      {panel === 'members' && (
        <div className="fixed inset-0 z-40 lg:static lg:z-auto">
          <MembersPanel channel={channel} onClose={() => setPanel('none')} />
        </div>
      )}

      <SocialModal open={socialOpen} onClose={() => setSocialOpen(false)} />
      <Modal
        open={snippetOpen}
        onClose={() => setSnippetOpen(false)}
        title="Share a code snippet"
        description="JavaScript snippets get a Run button that executes in an isolated worker."
        width={620}
        footer={
          <>
            <Button onClick={() => setSnippetOpen(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="snippet-form" disabled={!snippet.code.trim()}>
              Share snippet
            </Button>
          </>
        }
      >
        <form id="snippet-form" onSubmit={sendSnippet} className="space-y-3">
          <div className="grid grid-cols-[1fr_160px] gap-2">
            <div>
              <label className="label" htmlFor="sn-title">
                File name
              </label>
              <input
                id="sn-title"
                className="field font-mono text-[13px]"
                placeholder="useSocket.ts"
                value={snippet.title}
                onChange={(e) => setSnippet({ ...snippet, title: e.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="sn-lang">
                Language
              </label>
              <select
                id="sn-lang"
                className="field text-[13px]"
                value={snippet.language}
                onChange={(e) => setSnippet({ ...snippet, language: e.target.value })}
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="sn-code">
              Code
            </label>
            <textarea
              id="sn-code"
              rows={12}
              spellCheck={false}
              className="field resize-y font-mono text-[12.5px] leading-relaxed"
              value={snippet.code}
              onChange={(e) => setSnippet({ ...snippet, code: e.target.value })}
            />
          </div>
        </form>
      </Modal>

      <Modal
        open={channelModal}
        onClose={() => setChannelModal(false)}
        title="Create a channel"
        description="Channels are open to everyone in the workspace."
        footer={
          <>
            <Button onClick={() => setChannelModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit" form="channel-form" disabled={newChannel.name.trim().length < 2}>
              Create channel
            </Button>
          </>
        }
      >
        <form id="channel-form" onSubmit={createChannel} className="space-y-3">
          <div>
            <label className="label" htmlFor="ch-name">
              Name
            </label>
            <div className="relative">
              <Hash size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3" />
              <input
                id="ch-name"
                className="field pl-8"
                maxLength={32}
                placeholder="release-planning"
                value={newChannel.name}
                onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value.toLowerCase().replace(/\s+/g, '-'), error: '' })}
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="ch-desc">
              What is it for? <span className="font-normal text-ink-3">· optional</span>
            </label>
            <input
              id="ch-desc"
              className="field"
              maxLength={140}
              value={newChannel.description}
              onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
            />
          </div>
          {newChannel.error && <p className="text-[12.5px] text-err">{newChannel.error}</p>}
        </form>
      </Modal>

      <Modal open={dmModal} onClose={() => setDmModal(false)} title="New direct message" width={400}>
        <input className="field mb-2" placeholder="Search people" value={dmQuery} onChange={(e) => setDmQuery(e.target.value)} />
        <ul className="max-h-72 overflow-y-auto">
          {dmCandidates.map((p) => (
            <li key={p.userId}>
              <button
                type="button"
                onClick={() => {
                  openDM(p.userId);
                  setDmModal(false);
                  setDmQuery('');
                  setMobileSidebar(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left hover:bg-subtle"
              >
                <Avatar emoji={p.avatarEmoji} size={28} status={p.status} />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] text-ink">{p.username}</span>
                  <span className="block truncate text-[11.5px] text-ink-3">{p.role}</span>
                </span>
              </button>
            </li>
          ))}
          {dmCandidates.length === 0 && <li className="px-2 py-4 text-[13px] text-ink-3">No one matches that name.</li>}
        </ul>
      </Modal>
    </div>
  );
}

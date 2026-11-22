import React, { useEffect, useState } from 'react';
import { MessageSquare, LogOut, Github } from 'lucide-react';
import { api } from '../lib/api';
import { useWorkspace } from '../lib/workspace';
import { DevUser, PresenceStatus } from '../types';
import { isFreeTier } from '../lib/format';
import { Avatar, Badge, Button, Modal, Segmented, cx, AVATAR_CHOICES, SKILL_CHOICES } from './ui';

export function UserCardModal() {
  const { profileUserId, showProfile, presenceOf, user, openDM, setSettingsOpen } = useWorkspace();
  const p = profileUserId ? presenceOf(profileUserId) : undefined;
  const isMe = profileUserId === user.id;
  const statusText: Record<PresenceStatus, string> = { online: 'Online', away: 'Away', dnd: 'Do not disturb', offline: 'Offline' };

  return (
    <Modal open={!!profileUserId && !!p} onClose={() => showProfile(null)} title={p ? `@${p.username}` : ''} width={360}>
      {p && (
        <div>
          <div className="flex items-center gap-3">
            <Avatar emoji={p.avatarEmoji} size={56} status={p.status} />
            <div className="min-w-0">
              <p className="truncate font-medium">{p.role}</p>
              <p className="text-[12.5px] text-ink-3">
                {statusText[p.status]}
                {p.customStatus ? ` · ${p.customStatus}` : ''}
              </p>
              <div className="mt-1 flex gap-1">
                {!isFreeTier(p.tier) && <Badge tone="accent">{p.tier}</Badge>}
                {typeof p.xpPoints === 'number' && p.xpPoints > 0 && <Badge>{p.xpPoints} XP</Badge>}
              </div>
            </div>
          </div>
          {!!p.skills?.length && (
            <div className="mt-4 flex flex-wrap gap-1">
              {p.skills.map((s) => (
                <Badge key={s}>{s}</Badge>
              ))}
            </div>
          )}
          <div className="mt-5">
            {isMe ? (
              <Button
                className="w-full"
                onClick={() => {
                  showProfile(null);
                  setSettingsOpen(true);
                }}
              >
                Edit profile
              </Button>
            ) : (
              <Button variant="primary" className="w-full" onClick={() => openDM(p.userId)}>
                <MessageSquare size={14} /> Message
              </Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

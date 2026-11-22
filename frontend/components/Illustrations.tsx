import React from 'react';

/**
 * Clean flat illustrations for the landing page cards. Each one sits on a soft pale panel and uses
 * only the brand palette: electric blue, ink, white, pale blue and a few accent colours.
 */
const BLUE = '#2f5bff';
const PALE = '#eef2ff';
const INK = '#0a0b0d';
const YELLOW = '#ffd23f';
const PINK = '#ff8fc7';
const GREEN = '#3ddc97';
const SKY = '#7cc4ff';
const ORANGE = '#ff9f43';

type IlloName =
  | 'chat'
  | 'communities'
  | 'whiteboard'
  | 'agents'
  | 'moderation'
  | 'profile'
  | 'join'
  | 'flow'
  | 'zero'
  | 'postgres'
  | 'key'
  | 'webhook';

const Panel = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 240 150" className="h-auto w-full" aria-hidden="true">
    <rect x="0" y="0" width="240" height="150" rx="18" fill={PALE} />
    {children}
  </svg>
);

const ILLUSTRATIONS: Record<IlloName, React.ReactNode> = {
  chat: (
    <>
      <rect x="28" y="30" width="120" height="50" rx="16" fill={BLUE} />
      <path d="M50 80 L44 94 L66 80 Z" fill={BLUE} />
      <rect x="92" y="62" width="120" height="50" rx="16" fill={INK} />
      <path d="M190 112 L196 126 L174 112 Z" fill={INK} />
      <circle cx="54" cy="55" r="4" fill="#fff" />
      <circle cx="70" cy="55" r="4" fill="#fff" />
      <circle cx="86" cy="55" r="4" fill="#fff" />
      <rect x="112" y="84" width="60" height="6" rx="3" fill="#fff" fillOpacity="0.8" />
      <rect x="112" y="96" width="40" height="6" rx="3" fill="#fff" fillOpacity="0.5" />
    </>
  ),
  communities: (
    <>
      <circle cx="78" cy="70" r="26" fill={BLUE} />
      <circle cx="78" cy="64" r="9" fill="#fff" />
      <path d="M58 92 Q78 76 98 92 Z" fill="#fff" />
      <circle cx="122" cy="62" r="24" fill={YELLOW} />
      <circle cx="122" cy="56" r="8" fill={INK} />
      <path d="M104 80 Q122 66 140 80 Z" fill={INK} />
      <circle cx="166" cy="78" r="22" fill={PINK} />
      <circle cx="166" cy="73" r="7" fill={INK} />
      <path d="M150 94 Q166 82 182 94 Z" fill={INK} />
      <circle cx="196" cy="50" r="14" fill={INK} />
      <path d="M196 43 V57 M189 50 H203" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </>
  ),
  whiteboard: (
    <>
      <rect x="30" y="28" width="180" height="96" rx="12" fill="#fff" stroke={INK} strokeWidth="2" />
      <path d="M50 96 C70 60 90 110 110 74 S150 60 170 84" fill="none" stroke={BLUE} strokeWidth="4" strokeLinecap="round" />
      <rect x="130" y="40" width="34" height="30" rx="4" fill={YELLOW} />
      <rect x="58" y="44" width="30" height="26" rx="4" fill={PINK} />
      <circle cx="180" cy="50" r="8" fill={GREEN} />
      <path d="M170 110 L186 96 L190 104 L174 118 Z" fill={INK} />
    </>
  ),
  agents: (
    <>
      <path d="M62 68 C90 68 90 50 120 50" fill="none" stroke={INK} strokeWidth="3" />
      <path d="M62 68 C90 68 90 92 120 92" fill="none" stroke={INK} strokeWidth="3" />
      <path d="M120 92 C150 92 150 70 180 70" fill="none" stroke={INK} strokeWidth="3" />
      <rect x="30" y="54" width="40" height="28" rx="8" fill={SKY} />
      <rect x="120" y="36" width="44" height="28" rx="8" fill={BLUE} />
      <rect x="120" y="78" width="44" height="28" rx="8" fill={YELLOW} />
      <rect x="180" y="56" width="32" height="28" rx="8" fill={INK} />
      <path d="M190 62 L200 70 L190 78" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M204 30 L206 36 L212 38 L206 40 L204 46 L202 40 L196 38 L202 36 Z" fill={BLUE} />
    </>
  ),
  moderation: (
    <>
      <path d="M96 30 L134 44 V78 C134 102 116 118 96 126 C76 118 58 102 58 78 V44 Z" fill={BLUE} />
      <path d="M80 80 L92 92 L116 66" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="170" cy="92" r="28" fill={ORANGE} />
      <circle cx="170" cy="92" r="18" fill="#fff" />
      <path d="M170 82 V92 L178 96" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <rect x="152" y="36" width="54" height="16" rx="8" fill={INK} />
    </>
  ),
  profile: (
    <>
      <circle cx="120" cy="66" r="34" fill={SKY} />
      <circle cx="120" cy="58" r="13" fill={INK} />
      <path d="M92 104 Q120 80 148 104 Z" fill={INK} />
      <circle cx="154" cy="46" r="13" fill={GREEN} />
      <path d="M148 46 L153 51 L161 41" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="50" y="116" width="46" height="16" rx="8" fill={YELLOW} />
      <rect x="104" y="116" width="58" height="16" rx="8" fill={PINK} />
      <rect x="170" y="116" width="36" height="16" rx="8" fill="#fff" />
    </>
  ),
  join: (
    <>
      <rect x="34" y="46" width="72" height="50" rx="25" fill="none" stroke={BLUE} strokeWidth="8" />
      <rect x="112" y="54" width="72" height="50" rx="25" fill="none" stroke={INK} strokeWidth="8" />
      <rect x="66" y="26" width="108" height="22" rx="11" fill="#fff" />
      <text x="120" y="42" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="700" fill={INK}>invite · 8f2c</text>
      <path d="M160 110 L172 122 L196 98" fill="none" stroke={GREEN} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  flow: (
    <>
      <path d="M52 76 H188" stroke={INK} strokeWidth="2" strokeDasharray="4 6" />
      <rect x="24" y="56" width="50" height="40" rx="12" fill={SKY} />
      <rect x="95" y="56" width="50" height="40" rx="12" fill={BLUE} />
      <rect x="166" y="56" width="50" height="40" rx="12" fill={GREEN} />
      <circle cx="188" cy="76" r="5" fill={INK} />
      <circle cx="120" cy="76" r="5" fill={YELLOW} />
      <circle cx="49" cy="76" r="5" fill="#fff" />
    </>
  ),
  zero: (
    <>
      <path d="M70 110 V52 Q70 40 82 40 H106 L118 52 H160 Q172 52 172 64 V110 Z" fill={YELLOW} />
      <path d="M70 110 V70 H172 V110 Z" fill={ORANGE} />
      <path d="M120 72 C120 56 132 44 150 44 C150 60 138 72 120 72 Z" fill={GREEN} />
      <path d="M120 72 L134 60" stroke={INK} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  postgres: (
    <>
      <ellipse cx="120" cy="42" rx="56" ry="16" fill={BLUE} />
      <path d="M64 42 V100 C64 109 88 116 120 116 C152 116 176 109 176 100 V42" fill={BLUE} />
      <ellipse cx="120" cy="66" rx="56" ry="16" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" />
      <ellipse cx="120" cy="90" rx="56" ry="16" fill="none" stroke="#fff" strokeOpacity="0.5" strokeWidth="2" />
      <circle cx="184" cy="34" r="12" fill={GREEN} />
      <path d="M179 34 L183 38 L190 30" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  key: (
    <>
      <circle cx="90" cy="75" r="24" fill={ORANGE} />
      <circle cx="90" cy="75" r="9" fill={PALE} />
      <rect x="112" y="68" width="88" height="14" rx="7" fill={INK} />
      <rect x="182" y="82" width="10" height="16" rx="3" fill={INK} />
      <rect x="164" y="82" width="10" height="10" rx="2" fill={INK} />
    </>
  ),
  webhook: (
    <>
      <circle cx="120" cy="74" r="30" fill={INK} />
      <circle cx="120" cy="74" r="10" fill={PALE} />
      <circle cx="90" cy="98" r="20" fill={YELLOW} />
      <circle cx="150" cy="98" r="20" fill={GREEN} />
      <path d="M120 84 L120 44" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M130 56 L132 42 L146 46" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
};

/** Which illustration each feature card uses. */
export const FEATURE_ILLO: Record<string, IlloName> = {
  'Communities with roles': 'communities',
  'Live channels and threads': 'chat',
  'Rich messages': 'flow',
  'Shared whiteboard': 'whiteboard',
  'Agent studio': 'agents',
  'Moderation you can trust': 'moderation',
};

/** The landing-page illustration by name. */
export function Illo({ name }: { name: IlloName }) {
  return <Panel>{ILLUSTRATIONS[name]}</Panel>;
}

export type { IlloName };

/** Illustrations for the self-hosting cards, keyed by their title. */
export const SELF_HOST_ILLO: Record<string, IlloName> = {
  'Zero-setup start': 'zero',
  'PostgreSQL when you grow': 'postgres',
  'Your own AI key': 'key',
  'Actions to any webhook': 'webhook',
};

/** Illustrations for the three steps. */
export const STEP_ILLO: IlloName[] = ['profile', 'join', 'flow'];

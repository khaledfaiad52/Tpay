/**
 * Icon geometry, transcribed verbatim from the approved design canvas.
 *
 * Every icon is a 24×24 stroked outline — no fills, no emoji, no glyph fonts.
 * Adding an icon means adding its primitives here, so the whole product keeps
 * one consistent drawing style.
 */
export type IconShape =
  | { readonly kind: 'path'; readonly d: string }
  | { readonly kind: 'circle'; readonly cx: number; readonly cy: number; readonly r: number }
  | {
      readonly kind: 'rect';
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly rx: number;
    };

export const iconPaths = {
  'arrow-left': [{ kind: 'path', d: 'm12 19-7-7 7-7' }, { kind: 'path', d: 'M19 12H5' }],
  'arrow-up-right': [{ kind: 'path', d: 'M7 7h10v10' }, { kind: 'path', d: 'M7 17 17 7' }],
  /** Vertical swap, for reversing the two sides of an exchange. */
  'arrow-down-up': [
    { kind: 'path', d: 'm3 16 4 4 4-4' },
    { kind: 'path', d: 'M7 20V4' },
    { kind: 'path', d: 'm21 8-4-4-4 4' },
    { kind: 'path', d: 'M17 4v16' },
  ],
  'alert-triangle': [
    { kind: 'path', d: 'm21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3' },
    { kind: 'path', d: 'M12 9v4' },
    { kind: 'path', d: 'M12 17h.01' },
  ],
  banknote: [
    { kind: 'rect', x: 2, y: 6, width: 20, height: 12, rx: 2 },
    { kind: 'circle', cx: 12, cy: 12, r: 2 },
    { kind: 'path', d: 'M6 12h.01' },
    { kind: 'path', d: 'M18 12h.01' },
  ],
  bell: [
    { kind: 'path', d: 'M10.3 21a2 2 0 0 0 3.4 0' },
    {
      kind: 'path',
      d: 'M3.3 15.3A1 1 0 0 0 4 17h16a1 1 0 0 0 .7-1.7C19.4 14 18 12.5 18 8A6 6 0 0 0 6 8c0 4.5-1.4 6-2.7 7.3',
    },
  ],
  building: [
    { kind: 'path', d: 'M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z' },
    { kind: 'path', d: 'M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2' },
    { kind: 'path', d: 'M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2' },
    { kind: 'path', d: 'M10 6h4' },
    { kind: 'path', d: 'M10 10h4' },
    { kind: 'path', d: 'M10 14h4' },
    { kind: 'path', d: 'M10 18h4' },
  ],
  check: [{ kind: 'path', d: 'M20 6 9 17l-5-5' }],
  'chevron-down': [{ kind: 'path', d: 'm6 9 6 6 6-6' }],
  'chevron-right': [{ kind: 'path', d: 'm9 18 6-6-6-6' }],
  copy: [
    { kind: 'rect', x: 8, y: 8, width: 14, height: 14, rx: 2 },
    { kind: 'path', d: 'M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2' },
  ],
  'credit-card': [
    { kind: 'rect', x: 2, y: 5, width: 20, height: 14, rx: 2 },
    { kind: 'path', d: 'M2 10h20' },
  ],
  exchange: [
    { kind: 'path', d: 'm16 3 4 4-4 4' },
    { kind: 'path', d: 'M20 7H4' },
    { kind: 'path', d: 'm8 21-4-4 4-4' },
    { kind: 'path', d: 'M4 17h16' },
  ],
  'face-scan': [
    { kind: 'path', d: 'M3 7V5a2 2 0 0 1 2-2h2' },
    { kind: 'path', d: 'M17 3h2a2 2 0 0 1 2 2v2' },
    { kind: 'path', d: 'M21 17v2a2 2 0 0 1-2 2h-2' },
    { kind: 'path', d: 'M7 21H5a2 2 0 0 1-2-2v-2' },
    { kind: 'path', d: 'M9 10h.01' },
    { kind: 'path', d: 'M15 10h.01' },
    { kind: 'path', d: 'M9 15c.8.7 1.9 1 3 1s2.2-.3 3-1' },
  ],
  gift: [
    { kind: 'rect', x: 3, y: 8, width: 18, height: 4, rx: 1 },
    { kind: 'path', d: 'M12 8v13' },
    { kind: 'path', d: 'M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7' },
    { kind: 'path', d: 'M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5' },
  ],
  globe: [
    { kind: 'circle', cx: 12, cy: 12, r: 10 },
    { kind: 'path', d: 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20' },
    { kind: 'path', d: 'M2 12h20' },
  ],
  headset: [
    { kind: 'path', d: 'M3 14v-3a9 9 0 0 1 18 0v3' },
    { kind: 'path', d: 'M21 16a2 2 0 0 1-2 2h-1a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h3z' },
    { kind: 'path', d: 'M3 16a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H3z' },
  ],
  'heart-pulse': [
    {
      kind: 'path',
      d: 'M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z',
    },
    { kind: 'path', d: 'M3.2 13h6.3l.5-1 2 4.5 2-7 1.5 3.5h5.3' },
  ],
  'help-circle': [
    { kind: 'circle', cx: 12, cy: 12, r: 10 },
    { kind: 'path', d: 'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3' },
    { kind: 'path', d: 'M12 17h.01' },
  ],
  home: [
    { kind: 'path', d: 'm3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    { kind: 'path', d: 'M9 22V12h6v10' },
  ],
  landmark: [
    { kind: 'path', d: 'M3 22h18' },
    { kind: 'path', d: 'M6 18v-7' },
    { kind: 'path', d: 'M10 18v-7' },
    { kind: 'path', d: 'M14 18v-7' },
    { kind: 'path', d: 'M18 18v-7' },
    { kind: 'path', d: 'M12 2 21 7H3Z' },
  ],
  percent: [
    { kind: 'path', d: 'M19 5 5 19' },
    { kind: 'circle', cx: 6.5, cy: 6.5, r: 2.5 },
    { kind: 'circle', cx: 17.5, cy: 17.5, r: 2.5 },
  ],
  /** Sign-out arrow, for ending a session on this or another device. */
  'log-out': [
    { kind: 'path', d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' },
    { kind: 'path', d: 'm16 17 5-5-5-5' },
    { kind: 'path', d: 'M21 12H9' },
  ],
  /** Closed padlock — password and account protection. */
  lock: [
    { kind: 'rect', x: 3, y: 11, width: 18, height: 11, rx: 2 },
    { kind: 'path', d: 'M7 11V7a5 5 0 0 1 10 0v4' },
  ],
  /** Laptop or desktop, for a trusted device that is not a phone. */
  monitor: [
    { kind: 'rect', x: 2, y: 3, width: 20, height: 14, rx: 2 },
    { kind: 'path', d: 'M8 21h8' },
    { kind: 'path', d: 'M12 17v4' },
  ],
  /** Speech bubble — a support conversation. */
  'message-circle': [
    { kind: 'path', d: 'M7.9 20A9 9 0 1 0 4 16.1L2 22Z' },
  ],
  /** Identity document. */
  'id-card': [
    { kind: 'rect', x: 2, y: 5, width: 20, height: 14, rx: 2 },
    { kind: 'circle', cx: 9, cy: 11, r: 2 },
    { kind: 'path', d: 'M6 16a3 3 0 0 1 6 0' },
    { kind: 'path', d: 'M15 10h4' },
    { kind: 'path', d: 'M15 14h4' },
  ],
  /** Dismiss. */
  x: [{ kind: 'path', d: 'M18 6 6 18' }, { kind: 'path', d: 'm6 6 12 12' }],
  plus: [{ kind: 'path', d: 'M5 12h14' }, { kind: 'path', d: 'M12 5v14' }],
  search: [
    { kind: 'circle', cx: 11, cy: 11, r: 8 },
    { kind: 'path', d: 'm21 21-4.3-4.3' },
  ],
  send: [{ kind: 'path', d: 'm3 3 3 9-3 9 19-9Z' }, { kind: 'path', d: 'M6 12h16' }],
  'shield-check': [
    {
      kind: 'path',
      d: 'M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1z',
    },
    { kind: 'path', d: 'm9 12 2 2 4-4' },
  ],
  smartphone: [
    { kind: 'rect', x: 5, y: 2, width: 14, height: 20, rx: 2 },
    { kind: 'path', d: 'M12 18h.01' },
  ],
  user: [
    { kind: 'path', d: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2' },
    { kind: 'circle', cx: 12, cy: 7, r: 4 },
  ],
  wallet: [
    {
      kind: 'path',
      d: 'M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v3h-3a2 2 0 0 0 0 4h3v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5',
    },
  ],
} as const satisfies Record<string, readonly IconShape[]>;

export type IconName = keyof typeof iconPaths;

/**
 * TPay colour tokens.
 *
 * Values are lifted verbatim from the approved design canvas
 * (`design-reference/TPay Mobile.dc.html`). Do not introduce colours that are
 * not in this file — if a screen needs a new one, it belongs here first.
 */
export const colors = {
  /** Brand green — primary actions, links, active navigation. */
  primary: '#0F5A50',
  primaryDark: '#0B3B34',
  primaryDeep: '#12332A',
  /** Tinted primary surface used for icon tiles and soft chips. */
  primarySoft: '#EAF3EF',
  primarySoftBorder: '#D4E5DE',
  primaryOnDark: '#9DC6BB',
  primaryOnDarkMuted: '#7FAFA3',
  primaryOnDarkSubtle: '#4E7A70',
  /** Body copy on the primary-soft tint. */
  primaryDeepText: '#28564C',

  /** Near-black used for text and the card surface. */
  ink: '#101A16',
  inkSecondary: '#3F4B45',
  inkMuted: '#7B8781',
  inkFaint: '#A9B4AE',
  inkOnDarkMuted: '#8A9A93',

  /** App canvas and raised surfaces. */
  canvas: '#F6F5F2',
  surface: '#FFFFFF',
  surfaceMuted: '#F1EFEA',
  surfaceSunken: '#EEECE6',
  border: '#E8E6E0',
  borderStrong: '#D9D6CE',
  divider: '#F1EFEA',

  /** Accent gold — salary, employer and pending states. */
  gold: '#C98A3C',
  goldSoft: '#FAF2E6',
  goldSoftBorder: '#EEDFC4',
  goldText: '#9C6A22',

  /** Status colours. */
  success: '#1B7F5A',
  successOnDark: '#5FC49B',
  warning: '#B4791C',
  warningText: '#8A5C13',
  warningTextSoft: '#9C7434',
  danger: '#B3392F',
  dangerSoft: '#FBEEEC',
  dangerSoftBorder: '#F0D6D2',
  dangerText: '#8E2E26',
  dangerTextSoft: '#A6564D',
  info: '#2A5FA8',
  infoSoft: '#EEF2F8',

  /** Always-white text on dark surfaces. */
  onDark: '#FFFFFF',
  onDarkSoft: '#F4F3EF',

  /** Translucent overlays used on the dark balance card. */
  overlayOnDark: 'rgba(255,255,255,0.09)',
  overlayOnDarkStrong: 'rgba(255,255,255,0.16)',
} as const;

export type ColorToken = keyof typeof colors;

import { Platform, type TextStyle } from 'react-native';

/**
 * Font families registered in `src/app/_layout.tsx`.
 * Manrope carries the whole product; IBM Plex Mono is reserved for account
 * numbers, IBANs and reference codes.
 */
export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  extrabold: 'Manrope_800ExtraBold',
  mono: 'IBMPlexMono_400Regular',
  monoMedium: 'IBMPlexMono_500Medium',
} as const;

/**
 * Money and other figures are always tabular so columns of amounts align.
 * `fontVariant` is unsupported on react-native-web, which uses the CSS
 * property instead.
 */
export const tabularNums: TextStyle = Platform.select<TextStyle>({
  web: { fontVariantNumeric: 'tabular-nums' } as TextStyle,
  default: { fontVariant: ['tabular-nums'] },
})!;

type Variant = {
  fontFamily: string;
  fontSize: number;
  letterSpacing?: number;
  lineHeight?: number;
};

/**
 * Named type ramp. Sizes/weights match the design canvas one-for-one; the
 * canvas expresses tracking as em, converted here to points.
 */
export const type = {
  /** 40/800 — the balance figure on Home. */
  balance: { fontFamily: fonts.extrabold, fontSize: 40, letterSpacing: -1.6, lineHeight: 44 },
  /** 34/800 — balance on secondary screens. */
  balanceSm: { fontFamily: fonts.extrabold, fontSize: 34, letterSpacing: -1.36, lineHeight: 38 },
  /** 44/800 — the amount being sent. */
  amountDisplay: { fontFamily: fonts.extrabold, fontSize: 44, letterSpacing: -1.76, lineHeight: 46 },
  /** 28/800 — a single account's balance. */
  balanceMd: { fontFamily: fonts.extrabold, fontSize: 28, letterSpacing: -0.84, lineHeight: 30 },
  /** 26/800 — the headline on a transfer outcome screen. */
  outcomeTitle: { fontFamily: fonts.extrabold, fontSize: 26, letterSpacing: -0.78 },
  /** 24/800 — screen titles. */
  screenTitle: { fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: -0.72 },
  /** 22/800 — the user's name in the Home greeting. */
  displaySm: { fontFamily: fonts.extrabold, fontSize: 22, letterSpacing: -0.66 },
  /** 24/800 — the two sides of an exchange. */
  amountXl: { fontFamily: fonts.extrabold, fontSize: 24, letterSpacing: -0.72 },
  /** 32/800 — the figure on a transaction receipt. */
  amountHero: { fontFamily: fonts.extrabold, fontSize: 32, letterSpacing: -1.28 },
  /** 20/800 — the employer's name on its own panel. */
  displayXs: { fontFamily: fonts.extrabold, fontSize: 20, letterSpacing: -0.4 },
  /** 19/800 — figure inside a list card. */
  amountLg: { fontFamily: fonts.extrabold, fontSize: 19, letterSpacing: -0.38 },
  /** 17/800 — the featured benefit's name. */
  featureTitle: { fontFamily: fonts.extrabold, fontSize: 17, letterSpacing: -0.34 },
  /** 16/800 — inline screen headings. */
  headingSm: { fontFamily: fonts.extrabold, fontSize: 16, letterSpacing: -0.32 },
  /** 15/800 — section headers ("Recent activity"). */
  sectionTitle: { fontFamily: fonts.extrabold, fontSize: 15, letterSpacing: -0.3 },
  /** 15/800 — trailing amount on an account row. */
  amountMd: { fontFamily: fonts.extrabold, fontSize: 15 },
  /** 15/600 — the value inside a form field. */
  input: { fontFamily: fonts.semibold, fontSize: 15 },
  /** 14/800 — a card's own heading, heavier than a row title. */
  rowTitleStrong: { fontFamily: fonts.extrabold, fontSize: 14 },
  /** 14/700 — primary row label. */
  rowTitle: { fontFamily: fonts.bold, fontSize: 14 },
  /** 14/800 — transaction amount. */
  amountSm: { fontFamily: fonts.extrabold, fontSize: 14 },
  /** 13/700 — compact card titles and button labels. */
  label: { fontFamily: fonts.bold, fontSize: 13 },
  /** 14/500 — reading copy on outcome and empty screens. */
  rowBody: { fontFamily: fonts.medium, fontSize: 14 },
  /** 13/600 — greeting, quiet body copy. */
  body: { fontFamily: fonts.semibold, fontSize: 13 },
  /** 12/700 — link actions ("View all"), meta labels. */
  action: { fontFamily: fonts.bold, fontSize: 12 },
  /** 12/600 — row subtitles. */
  caption: { fontFamily: fonts.semibold, fontSize: 12 },
  /** 11/600 — the smallest supporting copy. */
  captionSm: { fontFamily: fonts.semibold, fontSize: 11 },
  /** 11/700 — badge text. */
  badge: { fontFamily: fonts.bold, fontSize: 11 },
  /** 9/800 — the format mark on a document thumbnail. */
  thumbnail: { fontFamily: fonts.extrabold, fontSize: 9 },
  /** 10/700 — tab bar labels. */
  tab: { fontFamily: fonts.bold, fontSize: 10 },
  /** 10/600 — inactive tab bar labels, transaction status. */
  tabIdle: { fontFamily: fonts.semibold, fontSize: 10 },
  /** 12/700 · 0.08em — the eyebrow above the balance. */
  eyebrow: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 0.96 },
  /** 11/700 · 0.055em — small-caps group headings and field labels. */
  eyebrowSm: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.62 },
  /** Monospaced account identifiers. */
  mono: { fontFamily: fonts.mono, fontSize: 13, letterSpacing: 0.2 },
} satisfies Record<string, Variant>;

export type TypeVariant = keyof typeof type;

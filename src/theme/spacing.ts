/** 4-point spacing scale from the design system panel: 4 · 8 · 12 · 16 · 20 · 24 · 32. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Horizontal gutter used by every screen body in the design. */
export const screenPadding = 20;

/** Vertical rhythm between the stacked sections of a screen. */
export const sectionGap = 18;

export const radius = {
  xs: 6,
  sm: 8,
  md: 11,
  lg: 13,
  xl: 14,
  card: 20,
  panel: 22,
  sheet: 24,
  hero: 26,
  pill: 999,
} as const;

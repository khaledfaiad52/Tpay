import { Platform, type ViewStyle } from 'react-native';

/**
 * The canvas expresses elevation as CSS box-shadow. React Native needs the
 * iOS shadow* / Android elevation pair, so each shadow is declared once here.
 */
function shadow(
  color: string,
  opacity: number,
  radiusPx: number,
  offsetY: number,
  elevation: number,
): ViewStyle {
  return Platform.select<ViewStyle>({
    web: { boxShadow: `0 ${offsetY}px ${radiusPx}px ${withAlpha(color, opacity)}` } as ViewStyle,
    android: { elevation, shadowColor: color },
    default: {
      shadowColor: color,
      shadowOpacity: opacity,
      shadowRadius: radiusPx / 2,
      shadowOffset: { width: 0, height: offsetY / 2 },
    },
  })!;
}

function withAlpha(hex: string, alpha: number): string {
  const int = parseInt(hex.replace('#', ''), 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

export const shadows = {
  /** 0 16px 34px rgba(11,59,52,.24) — the Home balance card. */
  hero: shadow('#0B3B34', 0.24, 34, 16, 8),
  /** 0 18px 40px rgba(0,0,0,.3) — toasts and floating surfaces. */
  floating: shadow('#000000', 0.3, 40, 18, 12),
} as const;

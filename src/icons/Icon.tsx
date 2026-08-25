import { memo } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { iconPaths, type IconName } from './paths';

export type IconProps = {
  name: IconName;
  /** Rendered box in points. Icons are drawn on a 24×24 grid and scale down. */
  size?: number;
  color: string;
  /** 1.9 across the product; 2 for active navigation and primary actions. */
  strokeWidth?: number;
};

/**
 * The single icon primitive for the app. Never render an emoji or a Unicode
 * symbol in place of one of these.
 */
export const Icon = memo(function Icon({ name, size = 20, color, strokeWidth = 1.9 }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name].map((shape, i) => {
        if (shape.kind === 'path') return <Path key={i} d={shape.d} />;
        if (shape.kind === 'circle') return <Circle key={i} cx={shape.cx} cy={shape.cy} r={shape.r} />;
        return (
          <Rect
            key={i}
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            rx={shape.rx}
          />
        );
      })}
    </Svg>
  );
});

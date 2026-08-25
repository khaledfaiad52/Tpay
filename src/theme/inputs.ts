import { Platform, type TextStyle } from 'react-native';

/**
 * Removes the platform's own input chrome.
 *
 * React Native Web renders a `TextInput` as an `<input>`, which draws a
 * border and a focus outline the design does not have — the field's own card
 * or underline is the focus affordance. Spread this into every input style.
 */
export const inputReset: TextStyle = {
  borderWidth: 0,
  ...Platform.select<TextStyle>({
    // `outlineStyle: 'none'` is a react-native-web extension; React Native's
    // own types only allow the drawn outline styles.
    web: { outlineStyle: 'none', outlineWidth: 0 } as unknown as TextStyle,
    default: {},
  }),
};

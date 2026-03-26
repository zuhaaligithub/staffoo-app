declare module 'react-native-picker-select' {
  import { Component } from 'react';
  import { StyleProp, ViewStyle, TextStyle } from 'react-native';

  export interface PickerSelectProps {
    items: Array<{ label: string; value: any; key?: string }>;
    onValueChange?: (value: any, index: number) => void;
    value?: any;
    placeholder?: { label: string; value: any };
    style?: {
      inputIOS?: StyleProp<TextStyle>;
      inputAndroid?: StyleProp<TextStyle>;
      viewContainer?: StyleProp<ViewStyle>;
      // ... other style keys if you use them (placeholder, iconContainer, etc.)
    };
    disabled?: boolean;

    // Add this (and any other runtime props you need)
    useNativeAndroidPickerStyle?: boolean;

    // Optional: common extras from docs/issues
    Icon?: React.ComponentType<any> | (() => JSX.Element);
    fixAndroidTouchableBug?: boolean;
    // textInputProps?: any; // if you use multiline or other TextInput props
  }

  export default class RNPickerSelect extends Component<PickerSelectProps> {}
}
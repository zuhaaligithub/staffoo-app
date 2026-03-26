declare module 'react-native-google-places-autocomplete' {
  import { Component } from 'react';
  import { ViewStyle, TextStyle, TextInputProps } from 'react-native';

  interface GooglePlacesAutocompleteProps {
    placeholder: string;
    minLength?: number;
    fetchDetails?: boolean;
    onPress: (data: any, details: any) => void;
    query: {
      key: string;
      language?: string;
      components?: string;
      [key: string]: any;
    };
    styles?: {
      textInput?: TextStyle;
      container?: ViewStyle;
      listView?: ViewStyle;
      [key: string]: any;
    };
    enablePoweredByContainer?: boolean;
    nearbyPlacesAPI?: string;
    debounce?: number;
    textInputProps?: TextInputProps;
    [key: string]: any;
  }

  const GooglePlacesAutocomplete: React.ComponentClass<GooglePlacesAutocompleteProps>;
  export default GooglePlacesAutocomplete;
}
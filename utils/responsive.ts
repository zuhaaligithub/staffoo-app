import { useWindowDimensions } from "react-native";

export const getHeaderSpacing = (width: number) => {
  if (width >= 1024) {
    return { paddingHorizontal: 32, headerHeight: 80, marginBottom: 16 };
  }
  if (width >= 768) {
    return { paddingHorizontal: 24, headerHeight: 68, marginBottom: 12 };
  }
  return { paddingHorizontal: 16, headerHeight: 56, marginBottom: 8 };
};

export const useHeaderSpacing = () => {
  const { width } = useWindowDimensions();
  return getHeaderSpacing(width);
};

export default getHeaderSpacing;

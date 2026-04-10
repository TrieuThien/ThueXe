import { useColorScheme } from 'react-native';
import { darkTheme, lightTheme } from '../theme/themes';

export const useAppTheme = () => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return {
    isDark,
    theme: isDark ? darkTheme : lightTheme
  };
};

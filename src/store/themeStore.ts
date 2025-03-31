import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { webLightTheme, webDarkTheme } from '@fluentui/react-components';

interface ThemeState {
    isDarkMode: boolean;
    toggleTheme: () => void;
    theme: typeof webLightTheme;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set) => ({
            isDarkMode: window.matchMedia('(prefers-color-scheme: dark)').matches,
            theme: window.matchMedia('(prefers-color-scheme: dark)').matches
                ? webDarkTheme
                : webLightTheme,
            toggleTheme: () =>
                set((state) => ({
                    isDarkMode: !state.isDarkMode,
                    theme: state.isDarkMode ? webLightTheme : webDarkTheme,
                })),
        }),
        {
            name: 'theme-storage',
        }
    )
);

import { create } from 'zustand';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
}

function getSystemDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyTheme(isDark: boolean) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function resolveDark(mode: ThemeMode): boolean {
  if (mode === 'system') return getSystemDark();
  return mode === 'dark';
}

const savedMode = (localStorage.getItem('curta_theme') as ThemeMode) || 'system';

export const useThemeStore = create<ThemeState>((set) => ({
  mode: savedMode,
  isDark: resolveDark(savedMode),

  setMode: (mode) => {
    localStorage.setItem('curta_theme', mode);
    const isDark = resolveDark(mode);
    applyTheme(isDark);
    set({ mode, isDark });
  },
}));

// Apply on load
applyTheme(resolveDark(savedMode));

// Listen to system changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const current = useThemeStore.getState().mode;
  if (current === 'system') {
    const isDark = getSystemDark();
    applyTheme(isDark);
    useThemeStore.setState({ isDark });
  }
});

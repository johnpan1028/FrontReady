export type ShellThemeId = 'light' | 'dark';

export const applyShellThemeToDocument = (theme: ShellThemeId) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.shellTheme = theme;
};

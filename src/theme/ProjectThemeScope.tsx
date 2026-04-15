import { useLayoutEffect, useRef, type HTMLAttributes, type PropsWithChildren } from 'react';
import { cn } from '../utils/cn';
import { applyProjectThemeToElement, clearProjectThemeFromElement, type BuilderThemeManifest } from './presets';

type ProjectThemeScopeProps = PropsWithChildren<{
  themeId: string;
  projectThemes?: BuilderThemeManifest[];
}> & HTMLAttributes<HTMLDivElement>;

export function ProjectThemeScope({
  themeId,
  projectThemes = [],
  className,
  children,
  ...props
}: ProjectThemeScopeProps) {
  const scopeRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    applyProjectThemeToElement(scopeRef.current, themeId, projectThemes);
    return () => clearProjectThemeFromElement(scopeRef.current);
  }, [themeId, projectThemes]);

  return (
    <div
      ref={scopeRef}
      className={cn('project-theme-scope', className)}
      {...props}
    >
      {children}
    </div>
  );
}

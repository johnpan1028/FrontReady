import { createContext, useContext, type ReactNode } from 'react';

export type BuilderWorkspaceScope = 'page' | 'kit';

const BuilderWorkspaceScopeContext = createContext<BuilderWorkspaceScope>('page');

export function BuilderWorkspaceScopeProvider({
  scope,
  children,
}: {
  scope: BuilderWorkspaceScope;
  children: ReactNode;
}) {
  return (
    <BuilderWorkspaceScopeContext.Provider value={scope}>
      {children}
    </BuilderWorkspaceScopeContext.Provider>
  );
}

export const useBuilderWorkspaceScope = () => useContext(BuilderWorkspaceScopeContext);

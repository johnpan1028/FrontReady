import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import {
  executeRequest,
  loadDataSource,
  toErrorState,
  type RequestExecutionContext,
  type RuntimeDataState,
} from '../data/connectors';
import { getValueAtPath, setValueAtPath } from '../data/path';
import type { BuilderDataSource, BuilderNodeDocument, BuilderProject, NodeAction } from '../schema/project';
import {
  getNavigateActionConfig,
  getOpenModalActionConfig,
} from '../core/actionTargets';

type RuntimeContextValue = {
  dataSources: BuilderDataSource[];
  dataStates: Record<string, RuntimeDataState>;
  runtimeState: Record<string, unknown>;
  runtimeEnv: Record<string, string>;
  modalState: { title?: string; description?: string } | null;
  resolveNodeProps: (node: BuilderNodeDocument) => Record<string, any>;
  runActions: (actions: NodeAction[]) => Promise<void>;
  refreshSources: (sourceKeys?: string[]) => Promise<void>;
  setRuntimeValue: (key: string, value: unknown) => void;
  closeModal: () => void;
};

const RuntimeContext = createContext<RuntimeContextValue | null>(null);
const RUNTIME_CONTEXT_BRIDGE_KEY = '__frontend_experience_runtime_context__';

const getRuntimeContextBridge = () => {
  const root = globalThis as typeof globalThis & {
    [RUNTIME_CONTEXT_BRIDGE_KEY]?: RuntimeContextValue | null;
  };

  if (!(RUNTIME_CONTEXT_BRIDGE_KEY in root)) {
    root[RUNTIME_CONTEXT_BRIDGE_KEY] = null;
  }

  return root;
};

const getBindingTargetProp = (binding: BuilderNodeDocument['bindings'][number]) => {
  const explicit = typeof binding.meta?.prop === 'string' ? binding.meta.prop : null;
  if (explicit) return explicit;
  const fallback = binding.id.split('.').pop()?.trim();
  return fallback || 'value';
};

const normalizeError = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return String(error);
};

const buildExecutionContext = (
  project: BuilderProject,
  runtimeEnv: Record<string, string>,
  runtimeState: Record<string, unknown>,
  dataStates: Record<string, RuntimeDataState>,
): RequestExecutionContext => ({
  project,
  runtimeEnv,
  runtimeState,
  dataStates,
});

type RuntimeProviderProps = PropsWithChildren<{
  project: BuilderProject;
  onNavigateProjectPage?: (pageId: string) => void;
  onOpenProjectOverlay?: (pageId: string) => void;
}>;

export function RuntimeProvider({
  project,
  children,
  onNavigateProjectPage,
  onOpenProjectOverlay,
}: RuntimeProviderProps) {
  const [dataStates, setDataStates] = useState<Record<string, RuntimeDataState>>({});
  const [runtimeState, setRuntimeState] = useState<Record<string, unknown>>({});
  const [modalState, setModalState] = useState<{ title?: string; description?: string } | null>(null);
  const projectRef = useRef(project);
  const runtimeStateRef = useRef<Record<string, unknown>>({});
  const dataStatesRef = useRef<Record<string, RuntimeDataState>>({});
  const runtimeEnv = useMemo(() => project.settings.runtimeEnv ?? {}, [project.settings.runtimeEnv]);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  useEffect(() => {
    runtimeStateRef.current = runtimeState;
  }, [runtimeState]);

  useEffect(() => {
    dataStatesRef.current = dataStates;
  }, [dataStates]);

  const setRuntimeValue = useCallback((key: string, value: unknown) => {
    setRuntimeState((current) => {
      const next = setValueAtPath(current, key, value);
      runtimeStateRef.current = next;
      return next;
    });
  }, []);

  const refreshSources = useCallback(async (sourceKeys?: string[]) => {
    const selected = sourceKeys && sourceKeys.length > 0
      ? projectRef.current.dataSources.filter((source) => sourceKeys.includes(source.id))
      : projectRef.current.dataSources;

    if (selected.length === 0) return;

    setDataStates((current) => {
      const next = { ...current };
      selected.forEach((source) => {
        next[source.id] = {
          ...next[source.id],
          status: 'loading',
        };
      });
      dataStatesRef.current = next;
      return next;
    });

    await Promise.all(selected.map(async (source) => {
      try {
        const data = await loadDataSource(
          source,
          buildExecutionContext(projectRef.current, runtimeEnv, runtimeStateRef.current, dataStatesRef.current),
        );
        setDataStates((current) => {
          const readyState: RuntimeDataState = {
            status: 'ready',
            data,
            loadedAt: new Date().toISOString(),
          };
          const next = {
            ...current,
            [source.id]: readyState,
          };
          dataStatesRef.current = next;
          return next;
        });
      } catch (error) {
        setDataStates((current) => {
          const next = {
            ...current,
            [source.id]: toErrorState(error),
          };
          dataStatesRef.current = next;
          return next;
        });
      }
    }));
  }, [runtimeEnv]);

  useEffect(() => {
    void refreshSources();
  }, [refreshSources, project.dataSources, runtimeEnv]);

  const runActions = useCallback(async (actions: NodeAction[]) => {
    for (const action of actions) {
      switch (action.type) {
        case 'navigate': {
          const config = getNavigateActionConfig(action.config);
          if (config.destinationType === 'project-page' && config.targetPageId) {
            onNavigateProjectPage?.(config.targetPageId);
            break;
          }

          const href = config.href;
          const target = config.target;
          if (href) window.open(href, target);
          break;
        }
        case 'refresh': {
          const sourceKeys = Array.isArray(action.config?.sourceKeys)
            ? action.config.sourceKeys.filter((value): value is string => typeof value === 'string')
            : undefined;
          await refreshSources(sourceKeys);
          break;
        }
        case 'request': {
          const sourceKey = typeof action.config?.sourceKey === 'string' ? action.config.sourceKey : '';
          const resultKey = typeof action.config?.resultKey === 'string' && action.config.resultKey
            ? action.config.resultKey
            : action.id;

          try {
            if (sourceKey) {
              await refreshSources([sourceKey]);
              const result = dataStatesRef.current[sourceKey]?.data;
              if (resultKey) setRuntimeValue(resultKey, result);
              break;
            }

            const data = await executeRequest(
              action.config,
              buildExecutionContext(projectRef.current, runtimeEnv, runtimeStateRef.current, dataStatesRef.current),
            );
            setRuntimeValue(resultKey, data);
          } catch (error) {
            setRuntimeValue(resultKey, { error: normalizeError(error) });
          }
          break;
        }
        case 'open-modal': {
          const config = getOpenModalActionConfig(action.config);
          if (config.modalType === 'project-overlay' && config.targetPageId) {
            onOpenProjectOverlay?.(config.targetPageId);
            break;
          }

          setModalState({
            title: config.title || action.label,
            description: config.description,
          });
          break;
        }
        case 'set-state': {
          const key = typeof action.config?.key === 'string' ? action.config.key : action.id;
          setRuntimeValue(key, action.config?.value);
          break;
        }
        case 'custom':
        default:
          break;
      }
    }
  }, [onNavigateProjectPage, onOpenProjectOverlay, refreshSources, runtimeEnv, setRuntimeValue]);

  const closeModal = useCallback(() => {
    setModalState(null);
  }, []);

  const resolveNodeProps = useCallback((node: BuilderNodeDocument) => {
    const resolved = { ...node.props } as Record<string, any>;

    node.bindings.forEach((binding) => {
      const sourceData = binding.sourceKey === 'state'
        ? runtimeState
        : binding.sourceKey === 'env'
          ? runtimeEnv
          : dataStates[binding.sourceKey]?.data;
      const value = getValueAtPath(sourceData, binding.path);
      const targetProp = getBindingTargetProp(binding);
      resolved[targetProp] = value ?? binding.fallback ?? resolved[targetProp];
    });

    const stateKey = typeof resolved.stateKey === 'string' && resolved.stateKey.trim()
      ? resolved.stateKey.trim()
      : '';

    if (stateKey) {
      const stateValue = getValueAtPath(runtimeState, stateKey);
      resolved.onValueChange = (value: unknown) => setRuntimeValue(stateKey, value);

      if (['text_input', 'number_input', 'textarea', 'select'].includes(node.type)) {
        resolved.value = stateValue == null ? '' : stateValue;
      }

      if (node.type === 'checkbox') {
        resolved.value = Array.isArray(stateValue) ? stateValue : [];
        resolved.name = stateKey.replace(/[^\w-]/g, '_');
      }

      if (node.type === 'radio') {
        resolved.value = typeof stateValue === 'string' ? stateValue : '';
        resolved.name = stateKey.replace(/[^\w-]/g, '_');
      }
    }

    if (node.actions.length > 0) {
      resolved.__actions = node.actions;
    }

    return resolved;
  }, [dataStates, runtimeEnv, runtimeState, setRuntimeValue]);

  const value = useMemo<RuntimeContextValue>(() => ({
    dataSources: project.dataSources,
    dataStates,
    runtimeState,
    runtimeEnv,
    modalState,
    resolveNodeProps,
    runActions,
    refreshSources,
    setRuntimeValue,
    closeModal,
  }), [closeModal, dataStates, modalState, project.dataSources, refreshSources, resolveNodeProps, runActions, runtimeEnv, runtimeState, setRuntimeValue]);

  getRuntimeContextBridge()[RUNTIME_CONTEXT_BRIDGE_KEY] = value;

  useEffect(() => () => {
    const bridge = getRuntimeContextBridge();
    if (bridge[RUNTIME_CONTEXT_BRIDGE_KEY] === value) {
      bridge[RUNTIME_CONTEXT_BRIDGE_KEY] = null;
    }
  }, [value]);

  return (
    <RuntimeContext.Provider value={value}>
      {children}
      {modalState && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-hr-border bg-hr-panel shadow-xl">
            <div className="px-5 py-4 border-b border-hr-border">
              <div className="text-base font-semibold text-hr-text">{modalState.title || 'Modal'}</div>
            </div>
            <div className="px-5 py-4 text-sm text-hr-muted">{modalState.description || 'No description provided.'}</div>
            <div className="px-5 py-4 border-t border-hr-border flex justify-end">
              <button
                className="px-4 py-2 rounded-md bg-hr-primary text-white text-sm"
                onClick={closeModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </RuntimeContext.Provider>
  );
}

export const useRuntime = () => {
  const context = useContext(RuntimeContext);
  const bridgeContext = getRuntimeContextBridge()[RUNTIME_CONTEXT_BRIDGE_KEY];
  if (!context && bridgeContext) {
    return bridgeContext;
  }
  if (!context) {
    throw new Error('useRuntime must be used within a RuntimeProvider');
  }
  return context;
};

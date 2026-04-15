import { nanoid } from 'nanoid';
import {
  DataBindingSchema,
  DataSourceSchema,
  NodeActionSchema,
  type BuilderDataSource,
  type DataBinding,
  type NodeAction,
  type RequestConfig,
} from '../schema/project';
import {
  mergeNavigateActionConfig,
  mergeOpenModalActionConfig,
} from './actionTargets';

const jsonLikePattern = /^(?:\{|\[|"|-?\d+(?:\.\d+)?$|true$|false$|null$)/;

const createDefaultRequestConfig = (): RequestConfig => ({
  url: '',
  method: 'GET',
  headers: {},
  query: {},
  body: {},
  pick: '',
  auth: {
    mode: 'none',
    placement: 'header',
    tokenTemplate: '',
    headerName: 'Authorization',
    queryName: 'api_key',
    prefix: 'Bearer ',
  },
  timeoutMs: 15000,
});

export const getDefaultDataSourceConfig = (kind: BuilderDataSource['kind']) => {
  if (kind === 'rest') {
    return createDefaultRequestConfig();
  }

  return {
    payload: {},
  };
};

export const createBuilderDataSource = (
  kind: BuilderDataSource['kind'] = 'mock',
): BuilderDataSource => DataSourceSchema.parse({
  id: `source_${nanoid(8)}`,
  name: kind === 'mock' ? 'Mock Source' : 'REST Source',
  kind,
  config: getDefaultDataSourceConfig(kind),
});

export const createBindingDraft = (sourceKey: string): DataBinding => DataBindingSchema.parse({
  id: `binding_${nanoid(8)}`,
  sourceKey,
  path: '',
  fallback: '',
  meta: {
    prop: 'text',
  },
});

const getDefaultActionConfig = (type: NodeAction['type']) => {
  switch (type) {
    case 'navigate':
      return mergeNavigateActionConfig({}, {
        destinationType: 'url',
        href: '',
        target: '_self',
        targetPageId: '',
      });
    case 'request':
      return {
        sourceKey: '',
        ...createDefaultRequestConfig(),
        resultKey: '',
      };
    case 'refresh':
      return {
        sourceKeys: [],
      };
    case 'open-modal':
      return mergeOpenModalActionConfig({}, {
        modalType: 'runtime-modal',
        title: 'Runtime action works',
        description: 'This modal is opened by the standard action editor.',
        targetPageId: '',
      });
    case 'set-state':
      return {
        key: 'draftKey',
        value: '',
      };
    case 'custom':
    default:
      return {};
  }
};

export const createActionDraft = (
  type: NodeAction['type'] = 'open-modal',
): NodeAction => NodeActionSchema.parse({
  id: `action_${nanoid(8)}`,
  type,
  label: type === 'open-modal' ? 'Open modal' : '',
  config: getDefaultActionConfig(type),
});

export const replaceActionType = (action: NodeAction, type: NodeAction['type']): NodeAction => {
  return NodeActionSchema.parse({
    id: action.id,
    label: action.label,
    type,
    config: getDefaultActionConfig(type),
  });
};

export const parseJsonText = <T>(text: string, fallback: T): T => {
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  return JSON.parse(trimmed) as T;
};

export const parseLooseValue = (text: string): unknown => {
  const trimmed = text.trim();
  if (!trimmed) return '';

  if (jsonLikePattern.test(trimmed)) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return text;
    }
  }

  return text;
};

export const stringifyLooseValue = (value: unknown) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
};

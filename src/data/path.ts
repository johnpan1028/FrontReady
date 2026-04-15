export const getValueAtPath = (input: unknown, path: string) => {
  if (!path) return input;
  const normalized = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);

  return normalized.reduce<unknown>((current, segment) => {
    if (current == null) return undefined;
    if (typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[segment];
  }, input);
};

export const setValueAtPath = (input: Record<string, unknown>, path: string, value: unknown) => {
  const normalized = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);

  if (normalized.length === 0) {
    return value as Record<string, unknown>;
  }

  const nextRoot = JSON.parse(JSON.stringify(input ?? {})) as Record<string, unknown>;
  let cursor: Record<string, unknown> = nextRoot;

  normalized.forEach((segment, index) => {
    const isLeaf = index === normalized.length - 1;
    if (isLeaf) {
      cursor[segment] = value;
      return;
    }

    const current = cursor[segment];
    if (!current || typeof current !== 'object' || Array.isArray(current)) {
      cursor[segment] = {};
    }
    cursor = cursor[segment] as Record<string, unknown>;
  });

  return nextRoot;
};

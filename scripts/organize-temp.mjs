import { constants as fsConstants } from 'node:fs';
import { access, mkdir, readdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const tempRoot = path.join(repoRoot, 'temp');

const ensureInsideRepo = (targetPath) => {
  const normalizedRoot = `${repoRoot}${path.sep}`;
  const normalizedTarget = path.resolve(targetPath);
  if (normalizedTarget !== repoRoot && !normalizedTarget.startsWith(normalizedRoot)) {
    throw new Error(`Refusing to touch path outside repo: ${normalizedTarget}`);
  }
};

const exists = async (targetPath) => {
  try {
    await access(targetPath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const ensureDir = async (targetPath) => {
  ensureInsideRepo(targetPath);
  await mkdir(targetPath, { recursive: true });
};

const getUniqueDestination = async (targetPath) => {
  if (!(await exists(targetPath))) return targetPath;

  const parsed = path.parse(targetPath);
  let attempt = 1;
  while (true) {
    const candidate = path.join(
      parsed.dir,
      `${parsed.name}-${new Date().toISOString().replace(/[:.]/g, '-')}-${attempt}${parsed.ext}`,
    );
    if (!(await exists(candidate))) return candidate;
    attempt += 1;
  }
};

const moveEntry = async (sourcePath, targetPath, busyEntries) => {
  ensureInsideRepo(sourcePath);
  ensureInsideRepo(targetPath);
  const destination = await getUniqueDestination(targetPath);

  try {
    await rename(sourcePath, destination);
    return destination;
  } catch (error) {
    const code = error && typeof error === 'object' ? error.code : undefined;
    if (code === 'EPERM' || code === 'EBUSY' || code === 'EACCES') {
      busyEntries.push(path.relative(repoRoot, sourcePath));
      return null;
    }
    throw error;
  }
};

const moveRootFilesByExtension = async ({
  extensions,
  destinationDir,
  excludeNames = [],
  busyEntries,
}) => {
  const rootEntries = await readdir(repoRoot, { withFileTypes: true });
  const moved = [];

  for (const entry of rootEntries) {
    if (!entry.isFile()) continue;
    if (excludeNames.includes(entry.name)) continue;
    if (!extensions.includes(path.extname(entry.name).toLowerCase())) continue;

    const sourcePath = path.join(repoRoot, entry.name);
    const targetPath = path.join(destinationDir, entry.name);
    const result = await moveEntry(sourcePath, targetPath, busyEntries);
    if (result) moved.push(path.relative(repoRoot, result));
  }

  return moved;
};

const moveNamedEntry = async ({ name, destinationDir, destinationName, busyEntries }) => {
  const sourcePath = path.join(repoRoot, name);
  if (!(await exists(sourcePath))) return null;

  const targetPath = path.join(destinationDir, destinationName ?? name);
  const result = await moveEntry(sourcePath, targetPath, busyEntries);
  return result ? path.relative(repoRoot, result) : null;
};

await ensureDir(tempRoot);
await ensureDir(path.join(tempRoot, 'captures', 'screenshots'));
await ensureDir(path.join(tempRoot, 'captures', 'snapshots'));
await ensureDir(path.join(tempRoot, 'logs'));
await ensureDir(path.join(tempRoot, 'backups', 'env'));
await ensureDir(path.join(tempRoot, 'backups', 'root'));

const busyEntries = [];

const movedScreenshots = await moveRootFilesByExtension({
  extensions: ['.png', '.jpg', '.jpeg', '.webp', '.gif'],
  destinationDir: path.join(tempRoot, 'captures', 'screenshots'),
  busyEntries,
});

const movedLogs = await moveRootFilesByExtension({
  extensions: ['.log'],
  destinationDir: path.join(tempRoot, 'logs'),
  busyEntries,
});

const movedSnapshots = await moveRootFilesByExtension({
  extensions: ['.md'],
  destinationDir: path.join(tempRoot, 'captures', 'snapshots'),
  excludeNames: ['README.md', 'DESIGN.md'],
  busyEntries,
});

const movedMetadata = await moveNamedEntry({
  name: 'metadata.json',
  destinationDir: path.join(tempRoot, 'backups', 'root'),
  busyEntries,
});

const movedEnvBackup = await moveNamedEntry({
  name: '.env.local.e2e-backup',
  destinationDir: path.join(tempRoot, 'backups', 'env'),
  busyEntries,
});

const movedArtifacts = await moveNamedEntry({
  name: 'artifacts',
  destinationDir: path.join(tempRoot, 'captures'),
  destinationName: 'artifacts',
  busyEntries,
});

const movedProjectBackup = await moveNamedEntry({
  name: 'project backup',
  destinationDir: path.join(tempRoot, 'backups'),
  destinationName: 'project-backup',
  busyEntries,
});

const movedTestResults = await moveNamedEntry({
  name: 'test-results',
  destinationDir: tempRoot,
  destinationName: 'test-results',
  busyEntries,
});

const summary = {
  screenshots: movedScreenshots.length,
  logs: movedLogs.length,
  snapshots: movedSnapshots.length,
  metadata: movedMetadata ? 1 : 0,
  envBackups: movedEnvBackup ? 1 : 0,
  artifactsDir: movedArtifacts ? 1 : 0,
  projectBackupDir: movedProjectBackup ? 1 : 0,
  testResultsDir: movedTestResults ? 1 : 0,
};

console.log(JSON.stringify({ summary, busyEntries }, null, 2));

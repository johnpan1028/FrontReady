import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const formatTimestamp = (value) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  const seconds = String(value.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
};

const sanitizeRefPart = (value) => {
  const normalized = value
    .trim()
    .replace(/^refs\/heads\//, '')
    .replace(/[^A-Za-z0-9._/-]+/g, '-')
    .replace(/\/+/g, '/')
    .replace(/^-+|-+$/g, '');

  return normalized.length > 0 ? normalized.replace(/\//g, '-') : 'detached';
};

const parseArgs = (argv) => {
  const options = {
    remote: 'origin',
    dryRun: false,
    branch: undefined,
    tag: undefined,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith('--remote=')) {
      options.remote = arg.slice('--remote='.length).trim() || options.remote;
      continue;
    }

    if (arg.startsWith('--branch=')) {
      options.branch = arg.slice('--branch='.length).trim() || undefined;
      continue;
    }

    if (arg.startsWith('--tag=')) {
      options.tag = arg.slice('--tag='.length).trim() || undefined;
      continue;
    }

    throw new Error(`Unsupported argument: ${arg}`);
  }

  return options;
};

const runGit = (args, options = {}) => {
  const result = spawnSync('git', args, {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: options.stdio ?? 'pipe',
  });

  if (result.status !== 0) {
    const details = [result.stdout, result.stderr]
      .filter(Boolean)
      .join('\n')
      .trim();
    throw new Error(`git ${args.join(' ')} failed${details ? `\n${details}` : ''}`);
  }

  return (result.stdout ?? '').trim();
};

const ensureGitRepo = () => {
  const inside = runGit(['rev-parse', '--is-inside-work-tree']);
  if (inside !== 'true') {
    throw new Error('Current directory is not inside a git repository.');
  }
};

const getWorkingTreeStatus = () => runGit(['status', '--porcelain']);

const ensureRemoteExists = (remote) => {
  runGit(['remote', 'get-url', remote]);
};

const ensureTagNotExists = (remote, tag) => {
  const localTag = spawnSync('git', ['rev-parse', '-q', '--verify', `refs/tags/${tag}`], {
    cwd: repoRoot,
    stdio: 'ignore',
  });

  if (localTag.status === 0) {
    throw new Error(`Tag already exists locally: ${tag}`);
  }

  const remoteTag = spawnSync('git', ['ls-remote', '--exit-code', '--tags', remote, `refs/tags/${tag}`], {
    cwd: repoRoot,
    stdio: 'ignore',
  });

  if (remoteTag.status === 0) {
    throw new Error(`Tag already exists on ${remote}: ${tag}`);
  }
};

const ensureBranchNotExists = (remote, branch) => {
  const remoteBranch = spawnSync('git', ['ls-remote', '--exit-code', '--heads', remote, `refs/heads/${branch}`], {
    cwd: repoRoot,
    stdio: 'ignore',
  });

  if (remoteBranch.status === 0) {
    throw new Error(`Branch already exists on ${remote}: ${branch}`);
  }
};

const options = parseArgs(process.argv.slice(2));

ensureGitRepo();
ensureRemoteExists(options.remote);

const workingTreeStatus = getWorkingTreeStatus();
if (!options.dryRun && workingTreeStatus.length > 0) {
  throw new Error('Working tree is not clean. Commit or stash changes before creating a GitHub backup.');
}

const currentBranch = runGit(['branch', '--show-current']) || 'detached';
const head = runGit(['rev-parse', '--short', 'HEAD']);
const timestamp = formatTimestamp(new Date());
const branchSlug = sanitizeRefPart(currentBranch);

const backupBranch = options.branch ?? `backup/${branchSlug}-${timestamp}`;
const backupTag = options.tag ?? `backup-${branchSlug}-${timestamp}`;

ensureBranchNotExists(options.remote, backupBranch);
ensureTagNotExists(options.remote, backupTag);

const tagMessage = `Backup snapshot from ${currentBranch} at ${timestamp}`;

if (options.dryRun) {
  console.log(JSON.stringify({
    remote: options.remote,
    currentBranch,
    commit: head,
    dirtyWorkingTree: workingTreeStatus.length > 0,
    backupBranch,
    backupTag,
    tagMessage,
  }, null, 2));
  process.exit(0);
}

runGit(['tag', '-a', backupTag, '-m', tagMessage]);
runGit(['push', options.remote, `HEAD:refs/heads/${backupBranch}`, `refs/tags/${backupTag}`], {
  stdio: 'inherit',
});

console.log(JSON.stringify({
  remote: options.remote,
  currentBranch,
  commit: head,
  backupBranch,
  backupTag,
}, null, 2));

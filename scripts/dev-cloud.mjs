import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const nodeExec = process.execPath;
const tsxCli = path.resolve(repoRoot, 'node_modules/tsx/dist/cli.mjs');
const viteCli = path.resolve(repoRoot, 'node_modules/vite/bin/vite.js');

const cloudPort = process.env.BUILDER_CLOUD_PORT ?? '3001';
const frontendPort = process.env.BUILDER_CLOUD_UI_PORT ?? '3002';

const sharedEnv = {
  ...process.env,
  VITE_BUILDER_GATEWAY_MODE: 'cloud',
  VITE_BUILDER_API_BASE_URL: `http://127.0.0.1:${cloudPort}`,
  VITE_BUILDER_AUTH_MODE: process.env.VITE_BUILDER_AUTH_MODE ?? 'bearer',
  VITE_BUILDER_VIEWER_NAME: process.env.VITE_BUILDER_VIEWER_NAME ?? 'Cloud Builder Demo',
  BUILDER_CLOUD_PORT: cloudPort,
};

const processes = [];
let isShuttingDown = false;

const shutdown = (code = 0) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => {
    for (const child of processes) {
      if (!child.killed) {
        child.kill('SIGKILL');
      }
    }
    process.exit(code);
  }, 1200).unref();
};

const spawnProcess = (label, args, env = sharedEnv) => {
  const child = spawn(nodeExec, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    env,
  });

  child.on('exit', (code) => {
    if (!isShuttingDown) {
      console.log(`[dev-cloud] ${label} exited with code ${code ?? 0}`);
      shutdown(code ?? 0);
    }
  });

  processes.push(child);
  return child;
};

console.log(`[dev-cloud] mock cloud API: http://127.0.0.1:${cloudPort}`);
console.log(`[dev-cloud] cloud UI: http://127.0.0.1:${frontendPort}`);

spawnProcess('mock-cloud', [tsxCli, 'server/mockCloudServer.ts']);
spawnProcess('vite-cloud', [viteCli, '--port', frontendPort, '--host', '0.0.0.0', '--mode', 'cloud']);

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

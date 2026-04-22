import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { chromium } from 'playwright';

const appUrl = process.env.KIT_STUDIO_VERIFY_URL ?? 'http://127.0.0.1:3000/';
const viewport = { width: 1600, height: 1000 };
const tempDir = path.resolve('temp');
const screenshotPath = path.join(tempDir, 'kit-studio-slot-shell-verify.png');
const cacheRoot = path.join(os.homedir(), '.cache', 'frontaiready-playwright-deps');
const debDir = path.join(cacheRoot, 'debs');
const rootDir = path.join(cacheRoot, 'root');
const libDir = path.join(rootDir, 'usr', 'lib', 'x86_64-linux-gnu');
const requiredAptPackages = ['libnspr4', 'libnss3', 'libasound2t64'];

const run = (command, args, options = {}) => execFileSync(command, args, {
  encoding: 'utf8',
  stdio: ['ignore', 'pipe', 'pipe'],
  ...options,
});

const hasCommand = (command) => {
  try {
    run('bash', ['-lc', `command -v ${command}`]);
    return true;
  } catch {
    return false;
  }
};

const withPlaywrightLibraryPath = (env = process.env) => ({
  ...env,
  LD_LIBRARY_PATH: [
    existsSync(libDir) ? libDir : null,
    env.LD_LIBRARY_PATH,
  ].filter(Boolean).join(':'),
});

const getMissingBrowserLibraries = (env = process.env) => {
  if (process.platform !== 'linux') return [];

  const output = run('ldd', [chromium.executablePath()], { env });
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes('not found'));
};

const ensurePlaywrightBrowserDeps = () => {
  if (process.platform !== 'linux') return process.env;

  let browserEnv = withPlaywrightLibraryPath();
  let missingLibraries = getMissingBrowserLibraries(browserEnv);
  if (missingLibraries.length === 0) return browserEnv;

  if (!hasCommand('apt') || !hasCommand('dpkg-deb')) {
    throw new Error([
      'Playwright Chromium 缺少系统库，且当前环境没有 apt / dpkg-deb，无法自动补齐。',
      ...missingLibraries.map((line) => `- ${line}`),
    ].join('\n'));
  }

  mkdirSync(debDir, { recursive: true });
  mkdirSync(rootDir, { recursive: true });
  run('apt', ['download', ...requiredAptPackages], { cwd: debDir, stdio: 'pipe' });

  readdirSync(debDir)
    .filter((fileName) => fileName.endsWith('.deb'))
    .forEach((fileName) => {
      run('dpkg-deb', ['-x', path.join(debDir, fileName), rootDir]);
    });

  browserEnv = withPlaywrightLibraryPath();
  missingLibraries = getMissingBrowserLibraries(browserEnv);
  if (missingLibraries.length > 0) {
    throw new Error([
      'Playwright Chromium 依赖自动补齐后仍缺库：',
      ...missingLibraries.map((line) => `- ${line}`),
    ].join('\n'));
  }

  return browserEnv;
};

const assertServerReady = async () => {
  const response = await fetch(appUrl);
  if (!response.ok) {
    throw new Error(`Kit Studio 页面未就绪：${appUrl} 返回 ${response.status}`);
  }
};

const clickCreateProjectButton = async (page) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const button = page.getByRole('button', { name: 'Create a new project' });
    await button.waitFor({ state: 'visible', timeout: 10_000 });

    try {
      await button.click({ timeout: 5_000 });
      return;
    } catch {
      await page.waitForTimeout(800);
    }
  }

  throw new Error('无法稳定点击 Create a new project 按钮。');
};

const ensureProjectInspectorVisible = async (page) => {
  if (await page.locator('button[aria-label="Create a new project"]').count() > 0) return;

  const projectTabs = await page.getByRole('button', { name: 'Project' }).all();
  if (projectTabs.length === 0) {
    throw new Error('未找到右侧 Project 标签。');
  }

  await projectTabs[projectTabs.length - 1].click();
  await page.waitForTimeout(800);
};

const ensureProjectReady = async (page) => {
  if (await page.getByText('Create your first project').count() === 0) return;

  await ensureProjectInspectorVisible(page);
  await clickCreateProjectButton(page);
  const createButton = page.getByRole('button', {
    name: /Create Blank Desktop Project|Create Guided Desktop Project/,
  });
  await createButton.waitFor({ state: 'visible', timeout: 10_000 });
  await createButton.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1200);
};

const switchToKitStudio = async (page) => {
  await page.getByLabel('Kit studio').click({ timeout: 10_000 });
  await page.waitForTimeout(600);
};

const assertMinimalControlLibrary = async (page) => {
  const labels = (await page.locator('.droppableElement').allInnerTexts())
    .map((label) => label.replace(/\s+/g, ' ').trim());

  if (!labels.some((label) => label.includes('Slot Shell'))) {
    throw new Error(`左侧栏缺少 Slot Shell：${JSON.stringify(labels, null, 2)}`);
  }

  const forbiddenControls = labels.filter((label) => (
    label.includes('Heading')
    || label.includes('Paragraph')
    || label.includes('Inline Shell')
    || label.includes('Icon')
  ));

  if (forbiddenControls.length > 0) {
    throw new Error(`左侧 Control 入口仍暴露旧基础控件：${forbiddenControls.join(', ')}`);
  }
};

const dragSlotShellIntoKitStudio = async (page) => {
  const source = page.locator('.droppableElement', { hasText: 'Slot Shell' }).first();
  const sourceBox = await source.boundingBox({ timeout: 10_000 });
  if (!sourceBox) throw new Error('未找到左侧栏 Slot Shell。');

  const boardBox = await page.locator('.react-flow').first().boundingBox({ timeout: 10_000 });
  if (!boardBox) throw new Error('未找到 Kit Studio 画布。');

  const targetX = boardBox.x + Math.min(320, Math.max(180, boardBox.width * 0.32));
  const targetY = boardBox.y + Math.min(260, Math.max(180, boardBox.height * 0.28));

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(1000);
};

const assertShellInspector = async (page) => {
  const inspector = page.locator('.builder-inspector-body');
  await inspector.waitFor({ state: 'visible', timeout: 10_000 });
  const text = await inspector.innerText();

  if (!text.includes('Rows') || !text.includes('Columns')) {
    throw new Error(`Slot Shell 本体面板未出现 Rows / Columns：\n${text}`);
  }

  if (text.includes('Min Cols') || text.includes('Min Rows') || text.includes('Pixel Constraints')) {
    throw new Error(`Slot Shell 仍暴露了旧尺寸逻辑：\n${text}`);
  }
};

const assertSlotInspector = async (page) => {
  const addSlotCell = page.locator('[title="Add slot atom"]').first();
  await addSlotCell.evaluate((node) => {
    (node instanceof HTMLElement ? node : node.parentElement)?.click();
  });
  await page.waitForTimeout(400);

  const inspector = page.locator('.builder-inspector-body');
  const text = await inspector.innerText();

  const requiredLabels = ['Type', 'Size', 'Span', 'Align'];
  const missing = requiredLabels.filter((label) => !text.includes(label));
  if (missing.length > 0) {
    throw new Error(`Slot 面板缺少字段：${missing.join(', ')}\n${text}`);
  }
};

const assertReturnToShellInspector = async (page) => {
  const shellNode = page.locator('[data-builder-node-type="slot_shell"]').first();
  await shellNode.evaluate((node) => {
    (node instanceof HTMLElement ? node : node.parentElement)?.click();
  });
  await page.waitForTimeout(400);

  const text = await page.locator('.builder-inspector-body').innerText();
  if (!text.includes('Rows') || !text.includes('Columns')) {
    throw new Error(`点击 Slot Shell 本体后未回到结构面板：\n${text}`);
  }
};

const assertSlotShellRendered = async (page) => {
  const addSlotCell = page.locator('[title="Add slot atom"]').first();
  await addSlotCell.waitFor({ state: 'visible', timeout: 10_000 });
  const count = await page.locator('[title="Add slot atom"]').count();
  if (count !== 1) {
    throw new Error(`默认 Slot Shell 不是 1x1 空槽，当前空槽数量：${count}`);
  }
};

async function main() {
  await assertServerReady();
  const browserEnv = ensurePlaywrightBrowserDeps();
  const browser = await chromium.launch({
    headless: true,
    env: browserEnv,
  });

  try {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();

    await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 30_000 });
    await page.waitForTimeout(1200);
    await ensureProjectReady(page);
    await switchToKitStudio(page);
    await assertMinimalControlLibrary(page);
    await dragSlotShellIntoKitStudio(page);
    await assertSlotShellRendered(page);
    await assertShellInspector(page);
    await assertSlotInspector(page);
    await assertReturnToShellInspector(page);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    console.log('Kit Studio slot shell browser verify passed.');
    console.log(`Screenshot: ${screenshotPath}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

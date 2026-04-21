import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { chromium } from 'playwright';

const appUrl = process.env.KIT_STUDIO_VERIFY_URL ?? 'http://127.0.0.1:3002/';
const viewport = { width: 1600, height: 1000 };
const tempDir = path.resolve('temp');
const screenshotPath = path.join(tempDir, 'kit-studio-inspector-verify.png');
const rootPreviewScreenshotPath = path.join(tempDir, 'kit-studio-root-preview-width-verify.png');
const cacheRoot = path.join(os.homedir(), '.cache', 'frontaiready-playwright-deps');
const debDir = path.join(cacheRoot, 'debs');
const rootDir = path.join(cacheRoot, 'root');
const libDir = path.join(rootDir, 'usr', 'lib', 'x86_64-linux-gnu');
const requiredAptPackages = ['libnspr4', 'libnss3', 'libasound2t64'];
const forbiddenInspectorLabels = [
  'Component ID',
  'Component Type',
  'Runtime Type',
  'Project ID',
  'Shell ID',
  'Relation ID',
  'Relation Type',
  'Code',
];
const forbiddenSourceLabels = [
  'Component ID',
  'Component Type',
  'Runtime Type',
  'Project ID',
  'Shell ID',
  'Relation ID',
  'Relation Type',
  'codeSection',
  'readonlyField',
];

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

const resolveAppUrl = (suffix = '') => new URL(suffix, appUrl).toString();

const assertServerReady = async () => {
  const response = await fetch(appUrl);
  if (!response.ok) {
    throw new Error(`3002 页面未就绪：${appUrl} 返回 ${response.status}`);
  }
};

const assertServedSourceClean = async () => {
  const sourcePaths = [
    'src/components/builder-page/WidgetInspectorPanel.tsx',
    'src/kit/definitions/widgetDefinitions.ts',
    'src/components/BuilderShellPanels.tsx',
  ];

  for (const sourcePath of sourcePaths) {
    const response = await fetch(resolveAppUrl(sourcePath));
    if (!response.ok) {
      throw new Error(`无法读取开发服源码 ${sourcePath}：${response.status}`);
    }

    const source = await response.text();
    const found = forbiddenSourceLabels.filter((label) => source.includes(label));
    if (found.length > 0) {
      throw new Error(`开发服源码 ${sourcePath} 仍包含禁用字段：${found.join(', ')}`);
    }
  }
};

const dragCardShellIntoKitStudio = async (page) => {
  await page.getByLabel('Kit studio').click({ timeout: 10_000 });
  await page.waitForTimeout(500);

  const source = page.locator('.droppableElement', { hasText: 'Card Shell' }).first();
  const sourceBox = await source.boundingBox({ timeout: 10_000 });
  if (!sourceBox) {
    throw new Error('未找到左侧栏 Card Shell 拖拽源。');
  }

  const boardBox = await page.locator('.react-flow').first().boundingBox({ timeout: 10_000 });
  if (!boardBox) {
    throw new Error('未找到 Kit Studio 画布。');
  }

  const targetX = boardBox.x + Math.min(340, Math.max(180, boardBox.width * 0.35));
  const targetY = boardBox.y + Math.min(300, Math.max(180, boardBox.height * 0.35));

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(1_000);
};

const dragHeadingIntoKitStudio = async (page) => {
  await page.getByLabel('Kit studio').click({ timeout: 10_000 });
  await page.waitForTimeout(500);

  const source = page.locator('.droppableElement', { hasText: 'Heading' }).first();
  const sourceBox = await source.boundingBox({ timeout: 10_000 });
  if (!sourceBox) {
    throw new Error('未找到左侧栏 Heading 拖拽源。');
  }

  const boardBox = await page.locator('.react-flow').first().boundingBox({ timeout: 10_000 });
  if (!boardBox) {
    throw new Error('未找到 Kit Studio 画布。');
  }

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(boardBox.x + 360, boardBox.y + 260, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(1_000);
};

const dragPaletteItemToBoard = async (page, label, targetX, targetY) => {
  const source = page.locator('.droppableElement', { hasText: label }).first();
  const sourceBox = await source.boundingBox({ timeout: 10_000 });
  if (!sourceBox) {
    throw new Error(`未找到左侧栏 ${label} 拖拽源。`);
  }

  await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetX, targetY, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(1_000);
};

const assertRootPreviewTracksUpdatedWidth = async (page) => {
  await page.goto(`${appUrl}?kit_root_preview_verify=${Date.now()}`, {
    waitUntil: 'networkidle',
    timeout: 30_000,
  });

  await dragHeadingIntoKitStudio(page);

  const colsInput = page.locator('.builder-inspector-body input[type="number"]').first();
  await colsInput.fill('8');
  await colsInput.press('Enter');
  await page.waitForTimeout(800);

  const handle = page.locator('.react-flow__node-master.selected .external-move-handle').first();
  const handleBox = await handle.boundingBox({ timeout: 10_000 });
  if (!handleBox) {
    throw new Error('未找到已选控件的外部拖动柄。');
  }

  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + 180, handleBox.y + 120, { steps: 14 });
  await page.waitForTimeout(300);

  const metrics = await page.evaluate(() => {
    const selectors = [
      '.kit-board-drop-preview',
      '.react-flow__node-preview',
      '[data-widget-drag-proxy="true"]',
      '.widget-wrapper[data-widget-dragging="true"]',
    ];

    return selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)).map((element) => {
      const rect = element.getBoundingClientRect();
      return {
        selector,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    }));
  });

  const rootPreview = metrics.find((entry) => entry.selector === '.kit-board-drop-preview');
  const dragProxy = metrics.find((entry) => entry.selector === '[data-widget-drag-proxy="true"]');

  await page.screenshot({ path: rootPreviewScreenshotPath, fullPage: true });
  await page.mouse.up();

  if (!rootPreview || !dragProxy) {
    throw new Error(`缺少根画布预览或拖动代理：${JSON.stringify(metrics, null, 2)}`);
  }

  if (rootPreview.width !== 224 || dragProxy.width !== 224 || rootPreview.width !== dragProxy.width) {
    throw new Error(`改宽度后二次拖动的预览宽度未同步：${JSON.stringify(metrics, null, 2)}`);
  }

  return metrics;
};

const assertInspectorClean = async (page) => {
  const inspector = page.locator('.builder-inspector-body');
  const inspectorText = await inspector.innerText({ timeout: 10_000 });

  if (!inspectorText.includes('CARD') || !inspectorText.includes('Card Shell')) {
    throw new Error(`未进入 Card Shell 右侧属性栏，当前右栏文本：\n${inspectorText}`);
  }

  const found = forbiddenInspectorLabels.filter((label) => inspectorText.includes(label));
  if (found.length > 0) {
    throw new Error(`右侧属性栏仍包含禁用字段：${found.join(', ')}`);
  }

  return inspectorText;
};

const main = async () => {
  mkdirSync(tempDir, { recursive: true });

  const browserEnv = ensurePlaywrightBrowserDeps();
  await assertServerReady();
  await assertServedSourceClean();

  const browser = await chromium.launch({
    headless: true,
    env: browserEnv,
  });

  try {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const client = await context.newCDPSession(page);
    await client.send('Network.enable');
    await client.send('Network.setCacheDisabled', { cacheDisabled: true });

    await page.goto(`${appUrl}?kit_studio_verify=${Date.now()}`, {
      waitUntil: 'networkidle',
      timeout: 30_000,
    });
    await dragCardShellIntoKitStudio(page);
    const inspectorText = await assertInspectorClean(page);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    const rootPreviewMetrics = await assertRootPreviewTracksUpdatedWidth(page);

    console.log('Kit Studio inspector browser verify passed.');
    console.log(`URL: ${appUrl}`);
    console.log(`Screenshot: ${screenshotPath}`);
    console.log(`Root preview screenshot: ${rootPreviewScreenshotPath}`);
    console.log('Inspector excerpt:');
    console.log(inspectorText.slice(0, 1_200));
    console.log('Root preview metrics:');
    console.log(JSON.stringify(rootPreviewMetrics, null, 2));
  } finally {
    await browser.close();
  }
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

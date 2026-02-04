import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const baseUrl = 'http://localhost:3000';
const credentials = {
  email: 'aconnellan@tql.com',
  password: 'Drodo4492'
};

const consoleLogs = [];
const serverLogs = [];

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');

async function startDevServer() {
  return new Promise((resolve, reject) => {
    const serverProcess = spawn('npm', ['run', 'dev'], {
      cwd: projectRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let resolved = false;
    const readyRegex = /Local:\s+http:\/\/localhost:3000/;
    const timeout = setTimeout(() => {
      if (!resolved) {
        serverProcess.kill('SIGINT');
        reject(new Error('Dev server startup timed out'));
      }
    }, 45000);

    const handleOutput = (chunk) => {
      const text = chunk.toString();
      serverLogs.push(text.trim());
      if (!resolved && readyRegex.test(text)) {
        resolved = true;
        clearTimeout(timeout);
        resolve(serverProcess);
      }
    };

    serverProcess.stdout.on('data', handleOutput);
    serverProcess.stderr.on('data', handleOutput);

    serverProcess.on('exit', (code) => {
      if (!resolved) {
        clearTimeout(timeout);
        reject(new Error(`Dev server exited early with code ${code}`));
      }
    });
  });
}

async function capturePage(stepName, page, url, expectations) {
  const step = { name: stepName, url, success: false, details: {} };
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    if (expectations?.waitFor) {
      await page.waitForSelector(expectations.waitFor, { timeout: expectations.timeout ?? 15000 });
    }
    if (expectations?.collect) {
      step.details = await expectations.collect(page);
    }
    step.success = true;
  } catch (error) {
    step.error = error.message;
  }
  return step;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', (msg) => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()?.url || null
    });
  });

  const results = [];
  let devServer;

  try {
    devServer = await startDevServer();

    // Login
    await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    await Promise.all([
      page.waitForNavigation({ url: /dashboard/, timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);
    results.push({ name: 'login', success: true });

    // Lanes page
    results.push(await capturePage('lanes', page, `${baseUrl}/lanes`, {
      waitFor: 'text=Lane Management',
      collect: async (p) => {
        const laneEntries = p.locator('div[id^="lane-"]');
        const laneCount = await laneEntries.count();
        const headline = await p.locator('h1').first().textContent();
        const hasCincinnati = await p.locator('text=Cincinnati').count();
        return {
          laneCount,
          headline,
          hasCincinnati: hasCincinnati > 0
        };
      }
    }));

    // Post Options page
    results.push(await capturePage('post-options', page, `${baseUrl}/post-options`, {
      waitFor: 'text=Post Options',
      collect: async (p) => {
        const summary = await p.locator('text=Showing').first().textContent().catch(() => null);
        const laneRowMatches = await p.locator('text=Cincinnati').count().catch(() => 0);
        return {
          summary,
          hasLane: laneRowMatches > 0
        };
      }
    }));

    // Recap page
    results.push(await capturePage('recap', page, `${baseUrl}/recap`, {
      waitFor: 'text=Selected Cities',
      collect: async (p) => {
        const cardCount = await p.locator('.card').count();
        const pairRows = p.locator('table tbody tr');
        const pairCount = await pairRows.count();
        const mileSnippets = await pairRows.locator('td:nth-child(2) div:nth-child(2), td:nth-child(4) div:nth-child(2)').allTextContents();
        const milesDetected = mileSnippets.some((text) => /mi/.test(text));
        return {
          cardCount,
          pairCount,
          milesDetected
        };
      }
    }));
  } catch (error) {
    results.push({ name: 'fatal', success: false, error: error.message });
  } finally {
    await browser.close();
    if (devServer) {
      devServer.kill('SIGINT');
      await new Promise((resolve) => devServer.once('exit', resolve));
    }
  }

  const warnings = consoleLogs.filter((log) => ['warning', 'error'].includes(log.type));
  const severeLogs = consoleLogs.filter((log) => log.type === 'error');

  console.log(JSON.stringify({ results, consoleLogs, warningsCount: warnings.length, errorCount: severeLogs.length, serverLogs }, null, 2));
  })();

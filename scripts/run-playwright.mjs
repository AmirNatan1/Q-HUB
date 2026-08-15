import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { dev } from "astro";

const rootDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const host = "127.0.0.1";
const playwrightCliPath = join(
  rootDirectory,
  "node_modules",
  "@playwright",
  "test",
  "cli.js",
);
const signalExitCodes = { SIGINT: 130, SIGTERM: 143 };

let activeChild;
let activeChildExit;
let activeServer;
let cleanupPromise;
let interruptedBy;

function childIsRunning() {
  return activeChild
    && activeChild.exitCode === null
    && activeChild.signalCode === null;
}

async function stopChild(signal = "SIGTERM") {
  if (!childIsRunning()) return;
  activeChild.kill(signal);
  await Promise.race([
    activeChildExit?.catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);
  if (childIsRunning()) activeChild.kill("SIGKILL");
}

function cleanup(signal) {
  if (!cleanupPromise) {
    cleanupPromise = (async () => {
      await stopChild(signal);
      await activeServer?.stop();
    })();
  }
  return cleanupPromise;
}

function handleSignal(signal) {
  const exitCode = signalExitCodes[signal];
  if (interruptedBy) process.exit(exitCode);
  interruptedBy = signal;
  if (childIsRunning()) activeChild.kill(signal);
  void cleanup(signal).then(
    () => process.exit(exitCode),
    (error) => {
      console.error(error);
      process.exit(1);
    },
  );
}

const signalHandlers = Object.keys(signalExitCodes).map((signal) => {
  const handler = () => handleSignal(signal);
  process.on(signal, handler);
  return [signal, handler];
});

function removeSignalHandlers() {
  for (const [signal, handler] of signalHandlers) process.off(signal, handler);
}

async function reservePort() {
  return new Promise((resolve, reject) => {
    const socket = createServer();
    socket.once("error", reject);
    socket.listen(0, host, () => {
      const address = socket.address();
      const port = typeof address === "object" && address ? address.port : undefined;
      socket.close((error) => {
        if (error) reject(error);
        else if (port) resolve(port);
        else reject(new Error("Unable to reserve an isolated Playwright server port."));
      });
    });
  });
}

async function waitForServer(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // The in-process Astro server may need a brief startup interval.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for the Playwright server at ${url}.`);
}

async function run() {
  try {
    const port = await reservePort();
    activeServer = await dev({
      root: rootDirectory,
      server: { host, port },
      logLevel: "silent",
    });
    const activePort = activeServer.address.port;
    await waitForServer(`http://${host}:${activePort}/`);
    activeChild = spawn(
      process.execPath,
      [playwrightCliPath, "test", ...process.argv.slice(2)],
      {
        cwd: rootDirectory,
        env: {
          ...process.env,
          PLAYWRIGHT_EXTERNAL_SERVER: "1",
          PORT: String(activePort),
        },
        stdio: "inherit",
        windowsHide: true,
      },
    );
    activeChildExit = new Promise((resolve, reject) => {
      activeChild.once("error", reject);
      activeChild.once("exit", (code, signal) => {
        if (signal) reject(new Error(`Playwright exited from signal ${signal}.`));
        else resolve(code ?? 1);
      });
    });
    const exitCode = await activeChildExit;
    process.exitCode = exitCode;
  } finally {
    await cleanup(interruptedBy);
    if (!interruptedBy) removeSignalHandlers();
  }
}

await run();

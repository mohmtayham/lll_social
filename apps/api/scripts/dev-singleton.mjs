// import fs from 'node:fs';
// import path from 'node:path';
// import { fileURLToPath } from 'node:url';
// import { spawn, spawnSync } from 'node:child_process';

// const __filename = fileURLToPath(import.meta.url);
// const scriptsDir = path.dirname(__filename);
// const projectRoot = path.resolve(scriptsDir, '..');
// const lockFilePath = path.join(projectRoot, '.dev-server.lock');

// function isPidRunning(pid) {
//   if (!Number.isInteger(pid) || pid <= 0) {
//     return false;
//   }

//   try {
//     process.kill(pid, 0);
//     return true;
//   } catch {
//     return false;
//   }
// }

// function readLock() {
//   try {
//     const raw = fs.readFileSync(lockFilePath, 'utf8');
//     return JSON.parse(raw);
//   } catch {
//     return null;
//   }
// }

// function writeLock(pid) {
//   fs.writeFileSync(
//     lockFilePath,
//     JSON.stringify({ pid, createdAt: new Date().toISOString() }),
//     'utf8',
//   );
// }

// function removeLock() {
//   try {
//     fs.unlinkSync(lockFilePath);
//   } catch {
//     // Lock may not exist; no action needed.
//   }
// }

// const existingLock = readLock();
// if (existingLock?.pid && isPidRunning(Number(existingLock.pid))) {
//   console.log(`[dev] API dev server is already running (PID ${existingLock.pid}).`);
//   process.exit(0);
// }

// if (existingLock) {
//   removeLock();
// }

// const freePortScriptPath = path.join(scriptsDir, 'free-port.mjs');
// const freePortResult = spawnSync(process.execPath, [freePortScriptPath], {
//   cwd: projectRoot,
//   stdio: 'inherit',
//   env: process.env,
// });

// if ((freePortResult.status ?? 0) !== 0) {
//   process.exit(freePortResult.status ?? 1);
// }

// const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
// const child = spawn(pnpmCommand, ['exec', 'nest', 'start', '--watch'], {
//   cwd: projectRoot,
//   stdio: 'inherit',
//   env: process.env,
//   shell: true,
// });

// if (!child.pid) {
//   console.error('[dev] Failed to start Nest dev process.');
//   process.exit(1);
// }

// writeLock(child.pid);

// let cleanedUp = false;
// function cleanup() {
//   if (!cleanedUp) {
//     cleanedUp = true;
//     removeLock();
//   }
// }

// process.on('SIGINT', () => {
//   child.kill('SIGINT');
// });

// process.on('SIGTERM', () => {
//   child.kill('SIGTERM');
// });

// process.on('exit', cleanup);

// child.on('exit', (code) => {
//   cleanup();
//   process.exit(code ?? 0);
// });

// child.on('error', (error) => {
//   cleanup();
//   console.error('[dev] Child process failed:', error);
//   process.exit(1);
// });
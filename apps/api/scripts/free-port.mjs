import { execSync } from 'node:child_process';

const DEFAULT_PORT = 8000;
const rawPort = process.argv[2] ?? process.env.PORT ?? String(DEFAULT_PORT);
const port = Number(rawPort);

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
	console.error(`[predev] Invalid port: ${rawPort}`);
	process.exit(1);
}

function uniqueNumbers(values) {
	return [...new Set(values.filter((value) => Number.isInteger(value)))];
}

function tryExec(command) {
	try {
		return execSync(command, {
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		});
	} catch {
		return '';
	}
}

function getListeningPidsWindows(targetPort) {
	const output = tryExec(
		`netstat -ano -p tcp | findstr LISTENING | findstr :${targetPort}`,
	);

	const pids = output
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const parts = line.split(/\s+/);
			return Number(parts[parts.length - 1]);
		});

	return uniqueNumbers(pids);
}

function getListeningPidsUnix(targetPort) {
	const output = tryExec(`lsof -ti tcp:${targetPort} -sTCP:LISTEN`);
	const pids = output
		.split(/\r?\n/)
		.map((line) => Number(line.trim()))
		.filter(Number.isInteger);

	return uniqueNumbers(pids);
}

function isNodeProcessWindows(pid) {
	const output = tryExec(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`).trim();
	return output.toLowerCase().startsWith('"node.exe"');
}

function isNodeProcessUnix(pid) {
	const output = tryExec(`ps -p ${pid} -o comm=`).trim().toLowerCase();
	return output.includes('node');
}

function killWindowsPid(pid) {
	try {
		execSync(`taskkill /PID ${pid} /T /F`, {
			stdio: ['ignore', 'ignore', 'ignore'],
		});
		return true;
	} catch {
		return false;
	}
}

function killUnixPid(pid) {
	try {
		process.kill(pid, 'SIGTERM');
		return true;
	} catch {
		return false;
	}
}

const isWindows = process.platform === 'win32';
const getListeningPids = isWindows ? getListeningPidsWindows : getListeningPidsUnix;
const isNodeProcess = isWindows ? isNodeProcessWindows : isNodeProcessUnix;
const killPid = isWindows ? killWindowsPid : killUnixPid;

const initialPids = getListeningPids(port);
if (initialPids.length === 0) {
	console.log(`[predev] Port ${port} is free.`);
	process.exit(0);
}

console.log(`[predev] Port ${port} is in use by PID(s): ${initialPids.join(', ')}`);

const blockedPids = [];
const failedPids = [];

for (const pid of initialPids) {
	if (pid === process.pid) {
		continue;
	}

	if (!isNodeProcess(pid)) {
		blockedPids.push(pid);
		continue;
	}

	if (killPid(pid)) {
		console.log(`[predev] Stopped stale Node PID ${pid}.`);
	} else {
		failedPids.push(pid);
	}
}

if (blockedPids.length > 0) {
	console.error(
		`[predev] Port ${port} is used by non-Node PID(s): ${blockedPids.join(', ')}. Stop them manually or set PORT.`,
	);
	process.exit(1);
}

if (failedPids.length > 0) {
	console.error(`[predev] Failed to stop PID(s): ${failedPids.join(', ')}.`);
	process.exit(1);
}

const remainingPids = getListeningPids(port);
if (remainingPids.length > 0) {
	console.error(`[predev] Port ${port} is still in use by PID(s): ${remainingPids.join(', ')}.`);
	process.exit(1);
}

console.log(`[predev] Port ${port} is ready.`);
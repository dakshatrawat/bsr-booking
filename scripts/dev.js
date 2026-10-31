// Starts the Spring backend and Angular frontend together: `npm run dev` from the repo root.
// Ctrl+C stops both.
const { spawn, execSync } = require('child_process');
const path = require('path');

const fs = require('fs');
const os = require('os');

const root = path.resolve(__dirname, '..');
const isWin = process.platform === 'win32';
const REQUIRED_JAVA = 25; // keep in sync with java.version in spring-backend/pom.xml

// Major version of the JDK at `home`, read from its `release` file (null if not a JDK)
function jdkMajor(home) {
  try {
    const release = fs.readFileSync(path.join(home, 'release'), 'utf8');
    const match = release.match(/JAVA_VERSION="(\d+)/);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

// Picks a JDK >= REQUIRED_JAVA: JAVA_HOME if it qualifies, else one from the usual install dirs
function findJdkHome() {
  const candidates = [process.env.JAVA_HOME];
  const dirs = [path.join(os.homedir(), '.jdks'), 'C:\\Program Files\\Java', 'C:\\Program Files\\Eclipse Adoptium'];
  for (const dir of dirs) {
    try {
      for (const name of fs.readdirSync(dir)) candidates.push(path.join(dir, name));
    } catch {
      // directory not present
    }
  }
  return candidates.find((home) => home && (jdkMajor(home) ?? 0) >= REQUIRED_JAVA) || null;
}

const jdkHome = findJdkHome();
if (!jdkHome) {
  console.error(`JDK ${REQUIRED_JAVA}+ not found. Install it and set JAVA_HOME, then rerun.`);
  process.exit(1);
}
const backendEnv = {
  ...process.env,
  JAVA_HOME: jdkHome,
  PATH: path.join(jdkHome, 'bin') + path.delimiter + process.env.PATH,
};

const services = [
  {
    name: 'backend',
    color: '\x1b[36m',
    cwd: path.join(root, 'spring-backend'),
    env: backendEnv,
    // cmd.exe may not search the working directory, so use the full path on Windows.
    // `clean` first: the IDE's Java compiler also writes to target/classes and can leave
    // stale or invalid classes (e.g. Lombok constructors) that Maven would otherwise reuse.
    cmd: isWin ? `"${path.join(root, 'spring-backend', 'mvnw.cmd')}" clean spring-boot:run` : './mvnw clean spring-boot:run',
  },
  {
    name: 'frontend',
    color: '\x1b[35m',
    cwd: path.join(root, 'angular-frontend'),
    cmd: 'npm start',
  },
];

const children = [];
let shuttingDown = false;

function prefixLines(service, chunk) {
  const tag = `${service.color}[${service.name}]\x1b[0m `;
  return chunk
    .toString()
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => tag + line)
    .join('\n') + '\n';
}

function stopAll(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    try {
      // The shell wraps each command, so kill the whole process tree
      if (isWin) execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
      else process.kill(-child.pid, 'SIGTERM');
    } catch {
      // already gone
    }
  }
  process.exit(code);
}

for (const service of services) {
  const child = spawn(service.cmd, {
    cwd: service.cwd,
    shell: true,
    detached: !isWin,
    env: service.env || process.env,
  });
  child.stdout.on('data', (d) => process.stdout.write(prefixLines(service, d)));
  child.stderr.on('data', (d) => process.stderr.write(prefixLines(service, d)));
  child.on('exit', (code) => {
    if (!shuttingDown) {
      console.log(`[${service.name}] exited with code ${code}; stopping the other service.`);
      stopAll(code ?? 1);
    }
  });
  children.push(child);
}

process.on('SIGINT', () => stopAll(0));
process.on('SIGTERM', () => stopAll(0));

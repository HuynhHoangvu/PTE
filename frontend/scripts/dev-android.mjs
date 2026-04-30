import { execSync, spawn } from 'child_process';
import { networkInterfaces } from 'os';
import { writeFileSync, readFileSync } from 'fs';
import { createServer } from 'net';

const JAVA_HOME = 'C:\\Program Files\\Android\\Android Studio\\jbr';

process.env.JAVA_HOME = JAVA_HOME;
process.env.PATH = `${JAVA_HOME}\\bin;${process.env.PATH}`;

function getLanIP() {
  const nets = networkInterfaces();
  const candidates = [];
  for (const iface of Object.values(nets)) {
    for (const addr of iface || []) {
      if (addr.family === 'IPv4' && !addr.internal) candidates.push(addr.address);
    }
  }
  return candidates.find((ip) => ip.startsWith('192.168.')) || candidates[0] || '127.0.0.1';
}

function findFreePort(start) {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.listen(start, '0.0.0.0', () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on('error', () => resolve(findFreePort(start + 1)));
  });
}

const lanIP = getLanIP();
const vitePort = await findFreePort(5173);
const devServerUrl = `http://${lanIP}:${vitePort}`;

console.log(`\n🌐  Dev server URL : ${devServerUrl}`);
console.log(`📱  Make sure phone is on the same WiFi as this PC\n`);

const configPath = new URL('../capacitor.config.ts', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');
const originalConfig = readFileSync(configPath, 'utf-8');
const patchedConfig = originalConfig.replace(
  /server:\s*\{[^}]*\}/s,
  `server: {\n    androidScheme: 'https',\n    url: '${devServerUrl}',\n    cleartext: true,\n  }`
);
writeFileSync(configPath, patchedConfig);
console.log('✅  capacitor.config.ts patched with dev server URL');

function restore() {
  try { writeFileSync(configPath, originalConfig); } catch {}
  console.log('\n♻️   capacitor.config.ts restored');
}
process.on('exit', restore);
process.on('SIGINT', () => { restore(); process.exit(0); });
process.on('SIGTERM', () => { restore(); process.exit(0); });

console.log('🔄  Syncing to Android...');
execSync('npx cap sync android', { stdio: 'inherit', env: process.env });

console.log('\n🚀  Starting Vite dev server...');
const vite = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', String(vitePort)], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

setTimeout(() => {
  console.log('\n📦  Deploying to Android device...');
  try {
    execSync('npx cap run android', { stdio: 'inherit', env: process.env });
    console.log(`\n✅  Done! App on phone is loading from ${devServerUrl}`);
    console.log('   → Edit files → phone reloads automatically\n');
  } catch (e) {
    console.error('❌  Deploy failed:', e.message);
  }
}, 4000);

vite.on('close', () => restore());

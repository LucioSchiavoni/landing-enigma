import { spawnSync } from 'node:child_process';
import { cp, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const source = resolve(process.argv[2] ?? join('..', 'mirror-studio'));
const target = resolve('public', 'mirror');

const build = spawnSync('pnpm', ['build'], { cwd: source, stdio: 'inherit', shell: true });
if (build.status !== 0) process.exit(build.status ?? 1);

await rm(target, { recursive: true, force: true });
await cp(join(source, 'out'), target, { recursive: true });
await rm(join(target, '404.html'), { force: true });

console.log(`Mirror Studio copiado a public/mirror/ desde ${source}`);

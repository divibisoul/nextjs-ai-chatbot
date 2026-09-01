import { spawnSync } from 'node:child_process';

const hasDatabase = Boolean(process.env.POSTGRES_URL?.trim());

if (hasDatabase) {
  const migration = spawnSync(process.execPath, ['--import', 'tsx', 'lib/db/migrate.ts'], {
    stdio: 'inherit',
    env: process.env,
  });
  if (migration.status !== 0) process.exit(migration.status ?? 1);
  console.log('Database migrations completed; continuing production build.');
} else {
  console.log('POSTGRES_URL not configured; skipping database migrations for build validation.');
}

const build = spawnSync('pnpm', ['exec', 'next', 'build'], {
  stdio: 'inherit',
  env: process.env,
});
process.exit(build.status ?? 1);

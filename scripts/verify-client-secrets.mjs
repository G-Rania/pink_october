import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const clientOutput = fileURLToPath(new URL('../dist/', import.meta.url));
const protectedKeys = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'RATE_LIMIT_SECRET',
  // The project URL is public information, but it is server-only in this app.
  'SUPABASE_URL',
];

async function filesWithin(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesWithin(path) : path;
  }));
  return files.flat();
}

const secrets = protectedKeys.flatMap((key) => {
  const value = process.env[key];
  if (!value || value.length <= 4) return [];

  return [{
    key,
    permutations: [
      value,
      encodeURIComponent(value),
      Buffer.from(value).toString('base64'),
    ],
  }];
});

const leaks = [];
for (const file of await filesWithin(clientOutput)) {
  const contents = await readFile(file);
  for (const secret of secrets) {
    if (secret.permutations.some((value) => contents.includes(Buffer.from(value)))) {
      leaks.push({ key: secret.key, file });
    }
  }
}

if (leaks.length) {
  for (const leak of leaks) {
    console.error(`Client secret check failed: ${leak.key} was found in ${leak.file}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Client secret check passed (${secrets.length} configured server values checked).`);
}
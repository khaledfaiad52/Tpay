/**
 * Import resolution for `node --test`.
 *
 * The app is bundled by Metro, which understands the `@/…` alias from
 * tsconfig.json and extensionless TypeScript imports. Node understands
 * neither, so unit tests register this hook and the source keeps using the
 * same import style everywhere.
 */
import { statSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = resolvePath(dirname(fileURLToPath(import.meta.url)), '..');
const CANDIDATE_SUFFIXES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

function isFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/** First existing file for `base` once a TypeScript suffix is applied. */
function firstExisting(base) {
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = `${base}${suffix}`;
    if (isFile(candidate)) return candidate;
  }
  return undefined;
}

export function resolve(specifier, context, nextResolve) {
  let base;

  if (specifier.startsWith('@/')) {
    base = resolvePath(projectRoot, 'src', specifier.slice(2));
  } else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:')) {
    base = resolvePath(dirname(fileURLToPath(context.parentURL)), specifier);
  } else {
    return nextResolve(specifier, context);
  }

  const match = firstExisting(base);
  return match
    ? nextResolve(pathToFileURL(match).href, context)
    : nextResolve(specifier, context);
}

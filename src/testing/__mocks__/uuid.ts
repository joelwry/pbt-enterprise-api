/**
 * The real `uuid` package (v11) ships ESM-only, which Jest's default
 * CommonJS transform can't load from node_modules. Nothing under test here
 * cares about actual UUID randomness/format, so this is swapped in for
 * `uuid` only inside the Jest test run (see jest.config.js
 * `moduleNameMapper`) via Node's built-in `crypto.randomUUID()`.
 */
import { randomUUID } from 'crypto';

export function v4(): string {
  return randomUUID();
}

import crypto from 'crypto';
import { config } from '@/config/environment';

/**
 * Access control for files served off local disk at `/uploads` (see app.ts).
 *
 * `/uploads` used to be plain `express.static` with no auth and no tier
 * check, so every uploaded file was fetchable by anyone who had ever seen
 * its URL, forever: a member could hand a Mentorship-only workbook to a
 * Pathway member, a cancelled member kept working links, and raising a
 * resource's required tier revoked nothing. Filenames are UUIDs and
 * directory listing is off, so it was never *enumerable* -- but a URL that
 * is handed to every entitled member is not a secret.
 *
 * Files under a protected prefix now need a short-lived signature, minted
 * only at the moment an entitled member (or admin) is handed the URL, by
 * code that has already run the tier check. A leaked link stops working
 * within the hour, and a tier change takes effect on the next issue.
 *
 * Deliberately NOT protected: `leaders/` and `power-team/` hold directory
 * photos, which are ordinary `<img>` sources across the portal -- an image
 * tag cannot send a credential, and a headshot is not paid content. Only
 * the two prefixes that hold what members actually pay for are gated.
 */
const PROTECTED_PREFIXES = ['resources/', 'lessons/'];

/**
 * One hour. Long enough that a member who leaves the Resources page open
 * and clicks a download later still gets the file (the URL is minted when
 * the list is fetched, not when the link is clicked), short enough that a
 * shared or leaked link is worthless by the next day.
 */
export const SIGNED_URL_TTL_SECONDS = 60 * 60;

const UPLOADS_PATH_PREFIX = '/uploads/';

/** Storage keys are relative to the uploads root, e.g. `resources/<id>/<uuid>.pdf`. */
export function isProtectedStorageKey(storageKey: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => storageKey.startsWith(prefix));
}

function signatureFor(storageKey: string, expiresAt: number): string {
  return crypto.createHmac('sha256', config.JWT_SECRET).update(`${storageKey}:${expiresAt}`).digest('hex');
}

/**
 * Adds an expiring signature to a URL pointing at our own `/uploads`.
 *
 * Anything else is returned untouched: a Cloudinary URL (which carries its
 * own access control), an unprotected prefix, an empty value for a resource
 * whose file hasn't been uploaded yet, or anything unparseable. Callers can
 * therefore pipe every stored file URL through this without first working
 * out which storage provider produced it.
 */
export function signStorageUrl(fileUrl: string, ttlSeconds: number = SIGNED_URL_TTL_SECONDS): string {
  if (!fileUrl) return fileUrl;

  let url: URL;
  try {
    url = new URL(fileUrl, `http://localhost:${config.PORT}`);
  } catch {
    return fileUrl;
  }

  if (!url.pathname.startsWith(UPLOADS_PATH_PREFIX)) return fileUrl;

  const storageKey = decodeURIComponent(url.pathname.slice(UPLOADS_PATH_PREFIX.length));
  if (!isProtectedStorageKey(storageKey)) return fileUrl;

  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  url.searchParams.set('exp', String(expiresAt));
  url.searchParams.set('sig', signatureFor(storageKey, expiresAt));
  return url.toString();
}

export type SignatureCheck = 'ok' | 'missing' | 'expired' | 'invalid';

export function verifyStorageSignature(storageKey: string, exp: unknown, sig: unknown): SignatureCheck {
  if (typeof exp !== 'string' || typeof sig !== 'string' || !exp || !sig) return 'missing';

  const expiresAt = Number(exp);
  if (!Number.isFinite(expiresAt)) return 'invalid';
  if (expiresAt * 1000 < Date.now()) return 'expired';

  const expected = signatureFor(storageKey, expiresAt);
  // Constant-time compare: a fast-fail comparison leaks how much of a
  // forged signature was correct.
  const provided = Buffer.from(sig, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  if (provided.length !== expectedBuffer.length) return 'invalid';
  return crypto.timingSafeEqual(provided, expectedBuffer) ? 'ok' : 'invalid';
}

/**
 * Signs the media URLs carried inside a nested object -- a lesson body's
 * `videoUrl`/`fileUrl`, for instance.
 *
 * Returns a plain copy rather than mutating: the caller usually holds a
 * live Mongoose document, and writing a signed (expiring) URL back into the
 * database would be a slow-motion disaster -- every link would die an hour
 * after whoever last saved that document.
 */
export function signMediaFields<T extends object>(
  value: T | null | undefined,
  fields: string[] = ['videoUrl', 'fileUrl']
): Record<string, unknown> | undefined {
  if (value == null) return undefined;

  const source = value as unknown as { toObject?: () => Record<string, unknown> };
  const plain = typeof source.toObject === 'function' ? source.toObject() : { ...(value as object) };

  for (const field of fields) {
    if (typeof plain[field] === 'string' && plain[field]) {
      plain[field] = signStorageUrl(plain[field] as string);
    }
  }
  return plain;
}

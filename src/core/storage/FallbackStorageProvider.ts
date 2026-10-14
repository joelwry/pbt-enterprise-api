import logger from '@/core/logger/logger';
import { StorageProvider, UploadedFile, StorageUploadResult } from './StorageProvider';

/**
 * Wraps a primary provider (Cloudinary) with a fallback (local disk) so an
 * upload never hard-fails just because Cloudinary is unreachable or
 * misconfigured -- it degrades to local storage instead, same "never break
 * the triggering action over a downstream dependency" rule EmailService
 * already follows for SMTP.
 *
 * storageKey is prefixed with which provider actually stored the asset
 * (e.g. "cloudinary:abc123" vs "local:resources/xyz.pdf") so delete() can
 * route to the right one later -- nothing in the codebase parses the raw
 * storageKey format, so this prefix is safe to introduce.
 */
export class FallbackStorageProvider implements StorageProvider {
  constructor(
    private readonly primary: StorageProvider,
    private readonly fallback: StorageProvider,
    private readonly primaryLabel: string,
    private readonly fallbackLabel: string
  ) {}

  async upload(file: UploadedFile, folder: string): Promise<StorageUploadResult> {
    try {
      const result = await this.primary.upload(file, folder);
      return { ...result, storageKey: `${this.primaryLabel}:${result.storageKey}` };
    } catch (error) {
      logger.error(`[Storage] ${this.primaryLabel} upload failed, falling back to ${this.fallbackLabel}`, error);
      const result = await this.fallback.upload(file, folder);
      return { ...result, storageKey: `${this.fallbackLabel}:${result.storageKey}` };
    }
  }

  async delete(storageKey: string): Promise<void> {
    const separatorIndex = storageKey.indexOf(':');
    const origin = separatorIndex === -1 ? '' : storageKey.slice(0, separatorIndex);
    const key = separatorIndex === -1 ? storageKey : storageKey.slice(separatorIndex + 1);

    if (origin === this.primaryLabel) {
      await this.primary.delete(key);
      return;
    }
    if (origin === this.fallbackLabel) {
      await this.fallback.delete(key);
      return;
    }
    // Unrecognized/legacy key -- best-effort cleanup only, never throw on delete.
    await this.fallback.delete(storageKey).catch((error) => {
      logger.warn(`[Storage] Could not delete asset with unrecognized key format: ${storageKey}`, error);
    });
  }
}

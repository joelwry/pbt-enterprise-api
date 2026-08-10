export interface UploadedFile {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export interface StorageUploadResult {
  url: string;
  /** Provider-specific handle needed to delete the asset later (e.g. a Cloudinary public_id, or the local file path). */
  storageKey: string;
}

/**
 * Application code talks to this interface only, never a concrete provider
 * directly — going to production is a config change (STORAGE_PROVIDER env
 * var), not a code change. See pbt_roadmap.md, "Storage strategy".
 */
export interface StorageProvider {
  upload(file: UploadedFile, folder: string): Promise<StorageUploadResult>;
  delete(storageKey: string): Promise<void>;
}

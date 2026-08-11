import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { config } from '@/config/environment';
import { StorageProvider, UploadedFile, StorageUploadResult } from './StorageProvider';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

/** Dev/test storage — writes to local disk, served statically at /uploads (see app.ts). */
export class LocalStorageProvider implements StorageProvider {
  async upload(file: UploadedFile, folder: string): Promise<StorageUploadResult> {
    const dir = path.join(UPLOADS_DIR, folder);
    await fs.mkdir(dir, { recursive: true });

    const ext = path.extname(file.originalName);
    const filename = `${crypto.randomUUID()}${ext}`;
    await fs.writeFile(path.join(dir, filename), file.buffer);

    const storageKey = `${folder}/${filename}`;
    return {
      url: `http://localhost:${config.PORT}/uploads/${storageKey}`,
      storageKey,
    };
  }

  async delete(storageKey: string): Promise<void> {
    await fs.rm(path.join(UPLOADS_DIR, storageKey), { force: true });
  }
}

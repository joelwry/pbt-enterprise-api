import { v2 as cloudinary } from 'cloudinary';
import { StorageProvider, UploadedFile, StorageUploadResult } from './StorageProvider';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/** Production storage. Selected via STORAGE_PROVIDER=cloudinary — see storage/index.ts. */
export class CloudinaryStorageProvider implements StorageProvider {
  async upload(file: UploadedFile, folder: string): Promise<StorageUploadResult> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: `pbt/${folder}`, resource_type: 'auto' },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary upload returned no result'));
            return;
          }
          resolve({ url: result.secure_url, storageKey: result.public_id });
        }
      );
      uploadStream.end(file.buffer);
    });
  }

  async delete(storageKey: string): Promise<void> {
    await cloudinary.uploader.destroy(storageKey);
  }
}

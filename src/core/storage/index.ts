import { StorageProvider } from './StorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';
import { CloudinaryStorageProvider } from './CloudinaryStorageProvider';
import { FallbackStorageProvider } from './FallbackStorageProvider';

function createStorageProvider(): StorageProvider {
  switch (process.env.STORAGE_PROVIDER) {
    case 'cloudinary':
      // Cloudinary is primary, but an upload never hard-fails just because
      // it's unreachable or misconfigured -- falls back to local disk so
      // the admin action (creating a resource, uploading a lesson video,
      // etc.) still succeeds. See FallbackStorageProvider for the delete()
      // routing this requires.
      return new FallbackStorageProvider(new CloudinaryStorageProvider(), new LocalStorageProvider(), 'cloudinary', 'local');
    default:
      return new LocalStorageProvider();
  }
}

export const storageProvider: StorageProvider = createStorageProvider();
export * from './StorageProvider';

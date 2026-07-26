import { StorageProvider } from './StorageProvider';
import { LocalStorageProvider } from './LocalStorageProvider';
import { CloudinaryStorageProvider } from './CloudinaryStorageProvider';

function createStorageProvider(): StorageProvider {
  switch (process.env.STORAGE_PROVIDER) {
    case 'cloudinary':
      return new CloudinaryStorageProvider();
    default:
      return new LocalStorageProvider();
  }
}

export const storageProvider: StorageProvider = createStorageProvider();
export * from './StorageProvider';

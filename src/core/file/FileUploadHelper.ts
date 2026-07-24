import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AppError } from '@/core/errors/AppError';

/**
 * File upload configuration and utilities
 */
export class FileUploadHelper {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  private static readonly ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword'];

  /**
   * Configure multer for image uploads
   */
  static configureImageUpload() {
    const storage = multer.memoryStorage();

    const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      if (!this.ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
        return cb(
          new AppError('Invalid file type. Only JPEG, PNG, and WebP are allowed', 400)
        );
      }
      cb(null, true);
    };

    return multer({
      storage,
      fileFilter,
      limits: { fileSize: this.MAX_FILE_SIZE },
    });
  }

  /**
   * Configure multer for document uploads
   */
  static configureDocumentUpload() {
    const storage = multer.memoryStorage();

    const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
      if (!this.ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
        return cb(
          new AppError('Invalid file type. Only PDF and DOC are allowed', 400)
        );
      }
      cb(null, true);
    };

    return multer({
      storage,
      fileFilter,
      limits: { fileSize: this.MAX_FILE_SIZE },
    });
  }

  /**
   * Configure multer for any file type
   */
  static configureAnyUpload(maxSize = this.MAX_FILE_SIZE) {
    const storage = multer.memoryStorage();

    return multer({
      storage,
      limits: { fileSize: maxSize },
    });
  }

  /**
   * Generate unique filename
   */
  static generateFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    return `${name}-${uuidv4()}${ext}`;
  }

  /**
   * Validate image file
   */
  static validateImageFile(file: Express.Multer.File | undefined): boolean {
    if (!file) return false;
    if (file.size > this.MAX_FILE_SIZE) return false;
    return this.ALLOWED_IMAGE_TYPES.includes(file.mimetype);
  }

  /**
   * Validate document file
   */
  static validateDocumentFile(file: Express.Multer.File | undefined): boolean {
    if (!file) return false;
    if (file.size > this.MAX_FILE_SIZE) return false;
    return this.ALLOWED_DOCUMENT_TYPES.includes(file.mimetype);
  }

  /**
   * Get file extension
   */
  static getFileExtension(filename: string): string {
    return path.extname(filename).toLowerCase();
  }

  /**
   * Get file mime type from extension
   */
  static getMimeType(extension: string): string {
    const mimeTypes: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}

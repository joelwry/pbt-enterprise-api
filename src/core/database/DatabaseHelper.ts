import mongoose from 'mongoose';

/**
 * Database utility functions
 */
export class DatabaseHelper {
  /**
   * Convert string ID to MongoDB ObjectId
   */
  static toObjectId(id: string): mongoose.Types.ObjectId {
    return new mongoose.Types.ObjectId(id);
  }

  /**
   * Check if string is valid MongoDB ObjectId
   */
  static isValidObjectId(id: string): boolean {
    return mongoose.Types.ObjectId.isValid(id);
  }

  /**
   * Soft delete query (finds non-deleted documents)
   */
  static softDeleteQuery() {
    return { deletedAt: null };
  }

  /**
   * Build soft delete update
   */
  static softDeleteUpdate() {
    return { deletedAt: new Date() };
  }

  /**
   * Build soft restore update
   */
  static softRestoreUpdate() {
    return { deletedAt: null };
  }

  /**
   * Safe JSON stringify for logging (removes circular references)
   */
  static safeStringify(obj: any, depth = 2): string {
    const cache: any[] = [];
    return JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (cache.includes(value)) return '[Circular]';
        cache.push(value);
      }
      return value;
    });
  }

  /**
   * Build aggregation pipeline for pagination
   */
  static paginationPipeline(page: number, limit: number, sortField = 'createdAt', sortOrder = -1) {
    const skip = (page - 1) * limit;
    return [
      { $match: { deletedAt: null } },
      { $sort: { [sortField]: sortOrder } },
      { $skip: skip },
      { $limit: limit },
    ];
  }

  /**
   * Build text search pipeline
   */
  static textSearchPipeline(searchQuery: string, fields: string[]) {
    return {
      $or: fields.map((field) => ({
        [field]: { $regex: searchQuery, $options: 'i' },
      })),
    };
  }

  /**
   * Create bulk write operations for batch updates
   */
  static bulkUpdateOps(ids: string[], updateData: any) {
    return ids.map((id) => ({
      updateOne: {
        filter: { _id: this.toObjectId(id) },
        update: { $set: updateData },
      },
    }));
  }

  /**
   * Create session for transactions
   */
  static async createSession() {
    const session = await mongoose.startSession();
    session.startTransaction();
    return session;
  }

  /**
   * Safely parse JSON field from MongoDB
   */
  static parseJsonField(jsonString: string, defaultValue: any = null) {
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return defaultValue;
    }
  }
}

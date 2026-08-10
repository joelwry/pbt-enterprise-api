import { ContentRelationship } from '../schemas/ContentRelationship.schema';
import { AppError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

export class ContentRelationshipService {
  async getRelatedContent(contentId: string, relationshipType?: string) {
    try {
      const query: any = { sourceContentId: contentId };
      if (relationshipType) query.relationshipType = relationshipType;

      const relationships = await ContentRelationship.find(query).sort({ strength: -1 });
      return relationships;
    } catch (error) {
      logger.error('Error fetching related content', { contentId, error });
      throw error;
    }
  }

  async getPrerequisites(contentId: string) {
    try {
      const prerequisites = await ContentRelationship.find({
        sourceContentId: contentId,
        relationshipType: 'prerequisite',
      });
      return prerequisites;
    } catch (error) {
      logger.error('Error fetching prerequisites', { contentId, error });
      throw error;
    }
  }

  async getRelatedLessons(contentId: string) {
    try {
      const relatedLessons = await ContentRelationship.find({
        sourceContentId: contentId,
        relationshipType: 'related',
        relatedType: 'lesson',
      });
      return relatedLessons;
    } catch (error) {
      logger.error('Error fetching related lessons', { contentId, error });
      throw error;
    }
  }

  async createRelationship(relationshipData: any) {
    try {
      // Check for duplicate relationships
      const existing = await ContentRelationship.findOne({
        sourceContentId: relationshipData.sourceContentId,
        relatedContentId: relationshipData.relatedContentId,
        relationshipType: relationshipData.relationshipType,
      });

      if (existing) {
        throw new AppError(409, 'Relationship already exists', ['ERR_6001']);
      }

      const relationship = new ContentRelationship(relationshipData);
      await relationship.save();

      logger.info('Content relationship created', {
        sourceId: relationshipData.sourceContentId,
        relatedId: relationshipData.relatedContentId,
      });
      return relationship;
    } catch (error) {
      logger.error('Error creating content relationship', { error });
      throw error;
    }
  }

  async updateRelationshipStrength(sourceId: string, relatedId: string, strength: number) {
    try {
      const relationship = await ContentRelationship.findOneAndUpdate(
        { sourceContentId: sourceId, relatedContentId: relatedId },
        { strength: Math.min(strength, 100) },
        { new: true }
      );

      if (!relationship) {
        throw new AppError(404, 'Relationship not found', ['ERR_6002']);
      }

      logger.info('Relationship strength updated', { sourceId, relatedId, strength });
      return relationship;
    } catch (error) {
      logger.error('Error updating relationship strength', { error });
      throw error;
    }
  }

  async getSupplementaryResources(contentId: string, limit: number = 5) {
    try {
      const resources = await ContentRelationship.find({
        sourceContentId: contentId,
        relationshipType: 'supplementary',
        relatedType: 'resource',
      })
        .limit(limit)
        .sort({ strength: -1 });

      return resources;
    } catch (error) {
      logger.error('Error fetching supplementary resources', { contentId, error });
      throw error;
    }
  }

  async getContentPathway(startContentId: string, maxDepth: number = 3): Promise<any[]> {
    try {
      const pathway: any[] = [];
      const visited = new Set<string>();

      const traverse = async (contentId: string, depth: number) => {
        if (depth > maxDepth || visited.has(contentId)) return;
        visited.add(contentId);

        const relationships = await ContentRelationship.find({
          sourceContentId: contentId,
          relationshipType: 'prerequisite',
        });

        for (const rel of relationships) {
          pathway.push({
            from: contentId,
            to: rel.relatedContentId,
            type: rel.relationshipType,
            strength: rel.strength,
          });

          await traverse(rel.relatedContentId, depth + 1);
        }
      };

      await traverse(startContentId, 0);
      return pathway;
    } catch (error) {
      logger.error('Error getting content pathway', { startContentId, error });
      throw error;
    }
  }

  async deleteRelationship(sourceId: string, relatedId: string) {
    try {
      const result = await ContentRelationship.deleteOne({
        sourceContentId: sourceId,
        relatedContentId: relatedId,
      });

      if (result.deletedCount === 0) {
        throw new AppError(404, 'Relationship not found', ['ERR_6002']);
      }

      logger.info('Content relationship deleted', { sourceId, relatedId });
      return { success: true };
    } catch (error) {
      logger.error('Error deleting relationship', { error });
      throw error;
    }
  }
}

export default new ContentRelationshipService();

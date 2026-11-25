import { ContentRelationship, type ContentType } from '@/modules/content/schemas/ContentRelationship.schema';
import logger from '@/core/logger/logger';

export class ContentMapper {
  static async mapContentWithRelationships(contentId: string, contentType: ContentType, depth: number = 1): Promise<any> {
    try {
      const relationships = await ContentRelationship.find({
        sourceContentId: contentId,
        sourceType: contentType,
      });

      const mappedContent = {
        contentId,
        contentType,
        relationships: {
          prerequisites: relationships
            .filter((r) => r.relationshipType === 'prerequisite')
            .map((r) => ({
              id: r.relatedContentId,
              type: r.relatedType,
              strength: r.strength,
            })),
          related: relationships
            .filter((r) => r.relationshipType === 'related')
            .map((r) => ({
              id: r.relatedContentId,
              type: r.relatedType,
              strength: r.strength,
            })),
          deepdives: relationships
            .filter((r) => r.relationshipType === 'deepdive')
            .map((r) => ({
              id: r.relatedContentId,
              type: r.relatedType,
              strength: r.strength,
            })),
          followups: relationships
            .filter((r) => r.relationshipType === 'followup')
            .map((r) => ({
              id: r.relatedContentId,
              type: r.relatedType,
              strength: r.strength,
            })),
          supplementary: relationships
            .filter((r) => r.relationshipType === 'supplementary')
            .map((r) => ({
              id: r.relatedContentId,
              type: r.relatedType,
              strength: r.strength,
            })),
        },
      };

      logger.info('Content mapped with relationships', { contentId, relationshipCount: relationships.length });
      return mappedContent;
    } catch (error) {
      logger.error('Error mapping content', { contentId, error });
      throw error;
    }
  }

  static async createLearningPath(startContentId: string): Promise<string[]> {
    try {
      const path: string[] = [startContentId];
      const visited = new Set<string>([startContentId]);
      const queue = [startContentId];

      while (queue.length > 0) {
        const currentId = queue.shift()!;

        const prerequisites = await ContentRelationship.find({
          sourceContentId: currentId,
          relationshipType: 'prerequisite',
        }).sort({ strength: -1 });

        for (const prereq of prerequisites.slice(0, 2)) {
          if (!visited.has(prereq.relatedContentId)) {
            visited.add(prereq.relatedContentId);
            path.unshift(prereq.relatedContentId);
            queue.push(prereq.relatedContentId);
          }
        }
      }

      logger.info('Learning path created', { startContentId, pathLength: path.length });
      return path;
    } catch (error) {
      logger.error('Error creating learning path', { startContentId, error });
      throw error;
    }
  }

  static async buildContentCluster(contentId: string, clusterSize: number = 10): Promise<any[]> {
    try {
      const relationships = await ContentRelationship.find({
        $or: [{ sourceContentId: contentId }, { relatedContentId: contentId }],
      })
        .limit(clusterSize)
        .sort({ strength: -1 });

      const cluster = relationships.map((r) => ({
        fromId: r.sourceContentId,
        toId: r.relatedContentId,
        type: r.relationshipType,
        strength: r.strength,
      }));

      logger.info('Content cluster built', { contentId, clusterSize: cluster.length });
      return cluster;
    } catch (error) {
      logger.error('Error building content cluster', { contentId, error });
      throw error;
    }
  }

  static normalizeContentStrength(relationships: any[]): any[] {
    const maxStrength = Math.max(...relationships.map((r) => r.strength), 1);

    return relationships.map((r) => ({
      ...r,
      normalizedStrength: r.strength / maxStrength,
      confidenceScore: (r.strength / maxStrength) * 100,
    }));
  }
}

export default ContentMapper;

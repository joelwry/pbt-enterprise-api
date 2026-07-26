import { Roadmap } from '@/modules/learning/schemas/Roadmap.schema';
import { RoadmapWeek } from '@/modules/learning/schemas/RoadmapWeek.schema';
import { Module, Lesson, MembershipTier } from '@/modules/learning/schemas/Learning.schema';
import { storageProvider, UploadedFile } from '@/core/storage';
import { NotFoundError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

/**
 * Admin management of the Business Learning Journey hierarchy:
 * Roadmap → Roadmap Week → Module → Lesson. Mirrors the member-facing
 * hierarchy in learning.service.ts, but with write access and visibility
 * into not-yet-unlocked content.
 */
export class AdminLearningService {
  // ---- Roadmaps ----

  async listRoadmaps() {
    return Roadmap.find().sort({ year: -1 });
  }

  async createRoadmap(data: { title: string; year: string; description?: string; isCurrent?: boolean }) {
    const roadmap = await Roadmap.create(data);
    logger.info('Roadmap created', { roadmapId: roadmap._id, year: roadmap.year });
    return roadmap;
  }

  async updateRoadmap(roadmapId: string, data: Partial<{ title: string; description: string; isCurrent: boolean }>) {
    const roadmap = await Roadmap.findByIdAndUpdate(roadmapId, data, { new: true });
    if (!roadmap) throw new NotFoundError('Roadmap not found');
    return roadmap;
  }

  async deleteRoadmap(roadmapId: string) {
    const roadmap = await Roadmap.findByIdAndDelete(roadmapId);
    if (!roadmap) throw new NotFoundError('Roadmap not found');
    logger.info('Roadmap deleted', { roadmapId });
  }

  // ---- Roadmap Weeks ----

  async listWeeks(roadmapId: string) {
    return RoadmapWeek.find({ roadmapId }).sort({ weekNumber: 1 });
  }

  async createWeek(roadmapId: string, data: { weekNumber: number; title: string; description?: string }) {
    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) throw new NotFoundError('Roadmap not found');

    const week = await RoadmapWeek.create({ ...data, roadmapId });
    logger.info('Roadmap week created', { weekId: week._id, roadmapId });
    return week;
  }

  async updateWeek(weekId: string, data: Partial<{ weekNumber: number; title: string; description: string }>) {
    const week = await RoadmapWeek.findByIdAndUpdate(weekId, data, { new: true });
    if (!week) throw new NotFoundError('Roadmap week not found');
    return week;
  }

  async deleteWeek(weekId: string) {
    const week = await RoadmapWeek.findByIdAndDelete(weekId);
    if (!week) throw new NotFoundError('Roadmap week not found');
    logger.info('Roadmap week deleted', { weekId });
  }

  // ---- Modules ----

  async listModules(weekId: string) {
    return Module.find({ roadmapWeekId: weekId }).sort({ moduleNumber: 1 });
  }

  async createModule(weekId: string, data: { moduleNumber: number; title: string; description?: string }) {
    const week = await RoadmapWeek.findById(weekId);
    if (!week) throw new NotFoundError('Roadmap week not found');

    const learningModule = await Module.create({ ...data, roadmapWeekId: weekId, lessons: [] });
    logger.info('Module created', { moduleId: learningModule._id, weekId });
    return learningModule;
  }

  async updateModule(moduleId: string, data: Partial<{ moduleNumber: number; title: string; description: string }>) {
    const learningModule = await Module.findByIdAndUpdate(moduleId, data, { new: true });
    if (!learningModule) throw new NotFoundError('Module not found');
    return learningModule;
  }

  async deleteModule(moduleId: string) {
    const learningModule = await Module.findByIdAndUpdate(moduleId, { deletedAt: new Date() }, { new: true });
    if (!learningModule) throw new NotFoundError('Module not found');
    logger.info('Module soft-deleted', { moduleId });
  }

  // ---- Lessons ----

  async listLessons(moduleId: string) {
    return Lesson.find({ moduleId }).sort({ month: 1 });
  }

  async createLesson(
    moduleId: string,
    data: {
      month: number;
      category: string;
      title: string;
      type: 'Video' | 'Article' | 'PDF' | 'Quiz';
      author: string;
      metaLabel: string;
      unlocksAt: string | Date;
      requiredTier: MembershipTier;
      body: Record<string, unknown>;
    }
  ) {
    const learningModule = await Module.findById(moduleId);
    if (!learningModule) throw new NotFoundError('Module not found');

    const lesson = await Lesson.create({
      moduleId,
      month: data.month,
      category: data.category,
      title: data.title,
      type: data.type,
      author: data.author,
      metaLabel: data.metaLabel,
      access: { unlocksAt: new Date(data.unlocksAt), requiredTier: data.requiredTier },
      body: data.body,
    });

    learningModule.lessons.push(lesson._id);
    await learningModule.save();

    logger.info('Lesson created', { lessonId: lesson._id, moduleId });
    return lesson;
  }

  async updateLesson(
    lessonId: string,
    data: Partial<{
      month: number;
      category: string;
      title: string;
      type: 'Video' | 'Article' | 'PDF' | 'Quiz';
      author: string;
      metaLabel: string;
      unlocksAt: string | Date;
      requiredTier: MembershipTier;
      body: Record<string, unknown>;
    }>
  ) {
    const update: Record<string, unknown> = { ...data };
    delete update.unlocksAt;
    delete update.requiredTier;

    if (data.unlocksAt !== undefined) update['access.unlocksAt'] = new Date(data.unlocksAt);
    if (data.requiredTier !== undefined) update['access.requiredTier'] = data.requiredTier;

    const lesson = await Lesson.findByIdAndUpdate(lessonId, update, { new: true });
    if (!lesson) throw new NotFoundError('Lesson not found');
    return lesson;
  }

  async deleteLesson(lessonId: string) {
    const lesson = await Lesson.findByIdAndUpdate(lessonId, { deletedAt: new Date() }, { new: true });
    if (!lesson) throw new NotFoundError('Lesson not found');
    await Module.updateOne({ _id: lesson.moduleId }, { $pull: { lessons: lesson._id } });
    logger.info('Lesson soft-deleted', { lessonId });
  }

  /** Uploads lesson media (video/PDF/etc.) through the active StorageProvider and returns its URL. */
  async uploadLessonAsset(lessonId: string, file: UploadedFile) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');

    const { url } = await storageProvider.upload(file, `lessons/${lessonId}`);
    logger.info('Lesson asset uploaded', { lessonId, url });
    return { url };
  }
}

export const adminLearningService = new AdminLearningService();

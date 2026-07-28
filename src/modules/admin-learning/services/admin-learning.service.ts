import { Types } from 'mongoose';
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

  async createWeek(roadmapId: string, data: { weekNumber: number; title: string; description?: string; isCheckpoint?: boolean }) {
    const roadmap = await Roadmap.findById(roadmapId);
    if (!roadmap) throw new NotFoundError('Roadmap not found');

    const week = await RoadmapWeek.create({ ...data, roadmapId });
    logger.info('Roadmap week created', { weekId: week._id, roadmapId });
    return week;
  }

  async updateWeek(weekId: string, data: Partial<{ weekNumber: number; title: string; description: string; isCheckpoint: boolean }>) {
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

  async getLessonById(lessonId: string) {
    const lesson = await Lesson.findById(lessonId);
    if (!lesson) throw new NotFoundError('Lesson not found');

    const learningModule = await Module.findById(lesson.moduleId);
    const week = learningModule ? await RoadmapWeek.findById(learningModule.roadmapWeekId) : null;
    const roadmap = week ? await Roadmap.findById(week.roadmapId) : null;

    return {
      lesson,
      moduleTitle: learningModule?.title ?? '',
      weekNumber: week?.weekNumber,
      roadmapYear: roadmap?.year,
    };
  }

  /**
   * Flat, paginated, searchable lesson list across every roadmap — what the
   * admin-content list screen renders. The per-module CRUD endpoints above
   * stay scoped (used by the editor once a module is chosen); this one exists
   * purely for that list/search/paginate view.
   */
  async listLessonsFlat(query: { year?: string; search?: string; page: number; limit: number }) {
    const { year, search, page, limit } = query;

    let moduleIds: Types.ObjectId[] | undefined;
    if (year) {
      const roadmap = await Roadmap.findOne({ year });
      if (!roadmap) {
        return { items: [], totalItems: 0 };
      }
      const weeks = await RoadmapWeek.find({ roadmapId: roadmap._id }).select('_id');
      const modules = await Module.find({ roadmapWeekId: { $in: weeks.map((w) => w._id) } }).select('_id');
      moduleIds = modules.map((m) => m._id as Types.ObjectId);
    }

    const filter: Record<string, unknown> = {};
    if (moduleIds) filter.moduleId = { $in: moduleIds };
    if (search?.trim()) filter.title = { $regex: search.trim(), $options: 'i' };

    const [lessons, totalItems] = await Promise.all([
      Lesson.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Lesson.countDocuments(filter),
    ]);

    // Resolve module/week/roadmap context for display labels in one batch
    // rather than N+1 queries per lesson.
    const lessonModuleIds = [...new Set(lessons.map((l) => l.moduleId.toString()))];
    const modules = await Module.find({ _id: { $in: lessonModuleIds } });
    const moduleById = new Map(modules.map((m) => [m._id.toString(), m]));

    const weekIds = [...new Set(modules.map((m) => m.roadmapWeekId.toString()))];
    const weeks = await RoadmapWeek.find({ _id: { $in: weekIds } });
    const weekById = new Map(weeks.map((w) => [w._id.toString(), w]));

    const roadmapIds = [...new Set(weeks.map((w) => w.roadmapId.toString()))];
    const roadmaps = await Roadmap.find({ _id: { $in: roadmapIds } });
    const roadmapById = new Map(roadmaps.map((r) => [r._id.toString(), r]));

    const items = lessons.map((lesson) => {
      const learningModule = moduleById.get(lesson.moduleId.toString());
      const week = learningModule ? weekById.get(learningModule.roadmapWeekId.toString()) : undefined;
      const roadmap = week ? roadmapById.get(week.roadmapId.toString()) : undefined;

      return {
        lesson,
        moduleTitle: learningModule?.title ?? '',
        weekNumber: week?.weekNumber,
        roadmapYear: roadmap?.year ?? '',
      };
    });

    return { items, totalItems };
  }

  /** Counts for the Content Management stats row. */
  async getStats() {
    const now = new Date();
    const [totalLessons, publishedCount, scheduledCount, modulesActiveCount] = await Promise.all([
      Lesson.countDocuments({ isDraft: { $ne: true } }),
      Lesson.countDocuments({ isDraft: { $ne: true }, 'access.unlocksAt': { $lte: now } }),
      Lesson.countDocuments({ isDraft: { $ne: true }, 'access.unlocksAt': { $gt: now } }),
      Module.countDocuments({}),
    ]);

    return { totalLessons, publishedCount, scheduledCount, modulesActiveCount };
  }

  async createLesson(
    moduleId: string,
    data: {
      title: string;
      type: 'Video' | 'Article' | 'PDF' | 'Quiz';
      category?: string;
      author?: string;
      metaLabel: string;
      unlocksAt: string | Date;
      requiredTier: MembershipTier;
      isDraft?: boolean;
      body: Record<string, unknown>;
    }
  ) {
    const learningModule = await Module.findById(moduleId);
    if (!learningModule) throw new NotFoundError('Module not found');

    // `month` is a legacy ordering field from the pre-Roadmap Year/Programme
    // model — the admin UI no longer collects it directly, so it's assigned
    // as the next sequential position within the module.
    const month = (await Lesson.countDocuments({ moduleId })) + 1;

    const lesson = await Lesson.create({
      moduleId,
      month,
      // Falls back to the module's own title — the admin editor doesn't
      // collect a separate "category" field, and the module title is the
      // closest meaningful grouping label already on hand.
      category: data.category ?? learningModule.title,
      title: data.title,
      type: data.type,
      author: data.author,
      metaLabel: data.metaLabel,
      isDraft: data.isDraft ?? false,
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
      moduleId: string;
      category: string;
      title: string;
      type: 'Video' | 'Article' | 'PDF' | 'Quiz';
      author: string;
      metaLabel: string;
      unlocksAt: string | Date;
      requiredTier: MembershipTier;
      isDraft: boolean;
      body: Record<string, unknown>;
    }>
  ) {
    const existing = await Lesson.findById(lessonId);
    if (!existing) throw new NotFoundError('Lesson not found');

    const update: Record<string, unknown> = { ...data };
    delete update.unlocksAt;
    delete update.requiredTier;
    delete update.moduleId;

    if (data.unlocksAt !== undefined) update['access.unlocksAt'] = new Date(data.unlocksAt);
    if (data.requiredTier !== undefined) update['access.requiredTier'] = data.requiredTier;

    // Moving a lesson to a different module: re-parent both sides of the
    // Module.lessons[] relationship, same as delete + create would, but
    // without losing the lesson's own id/progress history.
    const targetModuleId = data.moduleId;
    if (targetModuleId && targetModuleId !== existing.moduleId.toString()) {
      const targetModule = await Module.findById(targetModuleId);
      if (!targetModule) throw new NotFoundError('Target module not found');

      await Module.updateOne({ _id: existing.moduleId }, { $pull: { lessons: existing._id } });
      targetModule.lessons.push(existing._id);
      await targetModule.save();
      update.moduleId = targetModuleId;
    }

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

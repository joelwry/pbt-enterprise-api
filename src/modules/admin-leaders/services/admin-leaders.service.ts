import { Leader, ILeader, LeaderRegion } from '@/modules/leaders/schemas/Leader.schema';
import { storageProvider, UploadedFile } from '@/core/storage';
import { NotFoundError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

export type AdminLeaderStatus = 'Active' | 'Inactive';

function initialsFor(fullName: string): string {
  return (
    fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'PL'
  );
}

function statusOf(leader: ILeader): AdminLeaderStatus {
  return leader.isActive ? 'Active' : 'Inactive';
}

function toAdminLeader(leader: ILeader) {
  return {
    id: leader._id,
    fullName: leader.fullName,
    initials: initialsFor(leader.fullName),
    region: leader.region,
    specialty: leader.specialty,
    specialties: leader.specialties,
    email: leader.email,
    bio: leader.bio,
    status: statusOf(leader),
    membersAssigned: leader.membersCount,
    isTopMentor: leader.isTopMentor,
    location: leader.location,
    yearsActive: leader.yearsActive,
    profileImageUrl: leader.profileImageUrl,
  };
}

export interface AdminLeaderInput {
  fullName: string;
  region: LeaderRegion;
  specialty: string;
  specialties?: string[];
  email: string;
  bio: string;
  isActive: boolean;
  isTopMentor?: boolean;
  location?: string;
  yearsActive?: number;
}

export class AdminLeadersService {
  async listLeaders(query: { region?: LeaderRegion | 'All'; search?: string; page: number; limit: number }) {
    const { region, search, page, limit } = query;

    const filter: Record<string, unknown> = {};
    if (region && region !== 'All') filter.region = region;
    if (search?.trim()) {
      filter.$or = [
        { fullName: { $regex: search.trim(), $options: 'i' } },
        { specialty: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const [leaders, totalItems] = await Promise.all([
      Leader.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Leader.countDocuments(filter),
    ]);

    return { items: leaders.map(toAdminLeader), totalItems };
  }

  async getStats() {
    const [totalLeaders, membersAgg, topMentorCount, regions] = await Promise.all([
      Leader.countDocuments({}),
      Leader.aggregate([{ $group: { _id: null, total: { $sum: '$membersCount' } } }]),
      Leader.countDocuments({ isTopMentor: true }),
      Leader.distinct('region'),
    ]);

    return {
      totalLeaders,
      membersCovered: membersAgg[0]?.total ?? 0,
      topMentorCount,
      regionsCount: regions.length,
    };
  }

  async getLeaderById(leaderId: string) {
    const leader = await Leader.findById(leaderId);
    if (!leader) throw new NotFoundError('Leader not found');
    return toAdminLeader(leader);
  }

  async createLeader(input: AdminLeaderInput) {
    const leader = await Leader.create({
      fullName: input.fullName,
      region: input.region,
      specialty: input.specialty,
      specialties: input.specialties ?? [],
      email: input.email,
      bio: input.bio,
      isActive: input.isActive,
      isTopMentor: input.isTopMentor ?? false,
      location: input.location ?? '',
      yearsActive: input.yearsActive ?? 0,
    });
    logger.info('Leader created', { leaderId: leader._id });
    return toAdminLeader(leader);
  }

  async updateLeader(leaderId: string, input: Partial<AdminLeaderInput>) {
    const update: Record<string, unknown> = {};
    if (input.fullName !== undefined) update.fullName = input.fullName;
    if (input.region !== undefined) update.region = input.region;
    if (input.specialty !== undefined) update.specialty = input.specialty;
    if (input.specialties !== undefined) update.specialties = input.specialties;
    if (input.email !== undefined) update.email = input.email;
    if (input.bio !== undefined) update.bio = input.bio;
    if (input.isActive !== undefined) update.isActive = input.isActive;
    if (input.isTopMentor !== undefined) update.isTopMentor = input.isTopMentor;
    if (input.location !== undefined) update.location = input.location;
    if (input.yearsActive !== undefined) update.yearsActive = input.yearsActive;

    const leader = await Leader.findByIdAndUpdate(leaderId, update, { new: true });
    if (!leader) throw new NotFoundError('Leader not found');
    return toAdminLeader(leader);
  }

  async deleteLeader(leaderId: string) {
    const leader = await Leader.findByIdAndUpdate(leaderId, { deletedAt: new Date() }, { new: true });
    if (!leader) throw new NotFoundError('Leader not found');
    logger.info('Leader soft-deleted', { leaderId });
  }

  async uploadPhoto(leaderId: string, file: UploadedFile) {
    const leader = await Leader.findById(leaderId);
    if (!leader) throw new NotFoundError('Leader not found');

    const { url } = await storageProvider.upload(file, `leaders/${leaderId}`);
    leader.profileImageUrl = url;
    await leader.save();

    logger.info('Leader photo uploaded', { leaderId, url });
    return toAdminLeader(leader);
  }
}

export const adminLeadersService = new AdminLeadersService();

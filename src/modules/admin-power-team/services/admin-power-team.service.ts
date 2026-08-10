import { PowerTeamMember, IPowerTeamMember, PowerTeamCategory } from '@/modules/power-team/schemas/PowerTeam.schema';
import { storageProvider, UploadedFile } from '@/core/storage';
import { NotFoundError } from '@/core/errors/AppError';
import logger from '@/core/logger/logger';

export type AdminPartnerStatus = 'Verified' | 'Pending Review' | 'Suspended';

function initialsFor(name: string): string {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'PT'
  );
}

function statusOf(member: IPowerTeamMember): AdminPartnerStatus {
  if (!member.isActive) return 'Suspended';
  return member.isVerified ? 'Verified' : 'Pending Review';
}

function statusToFlags(status: AdminPartnerStatus): { isActive: boolean; isVerified: boolean } {
  if (status === 'Suspended') return { isActive: false, isVerified: false };
  if (status === 'Verified') return { isActive: true, isVerified: true };
  return { isActive: true, isVerified: false };
}

function toAdminPartner(member: IPowerTeamMember) {
  return {
    id: member._id,
    name: member.name,
    initials: initialsFor(member.name),
    category: member.category,
    categoryLabel: member.categoryLabel || member.category,
    region: member.region,
    status: statusOf(member),
    email: member.contactEmail,
    phone: member.phone,
    bio: member.bio,
    website: member.website,
    logoUrl: member.logoUrl,
  };
}

export interface AdminPartnerInput {
  name: string;
  category: PowerTeamCategory;
  categoryLabel?: string;
  region: string;
  email: string;
  phone: string;
  bio: string;
  website?: string;
  status: AdminPartnerStatus;
}

export class AdminPowerTeamService {
  async listPartners(query: { category?: PowerTeamCategory | 'All'; search?: string; page: number; limit: number }) {
    const { category, search, page, limit } = query;

    const filter: Record<string, unknown> = {};
    if (category && category !== 'All') filter.category = category;
    if (search?.trim()) {
      filter.$or = [
        { name: { $regex: search.trim(), $options: 'i' } },
        { region: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const [members, totalItems] = await Promise.all([
      PowerTeamMember.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      PowerTeamMember.countDocuments(filter),
    ]);

    return { items: members.map(toAdminPartner), totalItems };
  }

  async getStats() {
    const [totalPartners, serviceTypes, pendingCount, regions] = await Promise.all([
      PowerTeamMember.countDocuments({}),
      PowerTeamMember.distinct('category'),
      PowerTeamMember.countDocuments({ isActive: true, isVerified: false }),
      PowerTeamMember.distinct('region'),
    ]);

    return {
      totalPartners,
      serviceTypesCount: serviceTypes.length,
      pendingCount,
      regionsCount: regions.length,
    };
  }

  async getPartnerById(partnerId: string) {
    const member = await PowerTeamMember.findById(partnerId);
    if (!member) throw new NotFoundError('Partner not found');
    return toAdminPartner(member);
  }

  async createPartner(input: AdminPartnerInput) {
    const { isActive, isVerified } = statusToFlags(input.status);
    const member = await PowerTeamMember.create({
      name: input.name,
      category: input.category,
      categoryLabel: input.categoryLabel ?? '',
      region: input.region,
      contactEmail: input.email,
      phone: input.phone,
      bio: input.bio,
      website: input.website ?? '',
      isActive,
      isVerified,
    });
    logger.info('Power Team partner created', { partnerId: member._id });
    return toAdminPartner(member);
  }

  async updatePartner(partnerId: string, input: Partial<AdminPartnerInput>) {
    const update: Record<string, unknown> = {};
    if (input.name !== undefined) update.name = input.name;
    if (input.category !== undefined) update.category = input.category;
    if (input.categoryLabel !== undefined) update.categoryLabel = input.categoryLabel;
    if (input.region !== undefined) update.region = input.region;
    if (input.email !== undefined) update.contactEmail = input.email;
    if (input.phone !== undefined) update.phone = input.phone;
    if (input.bio !== undefined) update.bio = input.bio;
    if (input.website !== undefined) update.website = input.website;
    if (input.status !== undefined) {
      const { isActive, isVerified } = statusToFlags(input.status);
      update.isActive = isActive;
      update.isVerified = isVerified;
    }

    const member = await PowerTeamMember.findByIdAndUpdate(partnerId, update, { new: true });
    if (!member) throw new NotFoundError('Partner not found');
    return toAdminPartner(member);
  }

  async deletePartner(partnerId: string) {
    const member = await PowerTeamMember.findByIdAndUpdate(partnerId, { deletedAt: new Date() }, { new: true });
    if (!member) throw new NotFoundError('Partner not found');
    logger.info('Power Team partner soft-deleted', { partnerId });
  }

  async uploadLogo(partnerId: string, file: UploadedFile) {
    const member = await PowerTeamMember.findById(partnerId);
    if (!member) throw new NotFoundError('Partner not found');

    const { url } = await storageProvider.upload(file, `power-team/${partnerId}`);
    member.logoUrl = url;
    await member.save();

    logger.info('Power Team partner logo uploaded', { partnerId, url });
    return toAdminPartner(member);
  }
}

export const adminPowerTeamService = new AdminPowerTeamService();

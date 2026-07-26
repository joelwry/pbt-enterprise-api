import { Types } from 'mongoose';
import {
  CommunityThread,
  CommunityAnnouncement,
  ICommunityThread,
  IReply,
} from '@/modules/community/schemas/Community.schema';
import { Leader } from '@/modules/leaders/schemas/Leader.schema';
import { subscriptionService } from '@/modules/subscriptions/services/subscription.service';

type AuthorRoleTag = 'PBT Leader' | 'Power Team' | 'PBT Plus' | 'PBT Mentorship' | null;

interface AuthorLike {
  _id: Types.ObjectId;
  fullName: string;
}

function initialsFor(fullName: string): string {
  return (
    fullName
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'PB'
  );
}

export function timeAgoLabel(date: Date, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * "Power Team" is intentionally never returned here -- Power Team partners
 * are an external professional directory with no platform login, so a
 * Community post author can never actually be one.
 */
export async function roleTagFor(userId: string): Promise<AuthorRoleTag> {
  const leader = await Leader.findOne({ userId, isActive: true });
  if (leader) return 'PBT Leader';

  const subscription = await subscriptionService.getCurrentSubscription(userId);
  if (subscription && subscriptionService.isSubscriptionValid(subscription)) {
    if (subscription.tier === 'mentorship') return 'PBT Mentorship';
    if (subscription.tier === 'plus') return 'PBT Plus';
  }
  return null;
}

export async function toReplyDto(reply: IReply, author: AuthorLike | null) {
  return {
    id: reply._id.toString(),
    authorName: author?.fullName ?? 'Deleted Member',
    authorInitials: author ? initialsFor(author.fullName) : '?',
    roleTag: author ? await roleTagFor(author._id.toString()) : null,
    message: reply.content,
    postedAtLabel: timeAgoLabel(reply.createdAt),
  };
}

export async function toDiscussionListDto(thread: ICommunityThread, currentUserId: string) {
  const author = thread.authorId as unknown as AuthorLike | null;
  const excerptLength = 160;
  return {
    id: thread._id.toString(),
    authorName: author?.fullName ?? 'Deleted Member',
    authorInitials: author ? initialsFor(author.fullName) : '?',
    roleTag: author ? await roleTagFor(author._id.toString()) : null,
    pinned: thread.isPinned,
    title: thread.title,
    excerpt: thread.content.length > excerptLength ? `${thread.content.slice(0, excerptLength)}…` : thread.content,
    fullBody: thread.content,
    replyCount: thread.replies.length,
    likeCount: thread.likedBy.length,
    likedByMe: thread.likedBy.some((id) => id.toString() === currentUserId),
    postedAtLabel: timeAgoLabel(thread.createdAt),
    // Cheap placeholder -- the list view only ever renders replyCount, never
    // individual replies, so this avoids populating every thread's replies
    // (and each reply's author) just to satisfy the shared Discussion type.
    replies: [] as Awaited<ReturnType<typeof toReplyDto>>[],
  };
}

export async function toDiscussionDetailDto(thread: ICommunityThread, currentUserId: string) {
  const author = thread.authorId as unknown as AuthorLike | null;
  const excerptLength = 160;
  const replies = await Promise.all(
    thread.replies.map((reply) => toReplyDto(reply, reply.authorId as unknown as AuthorLike | null))
  );

  return {
    id: thread._id.toString(),
    authorName: author?.fullName ?? 'Deleted Member',
    authorInitials: author ? initialsFor(author.fullName) : '?',
    roleTag: author ? await roleTagFor(author._id.toString()) : null,
    pinned: thread.isPinned,
    title: thread.title,
    excerpt: thread.content.length > excerptLength ? `${thread.content.slice(0, excerptLength)}…` : thread.content,
    fullBody: thread.content,
    replyCount: thread.replies.length,
    likeCount: thread.likedBy.length,
    likedByMe: thread.likedBy.some((id) => id.toString() === currentUserId),
    postedAtLabel: timeAgoLabel(thread.createdAt),
    replies,
  };
}

export async function getCommunityMeta() {
  const [announcement, spotlightLeader] = await Promise.all([
    CommunityAnnouncement.findOne({ isActive: true }).sort({ createdAt: -1 }),
    Leader.findOne({ isTopMentor: true, isActive: true }).sort({ createdAt: -1 }),
  ]);

  return {
    pinnedAnnouncement: announcement
      ? {
          id: announcement._id.toString(),
          badgeLabel: 'Pinned Announcement',
          title: announcement.title,
          body: announcement.body,
          postedByLabel: `Posted by Admin · ${timeAgoLabel(announcement.createdAt)}`,
          ctaLabel: announcement.ctaLabel,
          ctaHref: announcement.ctaHref,
        }
      : null,
    leaderSpotlight: spotlightLeader
      ? {
          name: spotlightLeader.fullName,
          initials: initialsFor(spotlightLeader.fullName),
          groupLabel: spotlightLeader.location ? `${spotlightLeader.location} Group` : spotlightLeader.region,
          badgeLabel: `Top Mentor ${new Date().getFullYear()}`,
        }
      : null,
    // Community Groups (membership) are a known, deliberately deferred gap --
    // no group/membership model exists yet. See the progress log.
    groups: [] as { id: string; name: string; membership: 'Member' | 'Join' }[],
    guidelinesUrl: '/community/guidelines',
  };
}

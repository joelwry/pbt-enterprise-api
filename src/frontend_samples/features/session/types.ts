export type MembershipTier = "Pathway" | "Plus" | "Mentorship";

export interface CurrentMember {
  id: string;
  clientId: string;
  fullName: string;
  initials: string;
  email: string;
  avatarUrl?: string;
  membershipTier: MembershipTier;
}

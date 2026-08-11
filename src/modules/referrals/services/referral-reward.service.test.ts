import { calculateReferralReward, REFERRAL_REWARD_PERCENTAGE } from './referral-reward.service';

describe('calculateReferralReward', () => {
  // Part 9, tests 1-3: the three tier defaults the client gave as worked examples.
  it('Pathway first payment £99 -> reward £9.90', () => {
    expect(calculateReferralReward(99)).toBe(9.9);
  });

  it('Plus first payment £249 -> reward £24.90', () => {
    expect(calculateReferralReward(249)).toBe(24.9);
  });

  it('Mentorship first payment £449 -> reward £44.90', () => {
    expect(calculateReferralReward(449)).toBe(44.9);
  });

  it('uses the current rate (10%) by default', () => {
    expect(REFERRAL_REWARD_PERCENTAGE).toBe(10);
    expect(calculateReferralReward(100)).toBe(10);
  });

  it('rounds to 2 decimal places for amounts that do not divide cleanly', () => {
    expect(calculateReferralReward(33.33)).toBe(3.33);
  });

  it('accepts an explicit historical rate instead of the current constant', () => {
    expect(calculateReferralReward(100, 5)).toBe(5);
  });

  it('rejects a negative payment amount', () => {
    expect(() => calculateReferralReward(-10)).toThrow();
  });

  it('returns 0 for a £0 payment (no reward, but not an error)', () => {
    expect(calculateReferralReward(0)).toBe(0);
  });
});

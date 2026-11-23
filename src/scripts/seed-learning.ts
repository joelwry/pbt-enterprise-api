import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import { Roadmap } from '@/modules/learning/schemas/Roadmap.schema';
import { RoadmapWeek } from '@/modules/learning/schemas/RoadmapWeek.schema';
import {
  Lesson,
  LessonType,
  MembershipTier,
  Module,
} from '@/modules/learning/schemas/Learning.schema';

interface LessonSeedInput {
  title: string;
  type: LessonType;
  category: string;
  month: number;
  author?: string;
  metaLabel: string;
  isDraft: boolean;
  requiredTier?: MembershipTier;
  driveUrl: string;
  durationOrSizeLabel: string;
  summary: string;
}

interface ModuleSeedInput {
  moduleNumber: number;
  title: string;
  description: string;
  lessons: LessonSeedInput[];
}

interface WeekSeedInput {
  weekNumber: number;
  month: number;
  title: string;
  description: string;
  isCheckpoint?: boolean;
  modules: ModuleSeedInput[];
}

const COHORT_YEAR = '2026';
const ROADMAP_TITLE = 'PBT Pathway Curriculum';
const ROADMAP_DESCRIPTION =
  'Ongoing, structured UK property investment curriculum covering investor foundations, credit readiness, power team assembly, Buy-to-Let, Serviced Accommodation, HMOs, and deal sourcing.';

// Base release anchor (Week 1 Monday; each subsequent week unlocks +7 days)
const WEEK_1_RELEASE_ANCHOR = new Date('2026-01-05T09:00:00.000Z');

function getWeekUnlockDate(weekNumber: number): Date {
  const date = new Date(WEEK_1_RELEASE_ANCHOR);
  date.setUTCDate(date.getUTCDate() + (weekNumber - 1) * 7);
  return date;
}

const CURRICULUM_DATA: WeekSeedInput[] = [
  // =========================================================================
  // WEEK 1: CUSTOMER JOURNEY, FOUNDATION STAGE & GOAL SETTING
  // =========================================================================
  {
    weekNumber: 1,
    month: 1,
    title: 'Week 01 — Customer Journey, Foundation Stage & Goal Setting',
    description:
      'Welcome onboarding, the 6-Stage Structured Investor Journey, the 7 pillars of the Foundation Stage, and interactive goal-setting workbooks.',
    modules: [
      {
        moduleNumber: 0,
        title: 'Introduction — Welcome to PBT Pathway',
        description:
          'Programme orientation, weekly 2–3 hour study commitment, fortnightly mastermind sessions, and community onboarding.',
        lessons: [
          {
            title: 'Welcome to PBT Pathway & Community Onboarding (Final Welcome)',
            type: 'Video',
            category: 'Onboarding & Orientation',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 3.20 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1u_MBaFSC1dJCC1wDbs2cwr0dRZ3GmBR6/view?usp=drivesdk',
            durationOrSizeLabel: '3.20 GB (MP4)',
            summary:
              'Final Recording Take 3: Welcome to Property Business Training, how the ongoing Pathway works, and community onboarding.',
          },
          {
            title: 'Congratulation Tape 1 — Welcome & 2–3 Hrs/Week Commitment (Take 1)',
            type: 'Video',
            category: 'Onboarding & Orientation',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 3.32 GB • Alternate Take',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1DuCpVUfDtwahP8NYHNz9IhRJDsksmmu5/view?usp=drivesdk',
            durationOrSizeLabel: '3.32 GB (MP4)',
            summary:
              'Final Recording Take 1: Welcome overview and weekly study commitment.',
          },
          {
            title: 'Congratulation Tape 2 — Welcome & Fortnightly Sessions (Take 2)',
            type: 'Video',
            category: 'Onboarding & Orientation',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 3.20 GB • Alternate Take',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1bb6nf0oRbQPp16JokArXqOlNZt1qJUTj/view?usp=drivesdk',
            durationOrSizeLabel: '3.20 GB (MP4)',
            summary:
              'Final Recording Take 2: Welcome overview and fortnightly Q&A/mastermind structure.',
          },
          {
            title: '001 — Congratulation (Weekly Release WIP Cut)',
            type: 'Video',
            category: 'Weekly Release',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video (MOV) • Weekly Release WIP',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1j0IUGhVJqZR2PiAc5I95QMPKOl1FR669/view?usp=drivesdk',
            durationOrSizeLabel: 'MOV • Weekly Release',
            summary:
              'Weekly Release WIP Week 001 welcome video clip.',
          },
        ],
      },
      {
        moduleNumber: 1,
        title: 'Module 01 — Introduction & The Investor Journey',
        description:
          'Understanding the 6-Stage Structured Investor Journey from Foundation through Execution and Scale.',
        lessons: [
          {
            title: 'The Investor Journey — Part 1: Stages 1–2 (Final)',
            type: 'Video',
            category: 'Foundation & Strategy',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 3.94 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1PFhBwxgmrs2STTyukT97xpsqlPvJPjbd/view?usp=drivesdk',
            durationOrSizeLabel: '3.94 GB (MP4)',
            summary:
              '1st Tape Final (Part 1): Deep dive into Stages 1 and 2 of the 6-Stage Structured Investor Journey.',
          },
          {
            title: 'The Investor Journey — Part 2: Stages 3–6 & The Golden Rule (Final)',
            type: 'Video',
            category: 'Foundation & Strategy',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 3.36 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1bfnEAms7LNCCnoyqdZXmxAz1gxRiRrEJ/view?usp=drivesdk',
            durationOrSizeLabel: '3.36 GB (MP4)',
            summary:
              '1st Tape Final (Part 2): Stages 3 through 6 of the Investor Journey and the Golden Rule of property investing.',
          },
          {
            title: 'The Investor Journey — 2nd Tape Part 1 (Stages 1–4)',
            type: 'Video',
            category: 'Foundation & Strategy',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.04 GB • Alternate Take',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1gvVLwfeBOmq8LkHlPA115HrqRQud3pms/view?usp=drivesdk',
            durationOrSizeLabel: '4.04 GB (MP4)',
            summary: '2nd Tape (Part 1): Stages 1–4 of the Investor Journey.',
          },
          {
            title: 'The Investor Journey — 2nd Tape Part 2 Final (Stages 4–6)',
            type: 'Video',
            category: 'Foundation & Strategy',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 3.91 GB • Alternate Take',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1Chus6-gcKfxgGp_hDEOfGx4liiwLQQzd/view?usp=drivesdk',
            durationOrSizeLabel: '3.91 GB (MP4)',
            summary: '2nd Tape Final (Part 2): Stages 4–6 of the Investor Journey.',
          },
          {
            title: 'The Investor Journey — 3rd Tape Part 1 (Stages 1–2)',
            type: 'Video',
            category: 'Foundation & Strategy',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.05 GB • Alternate Take',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1WSyBCVj105GSjsmh1zoonskUI8KQ2Qa6/view?usp=drivesdk',
            durationOrSizeLabel: '4.05 GB (MP4)',
            summary: '3rd Tape (Part 1): Stages 1–2 of the Investor Journey.',
          },
          {
            title: 'The Investor Journey — 3rd Tape Part 2 (Stages 3–6)',
            type: 'Video',
            category: 'Foundation & Strategy',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 3.98 GB • Alternate Take',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1lRWgDpzClZLASnTg3uG_IfGCbm1rKUyk/view?usp=drivesdk',
            durationOrSizeLabel: '3.98 GB (MP4)',
            summary: '3rd Tape (Part 2): Stages 3–6 of the Investor Journey.',
          },
          {
            title: '002 — Investor Journey v2 (Weekly Release WIP Cut)',
            type: 'Video',
            category: 'Weekly Release',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video (MOV) • Weekly Release WIP',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1-bxPal7HsMf2E-0I4JaxZwW85wTQ_8x5/view?usp=drivesdk',
            durationOrSizeLabel: 'MOV • Weekly Release',
            summary: 'Weekly Release WIP Week 001 Investor Journey video cut.',
          },
        ],
      },
      {
        moduleNumber: 2,
        title: 'Module 02 — Foundation Stage (Stage 01) & Goal Setting',
        description:
          'The 7 core areas of Stage 01: defining your "Why", SMART goal horizons, financial & credit position, core fundamentals, investor identity, time planning, skill gaps, and your personal Investment Box.',
        lessons: [
          {
            title: 'Foundation Stage 1 — Goal Setting, Defining Your "Why" & SMART Goals',
            type: 'Video',
            category: 'Foundation & Strategy',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.00 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1iGf0DBuNlt-sUsoy0l5j4eDhwf7SMngJ/view?usp=drivesdk',
            durationOrSizeLabel: '4.00 GB (MP4)',
            summary:
              'Area 1 of the Foundation Stage: clarifying your lifestyle "Why" and structuring measurable SMART property goals.',
          },
          {
            title: 'Foundation Stage 2 — Goal Horizons & Financial / Credit Position',
            type: 'Video',
            category: 'Foundation & Strategy',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.25 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1pVUuKNAlL_TfqecyFcyUFnWpX5CZSNGV/view?usp=drivesdk',
            durationOrSizeLabel: '4.25 GB (MP4)',
            summary:
              'Short-, medium-, and long-term goal horizons plus Area 2: auditing your current financial position and credit profile.',
          },
          {
            title: 'Foundation Stage 3 — Available Capital & Property Fundamentals',
            type: 'Video',
            category: 'Foundation & Strategy',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.25 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1WjwWFEDcnqGeM2atGtGLBRuIrG8mgeu4/view?usp=drivesdk',
            durationOrSizeLabel: '4.25 GB (MP4)',
            summary:
              'Assessing deployable capital/equity and Area 3: mastering Cash Flow, Capital Growth, Yield, and Leverage.',
          },
          {
            title: 'Foundation Stage 4 — Investor Identity & Time Planning',
            type: 'Video',
            category: 'Foundation & Strategy',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.25 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/10WVP4aDbn02kAUJSCT9rYYtu8dXwWu9O/view?usp=drivesdk',
            durationOrSizeLabel: '4.25 GB (MP4)',
            summary:
              'Area 4: Investor Identity (calculated risk vs. speculation) and Area 5: weekly time allocation and planning.',
          },
          {
            title: 'Foundation Stage 5 — Skill Gaps & Building Your Support Network',
            type: 'Video',
            category: 'Foundation & Strategy',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.25 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1bUzhpBm1YM09YZ5vXYmFODXZNO-DyQh0/view?usp=drivesdk',
            durationOrSizeLabel: '4.25 GB (MP4)',
            summary:
              'Identifying personal skill gaps and Area 6: assembling your Power Team and support network.',
          },
          {
            title: 'Foundation Stage 6 — Defining Your Personal Investment Criteria ("Investment Box")',
            type: 'Video',
            category: 'Foundation & Strategy',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.25 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1sxMbtqFci3WuDeBYqQWBICCTOVOj2ilC/view?usp=drivesdk',
            durationOrSizeLabel: '4.25 GB (MP4)',
            summary:
              'Area 7: Locking in your personal Investment Box (budget, location, yield floor, and strategy fit).',
          },
          {
            title: 'Foundation Stage 7 — Wrap-Up (Incomplete — Missing Final Sentences)',
            type: 'Video',
            category: 'Foundation & Strategy',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 1.56 GB • Incomplete Clip',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1Z_fa4fvRQSoiCQ0KwtscK1rwcM6OBrxL/view?usp=drivesdk',
            durationOrSizeLabel: '1.56 GB (MP4)',
            summary:
              'Flagged in Drive as missing the final few sentences; kept as draft until re-exported.',
          },
          {
            title: '003 — Foundation Stage (Weekly Release WIP Cut)',
            type: 'Video',
            category: 'Weekly Release',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video (MOV) • Weekly Release WIP',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1aOvUnld7PofpyPnviW1h7u2RkSjzxLHM/view?usp=drivesdk',
            durationOrSizeLabel: 'MOV • Weekly Release',
            summary: 'Weekly Release WIP Week 001 Foundation Stage overview clip.',
          },
        ],
      },
      {
        moduleNumber: 3,
        title: 'Module 03 — Goal Setting Guide & Interactive Workbooks',
        description:
          'Actionable client workbooks and implementation guides to translate your vision into a 30–90 day execution plan.',
        lessons: [
          {
            title: 'Client User Guide — Implementation Manual & 30–90 Day Goal Review System',
            type: 'PDF',
            category: 'Workbooks & Guides',
            month: 1,
            author: 'PBT Team',
            metaLabel: 'PDF Guide • 107 KB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1f-K7cWcn-Rg6OfxoqzmhmCIx4phGCTW_/view?usp=drivesdk',
            durationOrSizeLabel: 'PDF • 107 KB',
            summary:
              'Step-by-step client implementation manual and 30–90 day goal tracking cadence.',
          },
          {
            title: 'Property Goal Setting & Vision — Interactive Client Workbook (Final)',
            type: 'PDF',
            category: 'Workbooks & Guides',
            month: 1,
            author: 'PBT Team',
            metaLabel: 'Interactive PDF Workbook • 416 KB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1i_aN-MOfpQi8SGCW2XhC90lcIW3s8EGy/view?usp=drivesdk',
            durationOrSizeLabel: 'PDF • 416 KB',
            summary:
              'Fillable interactive workbook covering lifestyle vision, SMART targets, and monthly cash flow goals.',
          },
          {
            title: 'Property Goal Setting Worksheet (Weekly Release Edition)',
            type: 'PDF',
            category: 'Workbooks & Guides',
            month: 1,
            author: 'PBT Team',
            metaLabel: 'PDF Worksheet • 2 Pages',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1_TzYvaVNfL1HpEI8-7qWfCXSx9xrFz_1/view?usp=drivesdk',
            durationOrSizeLabel: 'PDF • 2 Pages',
            summary:
              '2-page printable worksheet from Weekly Release Week 001 covering financial freedom numbers, resource audit, and 90-day action plan.',
          },
        ],
      },
    ],
  },

  // =========================================================================
  // WEEK 2: CREDIT SCORE & YOUR POWER TEAM
  // =========================================================================
  {
    weekNumber: 2,
    month: 1,
    title: 'Week 02 — Credit Profile Mastery & Assembling Your Power Team',
    description:
      'Preparing your credit profile for UK buy-to-let and commercial lenders, followed by hiring and vetting the 9 essential property specialists.',
    modules: [
      {
        moduleNumber: 4,
        title: 'Module 04 — Credit Score & How to Improve It',
        description:
          'How UK lenders assess credit files (Experian, Equifax, TransUnion/Checkmyfile), line-by-line report audits, utilization optimization, and a 3–6 month readiness plan.',
        lessons: [
          {
            title: 'Credit Score 001 — Why Credit Profile Matters to Lenders & Pulling Reports',
            type: 'Video',
            category: 'Financing & Credit',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.15 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1InU93TzOg2eN8oIR5tkuCH-TpKStHrHN/view?usp=drivesdk',
            durationOrSizeLabel: '4.15 GB (MP4)',
            summary:
              '1st Tape (Part 1): Understanding lender underwriting criteria and pulling multi-agency UK credit reports.',
          },
          {
            title: 'Credit Score 002 — Auditing Reports Line-by-Line & Step 1: On-Time Payments',
            type: 'Video',
            category: 'Financing & Credit',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.25 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1FebnCJ8GUgxzAVp6EnFulywMVURq_PIa/view?usp=drivesdk',
            durationOrSizeLabel: '4.25 GB (MP4)',
            summary:
              '1st Tape (Part 2): Conducting a line-by-line credit audit and establishing spotless payment history.',
          },
          {
            title: 'Credit Score 003 — Steps 2–5: Utilization, Applications, Disputes & Debt List',
            type: 'Video',
            category: 'Financing & Credit',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.25 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1iY3WyOC0idIUjykoHj6P36L_bMsCDIo3/view?usp=drivesdk',
            durationOrSizeLabel: '4.25 GB (MP4)',
            summary:
              '1st Tape (Part 3): Managing credit utilization, spacing hard searches, disputing errors, and structuring a debt payoff list.',
          },
          {
            title: 'Credit Score 004 — Step 6: Account Longevity, Electoral Roll & Mindset',
            type: 'Video',
            category: 'Financing & Credit',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.25 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1i4eoyUtaoMMfPRCDmR7Q4quC-lXLgRTE/view?usp=drivesdk',
            durationOrSizeLabel: '4.25 GB (MP4)',
            summary:
              '1st Tape (Part 4): Keeping mature accounts open, updating address/electoral details, and disciplined borrowing habits.',
          },
          {
            title: 'Credit Score 005 — Investor A vs. Investor B Case Study & 3–6 Month Plan',
            type: 'Video',
            category: 'Financing & Credit',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.25 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1wN0fwuPOLBFK-jDCFtgWYZpezZpSBWXU/view?usp=drivesdk',
            durationOrSizeLabel: '4.25 GB (MP4)',
            summary:
              '1st Tape (Part 5): Comparing real mortgage rate outcomes between Investor A and Investor B plus a 3–6 month action roadmap.',
          },
          {
            title: 'Credit Score 006 — Module Summary: Prepare First, Invest Later',
            type: 'Video',
            category: 'Financing & Credit',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 1.12 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1kjj5xm3cam4zPKo6xGNdK6bTMNPSpOXx/view?usp=drivesdk',
            durationOrSizeLabel: '1.12 GB (MP4)',
            summary:
              '1st Tape (Part 6): Key takeaways and pre-application checklist before approaching a mortgage broker.',
          },
          {
            title: 'Credit Score Tape 2 — Part 001: Credit Profile & Lender Assessment',
            type: 'Video',
            category: 'Financing & Credit',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 2.87 GB • Alternate Take',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1L-fSX4EAt1EBDzfOwQryBSViet6j3Zpn/view?usp=drivesdk',
            durationOrSizeLabel: '2.87 GB (MP4)',
            summary: 'Tape 2 (Part 1): Credit profile and lender assessment.',
          },
          {
            title: 'Credit Score Tape 2 — Part 02: Savings vs. Borrowing Power & Audit',
            type: 'Video',
            category: 'Financing & Credit',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.25 GB • Alternate Take',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1rLf5M5CLf8frJhwhfqalx5yeJgtE537B/view?usp=drivesdk',
            durationOrSizeLabel: '4.25 GB (MP4)',
            summary: 'Tape 2 (Part 2): Savings vs. borrowing power and line-by-line audit.',
          },
          {
            title: 'Credit Score Tape 2 — Part 03: Check-Plan-Apply System & Direct Debits',
            type: 'Video',
            category: 'Financing & Credit',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.25 GB • Alternate Take',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1xXAM-edPbuRX2t929JPpZNEhXOLaXU3M/view?usp=drivesdk',
            durationOrSizeLabel: '4.25 GB (MP4)',
            summary: 'Tape 2 (Part 3): Check-Plan-Apply system, direct debits, and utilization.',
          },
          {
            title: 'Credit Score Tape 2 — Part 04: Utilization Ratios & Strategic Borrowing',
            type: 'Video',
            category: 'Financing & Credit',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 1.04 GB • Alternate Take',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1YfJCXfICWlRg72YPnTXs1d66N3riKqWM/view?usp=drivesdk',
            durationOrSizeLabel: '1.04 GB (MP4)',
            summary: 'Tape 2 (Part 4): Credit utilization ratios and strategic borrowing.',
          },
          {
            title: '004 — Credit Score - Why it matters (Weekly Release WIP Cut)',
            type: 'Video',
            category: 'Weekly Release',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video (MOV) • Weekly Release WIP',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1Gv0RLEbsm4EUDkYfmYxMYYHQAXM3SYRT/view?usp=drivesdk',
            durationOrSizeLabel: 'MOV • Weekly Release',
            summary: 'Weekly Release WIP Week 002 Credit Score overview clip.',
          },
        ],
      },
      {
        moduleNumber: 5,
        title: 'Module 05 — Your Power Team',
        description:
          'Complete 10-part training covering every UK property specialist (Mortgage Broker, Solicitor, Accountant, Insurance Broker, Letting Agent, Mentor, RICS Surveyor, Property Manager, Deal Sourcer) and how to vet and instruct them.',
        lessons: [
          {
            title: 'Power Team 001 — Introduction & Role 1: Whole-of-Market Mortgage Broker',
            type: 'Video',
            category: 'Power Team',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.13 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1M8vnESszj3VhA679K9a5n0ZwGMrwybYD/view?usp=drivesdk',
            durationOrSizeLabel: '4.13 GB (MP4)',
            summary:
              'Why leverage requires a specialist team and how to select a whole-of-market property mortgage broker.',
          },
          {
            title: 'Power Team 002 — Role 2: Specialist Property Solicitor & Accountant Intro',
            type: 'Video',
            category: 'Power Team',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.06 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1O8e3uzhLCvAd03rWixRKvGrvgPnsj0Zv/view?usp=drivesdk',
            durationOrSizeLabel: '4.06 GB (MP4)',
            summary:
              'Instructing a responsive property conveyancing solicitor and introducing tax structuring.',
          },
          {
            title: 'Power Team 003 — Role 3: Property Tax Accountant & Role 4: Insurance Broker',
            type: 'Video',
            category: 'Power Team',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.25 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1ClIkMn5Kh-oHKUXkEaXN9QewbBw8ixOj/view?usp=drivesdk',
            durationOrSizeLabel: '4.25 GB (MP4)',
            summary:
              'SPV vs. personal tax planning with a property accountant and specialist landlord/renovation insurance.',
          },
          {
            title: 'Power Team 004 — Insurance Continued, Letting Agent & Property Mentor',
            type: 'Video',
            category: 'Power Team',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.25 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1ydXpzXPb7b3kYpWBXOZbHHSstAz1vYbh/view?usp=drivesdk',
            durationOrSizeLabel: '4.25 GB (MP4)',
            summary:
              'Specialist cover clauses, Role 5: High-performing Letting Agents, and Role 6: Selecting a Property Mentor.',
          },
          {
            title: 'Power Team 005 — Vetting a Mentor & Role 7: RICS Surveyor / Building Specialist',
            type: 'Video',
            category: 'Power Team',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.14 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1d3tvCxbiKgCIsc-Qne9NwR6nhQT0Sr6F/view?usp=drivesdk',
            durationOrSizeLabel: '4.14 GB (MP4)',
            summary:
              'Due diligence on mentors and when to commission RICS Level 2/3 surveys and structural inspections.',
          },
          {
            title: 'Power Team 006 — Role 8: Property Manager & Retaining Investor Oversight',
            type: 'Video',
            category: 'Power Team',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.04 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1bL2G-lvxlmlm9FMMFMehEn38Th2ArrfQ/view?usp=drivesdk',
            durationOrSizeLabel: '4.04 GB (MP4)',
            summary:
              'Delegating day-to-day tenant management while keeping KPI and compliance oversight.',
          },
          {
            title: 'Power Team 007 — Role 9: Property Sourcer & 3-Step Team-Building Framework',
            type: 'Video',
            category: 'Power Team',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.25 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1bWkIBP0mnnOfuRsbY3eNDqfQ_yv6mgmx/view?usp=drivesdk',
            durationOrSizeLabel: '4.25 GB (MP4)',
            summary:
              'Compliance checks for deal sourcers (PRS/TPO, ICO, AML) and the 3-step framework to build your team.',
          },
          {
            title: 'Power Team 008 (Pt 2) — Interviewing Specialists & Complete Power Team Checklist',
            type: 'Video',
            category: 'Power Team',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.25 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1eJOY3_EXmSGMdOaChtGYI_B5V8_aBlFW/view?usp=drivesdk',
            durationOrSizeLabel: '4.25 GB (MP4)',
            summary:
              'Exact vetting questions to ask every professional before instructing them on a deal.',
          },
          {
            title: 'Power Team 008 (Pt 3) — Due Diligence, Trust, VAT Clarity & In-House PBT Team',
            type: 'Video',
            category: 'Power Team',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.03 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1O3PvcMzoaP8-fJrgaXa8463EmaubO5uq/view?usp=drivesdk',
            durationOrSizeLabel: '4.03 GB (MP4)',
            summary:
              'Quote transparency, VAT on professional fees, and leveraging PBT’s vetted specialist network.',
          },
          {
            title: 'Power Team 008 (Pt 4) — Module Closing & PBT Plus / Mentorship Power Team Access',
            type: 'Video',
            category: 'Power Team',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 242 MB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/139EBGO21plX7_VeIRbxJ_fldF1cgXxMu/view?usp=drivesdk',
            durationOrSizeLabel: '242 MB (MP4)',
            summary:
              'Module 05 wrap-up and how PBT Plus and Mentorship members connect directly with PBT Power Team partners.',
          },
          {
            title: '005 — Power Team (Weekly Release WIP Cut)',
            type: 'Video',
            category: 'Weekly Release',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video (MOV) • Weekly Release WIP',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1uRLUmntoJ5iFKLo8TAGVGDCexDHAQHYn/view?usp=drivesdk',
            durationOrSizeLabel: 'MOV • Weekly Release',
            summary: 'Weekly Release WIP Week 002 Power Team summary clip.',
          },
        ],
      },
    ],
  },

  // =========================================================================
  // WEEK 3: STRATEGY SELECTION & BUY-TO-LET MASTERY
  // =========================================================================
  {
    weekNumber: 3,
    month: 1,
    title: 'Week 03 — Investment Strategy Selection & Buy-to-Let (BTL) Mastery',
    description:
      'Comparing UK property strategies (Stage 02) and mastering the complete Buy-to-Let acquisition, viewing, cash-on-cash, and 10-step deal stress-testing system.',
    modules: [
      {
        moduleNumber: 6,
        title: 'Module 06 — Strategy Knowledge (Stage 02 of the Investor Journey)',
        description:
          'Evaluating BTL, Basic HMO, BRRR HMO, Flipping, and Commercial strategies against your capital, risk tolerance, and available time.',
        lessons: [
          {
            title: 'Strategy Analysis — Part 1: Choosing Your Investment Vehicle',
            type: 'Video',
            category: 'Strategy Selection',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 233 MB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1RXVFIhRTihR12zWmxZcw1_Yt_3W66_dD/view?usp=drivesdk',
            durationOrSizeLabel: '233 MB (MOV)',
            summary:
              'Stage 02 introduction: matching your Investment Box to the right property strategy.',
          },
          {
            title: 'Strategy Analysis — Part 2: BTL, Basic HMO, BRRR HMO, Flipping & Commercial',
            type: 'Video',
            category: 'Strategy Selection',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 201 MB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1xl0nx_MzXOdS1Zln5rg_In4TdNITmlAl/view?usp=drivesdk',
            durationOrSizeLabel: '201 MB (MOV)',
            summary:
              'Side-by-side breakdown of core UK property strategies, capital requirements, and return profiles.',
          },
          {
            title: 'Strategy Analysis — Part 3: Aligning Strategy with Capital, Risk & Time',
            type: 'Video',
            category: 'Strategy Selection',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 231 MB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1NOcQ3wsDPdGB-pHx-OY-qPsjFBLtBtG1/view?usp=drivesdk',
            durationOrSizeLabel: '231 MB (MOV)',
            summary:
              'Filtering strategies using deployable funds, risk appetite, and hands-on vs. hands-off time.',
          },
          {
            title: 'Strategy Analysis — Part 4: Transitioning into Buy-to-Let & Roadmap',
            type: 'Video',
            category: 'Strategy Selection',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 152 MB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1jLbJ68chnHwdzPxv4nkQa4aeOIkht0kp/view?usp=drivesdk',
            durationOrSizeLabel: '152 MB (MOV)',
            summary:
              'Building foundational competence in Buy-to-Let before scaling into multi-let or BRRR projects.',
          },
          {
            title: 'Strategy Analysis — Take 2 Revised: BTL, Basic HMO & BRRR HMO Deep Dive',
            type: 'Video',
            category: 'Strategy Selection',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 402 MB • Revised Cut',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1r_Uc2abwIKNxex1-KWYdxiQ0OXvkaxHF/view?usp=drivesdk',
            durationOrSizeLabel: '402 MB (MOV)',
            summary:
              'Revised strategy comparison comparing single-let BTL against Basic HMO and BRRR HMO.',
          },
        ],
      },
      {
        moduleNumber: 7,
        title: 'Module 07 — Buy-to-Let (BTL) Complete Mastery',
        description:
          'Complete 25-item Buy-to-Let training across Part 1 (Fundamentals, Location & Rental Demand), Section B (Buying Steps, Viewing Inspection & Cash-on-Cash Worked Examples), and Section C (10-Step Deal Analysis & Risk Formula).',
        lessons: [
          // Main Folder (Part 1 + Reference PDF)
          {
            title: 'BTL Part 1 (001) — Introduction & How Buy-to-Let Generates Returns',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.13 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1s6QmBHV57iqyfXJBvUamoHon-3iHklC_/view?usp=drivesdk',
            durationOrSizeLabel: '4.13 GB (MP4)',
            summary:
              'How single-let Buy-to-Let generates net monthly cash flow, mortgage paydown, and long-term equity growth.',
          },
          {
            title: 'BTL Part 1 (002) — Investment Criteria, Deposit Budget & Upfront Fees',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 2.72 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/11j1pjTzobtErr0L4ZUwwaXlmc8UK55xi/view?usp=drivesdk',
            durationOrSizeLabel: '2.72 GB (MP4)',
            summary:
              'Calculating 25% BTL deposits, SDLT surcharge, legal fees, broker fees, and reserve buffers.',
          },
          {
            title: 'BTL Part 1 (003) — Property Types & Price Range Comparison (£200k vs. £300k)',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.10 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1HcvfhRFf4lSZny9vb6PO4SC3C3TnDT3Q/view?usp=drivesdk',
            durationOrSizeLabel: '4.10 GB (MP4)',
            summary:
              'Comparing entry price brackets (£200k vs. £300k) for yield compression and capital deployment.',
          },
          {
            title: 'BTL Part 1 (004) — Target Rent Validation & Gross Yield Formula',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 2.40 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1xIVicnfdNmiFzDzdw_kk0KssDXq0z9DU/view?usp=drivesdk',
            durationOrSizeLabel: '2.40 GB (MP4)',
            summary:
              'Validating achievable market rent and applying the Gross Yield formula accurately.',
          },
          {
            title: 'BTL Part 1 (005) — Selecting Property Types & Realistic Price Ranges',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 3.57 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1nqfQ3bHM99aC1XMpxez1uuIhN1_aYDBn/view?usp=drivesdk',
            durationOrSizeLabel: '3.57 GB (MP4)',
            summary:
              'Freehold terraced/semi-detached houses vs. leasehold flats, service charges, and tenant longevity.',
          },
          {
            title: 'BTL Part 1 (006) — Net Cash Flow vs. Gross Yield & Rightmove Comps',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.19 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1aVSbmbhw-ryEP28Zpnxw5zU36457M8Iz/view?usp=drivesdk',
            durationOrSizeLabel: '4.19 GB (MP4)',
            summary:
              'Why Gross Yield can mislead and how to verify sold and let-agreed comparables on Rightmove.',
          },
          {
            title: 'BTL Part 1 (007) — Location Fundamentals, Employment Hubs & "Walking the Street"',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.13 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1JL5531DpzO01B-EJECjkVpn3A8p6y9ds/view?usp=drivesdk',
            durationOrSizeLabel: '4.13 GB (MP4)',
            summary:
              'Micro-location due diligence: walking target streets, assessing upkeep, and mapping employment anchors.',
          },
          {
            title: 'BTL Part 1 (008) — Price Range Returns & Realistic Rental Comps',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.18 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1KbSlGy4LYvTd9zVNXcG0aXAyCfEOL73E/view?usp=drivesdk',
            durationOrSizeLabel: '4.18 GB (MP4)',
            summary:
              'Stress-testing rental assumptions against conservative local comparables.',
          },
          {
            title: 'BTL Part 1 (009) — Assessing Rental Demand: Hospitals, Transport & Schools',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.12 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1x1RCRk4W82GI7q8k7pPAMd_6rKkrNbec/view?usp=drivesdk',
            durationOrSizeLabel: '4.12 GB (MP4)',
            summary:
              'Evaluating structural tenant demand drivers: NHS hospitals, rail links, universities, and Ofsted school catchments.',
          },
          {
            title: 'BTL Part 1 (010) — Working with Local Estate Agents & Regeneration Zones',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.17 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1g4fJP22HSdsys_lORAulsVfli9xwAa_Q/view?usp=drivesdk',
            durationOrSizeLabel: '4.17 GB (MP4)',
            summary:
              'Building relationships with local letting/estate agents and spotting infrastructure regeneration.',
          },
          {
            title: 'BTL Part 1 (011) — Part 1 Recap & Preview of Buying Steps',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 191 MB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/10c3ALIv_BontCIpy3oYGKH7O4Al-s7Rw/view?usp=drivesdk',
            durationOrSizeLabel: '191 MB (MOV)',
            summary:
              'Summary of BTL Part 1 fundamentals before moving into physical viewings and worked numbers.',
          },
          {
            title: 'BTL Numbers for Reference — Acquisition Costs & Worked Cash-on-Cash Examples',
            type: 'PDF',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'PBT Team',
            metaLabel: 'PDF Reference Note • 2.46 MB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1KIndo-lP-zFqC-ypYfT46MLoP8NlZXFD/view?usp=drivesdk',
            durationOrSizeLabel: 'PDF • 2.46 MB',
            summary:
              'Companion PDF reference note detailing BTL acquisition costs and worked Cash-on-Cash return examples.',
          },

          // Section B (Steps of Buying, Viewing & Worked Examples)
          {
            title: 'BTL Section B (001) — Step-by-Step Process of Buying a BTL Property',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.14 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1LSHAKmS9fI7JPjdHYDevJja1XiM7h6w2/view?usp=drivesdk',
            durationOrSizeLabel: '4.14 GB (MP4)',
            summary:
              'End-to-end acquisition workflow from Agreement in Principle and offer negotiation to exchange and completion.',
          },
          {
            title: 'BTL Section B (002) — True Acquisition Costs: Deposit, SDLT, Legal & Broker Fees',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 3.02 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1XQDk5qx0ROIF682-N3Oh-krDFhk1t96z/view?usp=drivesdk',
            durationOrSizeLabel: '3.02 GB (MP4)',
            summary:
              'Itemizing every upfront purchase cost so no hidden fee erodes your initial capital.',
          },
          {
            title: 'BTL Section B (003) — Ongoing Operating Costs, 5% Contingency & External Viewing',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.01 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1P9qnjjKy2acNkBO4yTyIyqx4EH8-IcD-/view?usp=drivesdk',
            durationOrSizeLabel: '4.01 GB (MP4)',
            summary:
              'Budgeting management fees, voids, maintenance, 5% contingency, and external property viewing checks.',
          },
          {
            title: 'BTL Section B (004) — Internal Viewing Checks, Building Regs & 3 Contractor Quotes',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.25 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/11GE54xSsVGBdtgfD8ZWFCQktkSkOXJDr/view?usp=drivesdk',
            durationOrSizeLabel: '4.25 GB (MP4)',
            summary:
              'Verifying building regulations sign-offs and obtaining 3 like-for-like contractor quotes.',
          },
          {
            title: 'BTL Section B (005) — Viewing as an Investor: External & Internal Structural/Damp Check',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 3.92 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1HGb26lF6bu46RaFX6lbqDxg7vnGEN0nt/view?usp=drivesdk',
            durationOrSizeLabel: '3.92 GB (MP4)',
            summary:
              'Spotting roof defects, pointing issues, penetrating/rising damp, and structural movement during viewings.',
          },
          {
            title: 'BTL Section B (006) — Inspecting Radiators, Bathrooms, Insulation & Viewing Diligence',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 850 MB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1TglEh11qCERzpUNoNjPYEq_A8b8jfvHF/view?usp=drivesdk',
            durationOrSizeLabel: '850 MB (MP4)',
            summary:
              'Practical internal checklist: heating systems, wet areas, EPC insulation, and consumer units.',
          },
          {
            title: 'BTL Section B (007) — Vendor Due Diligence Questions: Boiler, Roof & Damp History',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 318 MB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1EFyjMKSmUqjjrjX_vY6GqkSQsOp_I-sg/view?usp=drivesdk',
            durationOrSizeLabel: '318 MB (MP4)',
            summary:
              'Key questions to ask the seller and estate agent before submitting an offer.',
          },
          {
            title: 'BTL Section B (008) — Worked Example Setup: £250k Purchase + £20k Refurb',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 673 MB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1DTkJjpHTW4tecjIuDS-tCAQ4LGstgVlz/view?usp=drivesdk',
            durationOrSizeLabel: '673 MB (MP4)',
            summary:
              'Setting up the £250,000 purchase + £20,000 refurbishment deal (£102.5k total cash deployed).',
          },
          {
            title: 'BTL Section B (009) — Worked Cash Flow Calculation: £20k Refurb Scenario',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.15 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1GNqz11csol9YVn8hxOQCo7t1iMY_csBQ/view?usp=drivesdk',
            durationOrSizeLabel: '4.15 GB (MP4)',
            summary:
              'Line-by-line monthly income, mortgage interest, and operating cost calculation on the £20k refurb scenario.',
          },
          {
            title: 'BTL Section B (010) — Comparing Cash-on-Cash Return: 6.1% (Refurb) vs. 4.6% (No Refurb)',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.25 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1IYSb5n4ziPiLxunqGztABEaRbjtw8lPL/view?usp=drivesdk',
            durationOrSizeLabel: '4.25 GB (MP4)',
            summary:
              'Comparing how value-add refurbishment lifts Cash-on-Cash return from 4.6% to 6.1%.',
          },

          // Section C (The Deal Analysis Formula)
          {
            title: 'BTL Section C (001) — The 10-Step BTL Deal Analysis Formula & Stress-Testing',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 4.19 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1xlxbo7pehcafgNV-K8QuzIOb7K2n9yl4/view?usp=drivesdk',
            durationOrSizeLabel: '4.19 GB (MP4)',
            summary:
              'Walking through the 10-Step BTL Deal Analysis Formula and interest-rate/void stress testing.',
          },
          {
            title: 'BTL Section C (002) — Realistic Assumptions, Walking Away & Module 07 Conclusion',
            type: 'Video',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 2.28 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1lS0Z2x41DuS0geuMoEMci1KxZB5xjOuA/view?usp=drivesdk',
            durationOrSizeLabel: '2.28 GB (MP4)',
            summary:
              'Discipline in underwriting: avoiding emotional overbidding and knowing when to walk away.',
          },
          {
            title: 'The BTL Deal Analysis Layout — 10-Step Visual Framework',
            type: 'PDF',
            category: 'Buy-to-Let (BTL)',
            month: 1,
            author: 'PBT Team',
            metaLabel: 'Infographic (PNG) • 1.55 MB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/16P33imMcj9WzscwHsDkGSyCE9Hvc7neS/view?usp=drivesdk',
            durationOrSizeLabel: 'PNG Infographic • 1.55 MB',
            summary:
              'Visual 10-step BTL Deal Analysis and risk stress-test reference diagram.',
          },
          {
            title: 'Video 006 — Buy To Let - Strategy 001 (Weekly Release WIP Cut)',
            type: 'Video',
            category: 'Weekly Release',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video (MOV) • Weekly Release WIP',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1Mqrx_Ebo9eCrXyQyI8x5sz6xLk7QYAWr/view?usp=drivesdk',
            durationOrSizeLabel: 'MOV • Weekly Release',
            summary: 'Weekly Release WIP Week 003 Buy-to-Let overview clip.',
          },
        ],
      },
    ],
  },

  // =========================================================================
  // WEEK 4: SERVICED ACCOMMODATION & CORPORATE LETS — PART 1
  // =========================================================================
  {
    weekNumber: 4,
    month: 1,
    title: 'Week 04 — Serviced Accommodation & Corporate Lets (Part 1)',
    description:
      'Serviced Accommodation and Corporate Let business models, contractor/corporate demand drivers, presentation slides, and Q&A worked numbers.',
    modules: [
      {
        moduleNumber: 801,
        title: 'Module 08 (Part 1) — Serviced Accommodation & Corporate Let Fundamentals',
        description:
          'Core SA and Corporate Let acquisition models (ownership vs. Rent-to-SA), corporate client demand, slide deck, and worked Q&A guide.',
        lessons: [
          {
            title: 'Serviced Accommodation & Corporate Let — Part 1: Fundamentals, Demand & Models',
            type: 'Video',
            category: 'Serviced Accommodation',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video • 1.15 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1HwRz61A5on1mpGA4pnNYfFhzPJTS5neO/view?usp=drivesdk',
            durationOrSizeLabel: '1.15 GB (MOV)',
            summary:
              'Final Recording Part 1: Serviced Accommodation & Corporate Let fundamentals, demand profiling, and operating models.',
          },
          {
            title: 'Serviced Accommodation & Corporate Let — Part 1 Presentation Deck',
            type: 'PDF',
            category: 'Serviced Accommodation',
            month: 1,
            author: 'PBT Team',
            metaLabel: 'Slides (PPTX) • 1.17 GB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1sxFd03Mlnx6xaOh_y6XHfhDWgwM5sCOZ/view?usp=drivesdk',
            durationOrSizeLabel: 'PPTX Deck • 1.17 GB',
            summary:
              'Companion PowerPoint presentation deck for Serviced Accommodation & Corporate Let Part 1.',
          },
          {
            title: 'Module 08 Extras — Reflection Questions, Worked SA Numbers & Q&A Guide',
            type: 'PDF',
            category: 'Serviced Accommodation',
            month: 1,
            author: 'PBT Team',
            metaLabel: 'Word Guide (DOCX) • 29 KB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1zLRlt_kPPRHCbEY2maM-fa80Vi2kiUcw/view?usp=drivesdk',
            durationOrSizeLabel: 'DOCX Guide • 29 KB',
            summary:
              'Companion DOCX guide containing reflection questions, worked SA occupancy/nightly-rate numbers, and Q&A.',
          },
          {
            title: 'Video 007 — Service Accommodation-Corporate Let Pt 01 (Weekly Release WIP Cut)',
            type: 'Video',
            category: 'Weekly Release',
            month: 1,
            author: 'Kudirat',
            metaLabel: 'Video (MOV) • Weekly Release WIP',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/15DZ0P3TRsR8EziXssQ51ZZLLxqwU_aU5/view?usp=drivesdk',
            durationOrSizeLabel: 'MOV • Weekly Release',
            summary:
              'Weekly Release WIP Week 004 Serviced Accommodation Part 1 video cut.',
          },
        ],
      },
    ],
  },

  // =========================================================================
  // WEEK 5: SERVICED ACCOMMODATION — PART 2 (PROPERTY SETUP & 90-DAY PLAN)
  // =========================================================================
  {
    weekNumber: 5,
    month: 2,
    title: 'Week 05 — Serviced Accommodation Property Setup & 90-Day Action Plan',
    description:
      'Furnishing standards, guest experience, channel management systems, and the 90-Day Serviced Accommodation & Corporate Let launch plan.',
    modules: [
      {
        moduleNumber: 802,
        title: 'Module 08 (Part 2) — SA Property Setup & 90-Day Implementation Plan',
        description:
          'Turning a property into a high-occupancy SA unit, operational automation, slide deck, and Days 1–90 launch roadmap.',
        lessons: [
          {
            title: 'Serviced Accommodation & Corporate Let — Part 2: Property Setup & Systems',
            type: 'Video',
            category: 'Serviced Accommodation',
            month: 2,
            author: 'Kudirat',
            metaLabel: 'Video • 511 MB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/15Bxj9ruNn_aVcoxAEooNNlsSddDccJkj/view?usp=drivesdk',
            durationOrSizeLabel: '511 MB (MOV)',
            summary:
              'Final Recording Part 2: Furnishing standards, photography, guest check-in automation, and housekeeping workflows.',
          },
          {
            title: 'Serviced Accommodation & Corporate Let — Part 2 Presentation Deck',
            type: 'PDF',
            category: 'Serviced Accommodation',
            month: 2,
            author: 'PBT Team',
            metaLabel: 'Slides (PPTX) • 574 MB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1NMVLQ1KDmzl6BQQTae47bu1aZpCoe3rN/view?usp=drivesdk',
            durationOrSizeLabel: 'PPTX Deck • 574 MB',
            summary:
              'Companion PowerPoint presentation deck for Serviced Accommodation Property Setup (Part 2).',
          },
          {
            title: 'SA & Corporate Let Business Pt 3 — The 90-Day Detail Action Plan (PDF)',
            type: 'PDF',
            category: 'Serviced Accommodation',
            month: 2,
            author: 'PBT Team',
            metaLabel: 'PDF Action Plan • Weekly Release',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1bLleqx4uwzu4DANSp9KG9NBx9kkAxNsw/view?usp=drivesdk',
            durationOrSizeLabel: 'PDF Action Plan',
            summary:
              'Days 1–30 (market research & guest profiling), Days 31–60 (outreach & deal finding), and Days 61–90 (setup, launch & stress testing).',
          },
          {
            title: 'SA & Corporate Let Business Pt 3 — The 90-Day Detail Action Plan (Editable DOCX)',
            type: 'PDF',
            category: 'Serviced Accommodation',
            month: 2,
            author: 'PBT Team',
            metaLabel: 'Word Action Plan (DOCX) • 365 KB',
            isDraft: false,
            driveUrl:
              'https://drive.google.com/file/d/1PL9vtYG-jWagOSAy-FaKj6ybpv_FDs8K/view?usp=drivesdk',
            durationOrSizeLabel: 'DOCX • 365 KB',
            summary:
              'Editable DOCX version of the 90-Day Serviced Accommodation & Corporate Let Action Plan from Module 08.',
          },
          {
            title: 'Video 007 — Service Accommodation-Corporate Let Pt 02 (Weekly Release WIP Cut)',
            type: 'Video',
            category: 'Weekly Release',
            month: 2,
            author: 'Kudirat',
            metaLabel: 'Video (MOV) • Weekly Release WIP',
            isDraft: true,
            driveUrl:
              'https://drive.google.com/file/d/1bVRXYWUmWWhkckYpddtzahisSZf8FEWB/view?usp=drivesdk',
            durationOrSizeLabel: 'MOV • Weekly Release',
            summary:
              'Weekly Release WIP Week 005 Serviced Accommodation Part 2 video cut.',
          },
        ],
      },
    ],
  },

  // =========================================================================
  // WEEKS 6–12: UPCOMING CURRICULUM MODULES (PLACEHOLDER CONTAINERS)
  // =========================================================================
  {
    weekNumber: 6,
    month: 2,
    title: 'Week 06 — Location Analysis (Stage 03) & Rightmove Research',
    description:
      'Evaluating target investment areas and using third-party property portals (Rightmove) for data-backed area research.',
    modules: [
      {
        moduleNumber: 1001,
        title: 'Module 10A — Location Analysis (Stage 03)',
        description: 'Placeholder module container — awaiting Final Recording upload.',
        lessons: [],
      },
      {
        moduleNumber: 1002,
        title: 'Module 10B — Using 3rd-Party Portals (Rightmove Walkthrough)',
        description: 'Placeholder module container — awaiting Final Recording upload.',
        lessons: [],
      },
    ],
  },
  {
    weekNumber: 7,
    month: 2,
    title: 'Week 07 — Advanced Deal Analysis (Stage 04)',
    description: 'Deep-dive deal appraisal across single-let and multi-let opportunities.',
    modules: [
      {
        moduleNumber: 11,
        title: 'Module 11 — Deal Analysis (Stage 04)',
        description: 'Placeholder module container — awaiting Final Recording upload.',
        lessons: [],
      },
    ],
  },
  {
    weekNumber: 8,
    month: 2,
    title: 'Week 08 — Running the Numbers & Financial Modelling',
    description: 'Detailed underwriting spreadsheets, sensitivity checks, and return metrics.',
    modules: [
      {
        moduleNumber: 12,
        title: 'Module 12 — The Numbers',
        description: 'Placeholder module container — awaiting Final Recording upload.',
        lessons: [],
      },
    ],
  },
  {
    weekNumber: 9,
    month: 3,
    title: 'Week 09 — Basic HMO Strategy & Compliance',
    description: 'Houses in Multiple Occupation fundamentals, room-by-room yields, and licensing.',
    modules: [
      {
        moduleNumber: 13,
        title: 'Module 13 — Basic HMO',
        description: 'Placeholder module container — awaiting Final Recording upload.',
        lessons: [],
      },
    ],
  },
  {
    weekNumber: 10,
    month: 3,
    title: 'Week 10 — Direct-to-Vendor & Agent Deal Sourcing',
    description: 'Building consistent deal flow through estate agents, auctions, and direct outreach.',
    modules: [
      {
        moduleNumber: 14,
        title: 'Module 14 — Deal Sourcing',
        description: 'Placeholder module container — awaiting Final Recording upload.',
        lessons: [],
      },
    ],
  },
  {
    weekNumber: 11,
    month: 3,
    title: 'Week 11 — Scaling HMOs Using the BRRR Strategy',
    description: 'Buy–Refurbish–Rent–Refinance applied to HMO conversions to recycle capital.',
    modules: [
      {
        moduleNumber: 15,
        title: 'Module 15 — HMO Using the BRRR Strategy',
        description: 'Placeholder module container — awaiting Final Recording upload.',
        lessons: [],
      },
    ],
  },
  {
    weekNumber: 12,
    month: 3,
    title: 'Week 12 — Execution Mindset & Investor Accountability',
    description: 'Overcoming analysis paralysis and executing your 90-day acquisition plan.',
    modules: [
      {
        moduleNumber: 16,
        title: 'Module 16 — Execution Mindset',
        description: 'Placeholder module container — awaiting Final Recording upload.',
        lessons: [],
      },
    ],
  },

  // =========================================================================
  // WEEK 13: QUARTER 1 REVIEW CHECKPOINT
  // =========================================================================
  {
    weekNumber: 13,
    month: 3,
    title: 'Week 13 — Quarter 1 Review & Mastermind Checkpoint',
    description:
      'Milestone checkpoint week to review Quarter 1 progress, audit your Investment Box, and submit questions ahead of your Mastermind session.',
    isCheckpoint: true,
    modules: [],
  },
];

async function seedLearning(): Promise<void> {
  const isDryRun = process.argv.includes('--dry-run');
  const publishAllTakes = process.argv.includes('--publish-all');

  let totalWeeks = 0;
  let totalModules = 0;
  let totalLessons = 0;
  let publishedLessons = 0;
  let draftLessons = 0;

  for (const week of CURRICULUM_DATA) {
    totalWeeks += 1;
    for (const mod of week.modules) {
      totalModules += 1;
      for (const lesson of mod.lessons) {
        totalLessons += 1;
        const effectiveDraft = publishAllTakes ? false : lesson.isDraft;
        if (effectiveDraft) {
          draftLessons += 1;
        } else {
          publishedLessons += 1;
        }
      }
    }
  }

  console.log('====================================================================');
  console.log(`PBT Learning Curriculum Seeder (${isDryRun ? 'DRY RUN' : 'LIVE WRITE'})`);
  console.log('====================================================================');
  console.log(`Cohort Roadmap : ${ROADMAP_TITLE} (${COHORT_YEAR})`);
  console.log(`Roadmap Weeks  : ${totalWeeks}`);
  console.log(`Modules        : ${totalModules}`);
  console.log(
    `Lessons Total  : ${totalLessons} (${publishedLessons} published, ${draftLessons} draft/alternate takes)`
  );
  console.log('--------------------------------------------------------------------');

  if (isDryRun) {
    for (const week of CURRICULUM_DATA) {
      console.log(
        `[Week ${String(week.weekNumber).padStart(2, '0')}] ${week.title} (${getWeekUnlockDate(week.weekNumber).toISOString().slice(0, 10)})${week.isCheckpoint ? ' [CHECKPOINT]' : ''}`
      );
      for (const mod of week.modules) {
        console.log(`  └─ Module ${mod.moduleNumber}: ${mod.title} (${mod.lessons.length} items)`);
        for (const lesson of mod.lessons) {
          const statusTag = (publishAllTakes ? false : lesson.isDraft) ? 'DRAFT' : 'PUBLISHED';
          console.log(`       • [${statusTag}] [${lesson.type}] ${lesson.title}`);
        }
      }
    }
    console.log('--------------------------------------------------------------------');
    console.log('Dry run complete. No database changes were made.');
    return;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB.');

  try {
    // 1. Upsert Cohort Roadmap
    const roadmap = await Roadmap.findOneAndUpdate(
      { year: COHORT_YEAR },
      {
        $set: {
          title: ROADMAP_TITLE,
          year: COHORT_YEAR,
          description: ROADMAP_DESCRIPTION,
          isCurrent: true,
        },
      },
      { upsert: true, new: true }
    );
    console.log(`Upserted Roadmap: ${roadmap.title} (${roadmap.year}) -> ${roadmap._id}`);

    // 2. Upsert Weeks, Modules & Lessons
    for (const weekInput of CURRICULUM_DATA) {
      const unlocksAt = getWeekUnlockDate(weekInput.weekNumber);

      const roadmapWeek = await RoadmapWeek.findOneAndUpdate(
        { roadmapId: roadmap._id, weekNumber: weekInput.weekNumber },
        {
          $set: {
            roadmapId: roadmap._id,
            weekNumber: weekInput.weekNumber,
            title: weekInput.title,
            description: weekInput.description,
            isCheckpoint: Boolean(weekInput.isCheckpoint),
          },
        },
        { upsert: true, new: true }
      );

      for (const modInput of weekInput.modules) {
        const modDoc = await Module.findOneAndUpdate(
          { roadmapWeekId: roadmapWeek._id, moduleNumber: modInput.moduleNumber },
          {
            $set: {
              roadmapWeekId: roadmapWeek._id,
              moduleNumber: modInput.moduleNumber,
              title: modInput.title,
              description: modInput.description,
            },
            $unset: { deletedAt: 1 },
          },
          { upsert: true, new: true }
        );

        const orderedLessonIds: Types.ObjectId[] = [];

        for (const lessonInput of modInput.lessons) {
          const isVideo = lessonInput.type === 'Video';
          const isDraft = publishAllTakes ? false : lessonInput.isDraft;

          const body = isVideo
            ? {
                kind: 'video' as const,
                videoUrl: lessonInput.driveUrl,
                durationLabel: lessonInput.durationOrSizeLabel,
                summary: lessonInput.summary,
              }
            : {
                kind: 'pdf' as const,
                fileUrl: lessonInput.driveUrl,
                pageCountLabel: lessonInput.durationOrSizeLabel,
                summary: lessonInput.summary,
              };

          const lessonDoc = await Lesson.findOneAndUpdate(
            { moduleId: modDoc._id, title: lessonInput.title },
            {
              $set: {
                moduleId: modDoc._id,
                month: lessonInput.month,
                category: lessonInput.category,
                title: lessonInput.title,
                type: lessonInput.type,
                author: lessonInput.author ?? 'Kudirat',
                metaLabel: lessonInput.metaLabel,
                isDraft,
                access: {
                  unlocksAt,
                  requiredTier: lessonInput.requiredTier ?? 'Pathway',
                },
                body,
              },
              $unset: { deletedAt: 1 },
            },
            { upsert: true, new: true }
          );

          orderedLessonIds.push(lessonDoc._id as Types.ObjectId);
        }

        // Sync ordered lesson references onto the Module document
        modDoc.lessons = orderedLessonIds;
        await modDoc.save();
      }
    }

    console.log('--------------------------------------------------------------------');
    console.log(
      `Successfully seeded ${totalWeeks} weeks, ${totalModules} modules, and ${totalLessons} lessons (${publishedLessons} published, ${draftLessons} draft).`
    );
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

seedLearning()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Failed to seed learning curriculum:', err);
    process.exit(1);
  });


/**
 * Idempotent seed script for the PBT Resource Centre (`resources` collection).
 *
 * Usage:
 *   npx ts-node -r tsconfig-paths/register src/scripts/seed-resources.ts
 *
 * Optional flags:
 *   --dry-run                  Validate and print mapped documents without writing to MongoDB
 *   --created-by=<ObjectId>    Explicit User ObjectId to set as `createdBy` (defaults to first admin/super_admin)
 *   --publish-raw              Also publish raw .iMovieMobile / .conf files instead of keeping them as Drafts
 */
import { Types } from 'mongoose';
import { connectDB, disconnectDB } from '@/database/connection';
import { Resource, ResourceTier, ResourceType } from '@/modules/resources/schemas/Resource.schema';
import { User } from '@/modules/users/schemas/User.schema';

type CanonicalFileType = 'XLSX' | 'PDF' | 'MP4' | 'DOCX' | 'ZIP';

interface ResourceSeedEntry {
  title: string;
  description: string;
  type: ResourceType;
  requiredTier: ResourceTier;
  fileType: CanonicalFileType;
  metaLabel: string;
  fileUrl: string;
  folderPath: string;
  tags: string[];
  isDraft: boolean;
}

const RESOURCE_CENTRE_ITEMS: ResourceSeedEntry[] = [
  // =========================================================================
  // 1. Resource Centre (Root)
  // =========================================================================
  {
    title: 'Checklist - Property Investment Due-Diligence',
    description:
      'Comprehensive step-by-step due-diligence checklist covering legal title checks, property condition, local rental demand, financial stress-testing, and compliance verification before exchanging contracts on a UK investment property.',
    type: 'Checklist',
    requiredTier: 'Pathway',
    fileType: 'PDF',
    metaLabel: 'PDF Checklist',
    fileUrl: 'https://drive.google.com/file/d/1YZ_QWfpj0olYnPbTyOdXutj46Z8UztXv/view?usp=drivesdk',
    folderPath: 'Resource Centre (Root)',
    tags: ['due-diligence', 'checklist', 'acquisition', 'compliance', 'root'],
    isDraft: false,
  },
  {
    title: 'Useful Tools for Property Investors',
    description:
      'Curated directory of essential UK property research portals, comparables platforms, deal-analysis utilities, and portfolio management tools recommended by Property Business Training to streamline sourcing and underwriting.',
    type: 'Toolkit',
    requiredTier: 'Pathway',
    fileType: 'PDF',
    metaLabel: 'PDF Toolkit',
    fileUrl: 'https://drive.google.com/file/d/1hLJBw8YoxeiCuhRokoq7og1LByL7x7oH/view?usp=drivesdk',
    folderPath: 'Resource Centre (Root)',
    tags: ['tools', 'toolkit', 'research', 'sourcing', 'root'],
    isDraft: false,
  },
  {
    title: 'Analysis Summary - BTL vs BRRR',
    description:
      'Executive side-by-side comparison of Buy-to-Let (BTL) and Buy, Refurbish, Refinance, Rent (BRRR) strategies, contrasting upfront capital lock-up, forced appreciation, refinancing velocity, and long-term cash flow.',
    type: 'Guide',
    requiredTier: 'Pathway',
    fileType: 'PDF',
    metaLabel: 'PDF Guide',
    fileUrl: 'https://drive.google.com/file/d/199ANRxIfpLJSmWckseloP6vUaJx1qdVk/view?usp=drivesdk',
    folderPath: 'Resource Centre (Root)',
    tags: ['btl', 'brrr', 'strategy-comparison', 'buy-to-let', 'root'],
    isDraft: false,
  },
  {
    title: 'Analysing the Numbers - BTL vs BRRR',
    description:
      'Worked financial breakdown comparing identical deals structured as a standard Buy-to-Let versus a BRRR project, illustrating purchase costs, refurbishment budgets, GDV uplift, refinance proceeds, and capital left in the deal.',
    type: 'Worksheet',
    requiredTier: 'Pathway',
    fileType: 'PDF',
    metaLabel: 'Worked Numbers (PDF)',
    fileUrl: 'https://drive.google.com/file/d/1w56dTNVLBZA5eve2mbJ78qN-PX7oz1w_/view?usp=drivesdk',
    folderPath: 'Resource Centre (Root)',
    tags: ['btl', 'brrr', 'deal-analysis', 'cash-flow', 'numbers', 'root'],
    isDraft: false,
  },
  {
    title: 'Buy-to-Let Examples - Property Purchase Costs',
    description:
      'Real-world worked examples detailing full UK Buy-to-Let acquisition costs, including deposit requirements, Stamp Duty Land Tax (SDLT), conveyancing legal fees, mortgage broker fees, surveys, and initial setup contingencies.',
    type: 'Guide',
    requiredTier: 'Pathway',
    fileType: 'PDF',
    metaLabel: 'PDF Worked Examples',
    fileUrl: 'https://drive.google.com/file/d/1zACN9Ebe7tMI5bibINQuX8nKDC8d0zQI/view?usp=drivesdk',
    folderPath: 'Resource Centre (Root)',
    tags: ['btl', 'buy-to-let', 'purchase-costs', 'sdlt', 'acquisition', 'root'],
    isDraft: false,
  },
  {
    title: 'Calculator - Cash Flow After Refinance',
    description:
      'Post-refinance cash flow calculation sheet helping investors model net monthly rental profit after remortgaging onto a higher valuation, accounting for revised debt service, management fees, maintenance, and void buffers.',
    type: 'Worksheet',
    requiredTier: 'Pathway',
    fileType: 'PDF',
    metaLabel: 'Calculation Sheet (PDF)',
    fileUrl: 'https://drive.google.com/file/d/11RtSYDM8wMjCv7--dU1Q7lBBxQ9F15mX/view?usp=drivesdk',
    folderPath: 'Resource Centre (Root)',
    tags: ['brrr', 'refinance', 'cash-flow', 'calculator', 'yield', 'root'],
    isDraft: false,
  },
  {
    title: 'Key Property Strategies 2025 (25th Jan 2025 Session)',
    description:
      'Recorded training session exploring core UK property investment strategies for 2025—covering Buy-to-Let, BRRR, HMOs, and Serviced Accommodation—and how to match each strategy to your available capital, time, and risk profile.',
    type: 'Video',
    requiredTier: 'Pathway',
    fileType: 'MP4',
    metaLabel: 'MP4 Video Training',
    fileUrl: 'https://drive.google.com/file/d/1WJixA6-FhByshVEDdcSq1p4azpbOGo51/view?usp=drivesdk',
    folderPath: 'Resource Centre (Root)',
    tags: ['strategies', '2025', 'btl', 'brrr', 'hmo', 'serviced-accommodation', 'video', 'root'],
    isDraft: false,
  },
  {
    title: 'Serviced Accommodation - The 90-Day Rule',
    description:
      'Essential regulatory guide explaining the 90-day short-term let restriction in Greater London, planning permission implications, council enforcement risks, and compliant strategies for operating serviced accommodation.',
    type: 'Guide',
    requiredTier: 'Pathway',
    fileType: 'PDF',
    metaLabel: 'PDF Regulatory Guide',
    fileUrl: 'https://drive.google.com/file/d/1PWWsqso--sPfodO5iA83yNyC4w6PriVs/view?usp=drivesdk',
    folderPath: 'Resource Centre (Root)',
    tags: ['serviced-accommodation', '90-day-rule', 'regulation', 'london', 'compliance', 'root'],
    isDraft: false,
  },
  {
    title: 'Serviced Accommodation Workbook - 90-Day Blueprint',
    description:
      'Actionable 90-day implementation workbook for launching and scaling a Serviced Accommodation or Corporate Let unit, structured into 30-day execution sprints covering market research, deal sourcing, furnishing, and guest operations.',
    type: 'Worksheet',
    requiredTier: 'Pathway',
    fileType: 'PDF',
    metaLabel: 'PDF Action Workbook',
    fileUrl: 'https://drive.google.com/file/d/1t0OVDsHvD8Ot4w2ftxlL0zy8n5WdnP4G/view?usp=drivesdk',
    folderPath: 'Resource Centre (Root)',
    tags: ['serviced-accommodation', 'corporate-let', '90-day-blueprint', 'workbook', 'root'],
    isDraft: false,
  },
  {
    title: 'Valuation Pack and What It Entails',
    description:
      'Video walkthrough explaining how to compile a persuasive RICS Valuation Pack for commercial and BRRR remortgages—covering comparable sold evidence, schedule of works, rental appraisals, and before-and-after refurbishment documentation.',
    type: 'Video',
    requiredTier: 'Pathway',
    fileType: 'MP4',
    metaLabel: 'MP4 Video Guide',
    fileUrl: 'https://drive.google.com/file/d/1GFQ0SZ2Q1UHb01bW4zNFPSVv8w5Yc0HT/view?usp=drivesdk',
    folderPath: 'Resource Centre (Root)',
    tags: ['valuation-pack', 'rics', 'remortgage', 'brrr', 'refinance', 'video', 'root'],
    isDraft: false,
  },

  // =========================================================================
  // 2. Resource Centre -> BRRR Calculator
  // =========================================================================
  {
    title: 'BRRR Property Calculator (Interactive)',
    description:
      'Interactive browser-based BRRR deal calculator allowing investors to input purchase price, refurbishment costs, bridging finance, Gross Development Value (GDV), LTV refinance, and operating expenses to instantly calculate money left in and ROI.',
    type: 'Toolkit',
    requiredTier: 'Pathway',
    fileType: 'XLSX',
    metaLabel: 'Interactive HTML Calculator',
    fileUrl: 'https://drive.google.com/file/d/1nSv6hStJ66cDqh9EaTuFs2B8_6aGX74x/view?usp=drivesdk',
    folderPath: 'Resource Centre → BRRR Calculator',
    tags: ['brrr', 'calculator', 'interactive', 'gdv', 'roi', 'brrr-calculator'],
    isDraft: false,
  },
  {
    title: 'Calculator - 10-Point BRRR Calculation (PDF)',
    description:
      'Structured 10-point BRRR underwriting framework in PDF format walking through purchase price, SDLT, legals, refurbishment contingency, bridging interest, post-works GDV, refinance release, and net monthly cash flow.',
    type: 'Worksheet',
    requiredTier: 'Pathway',
    fileType: 'PDF',
    metaLabel: '10-Point Framework (PDF)',
    fileUrl: 'https://drive.google.com/file/d/18HVR95k-ks5l9QfslnyBCzkhktsMTP5e/view?usp=drivesdk',
    folderPath: 'Resource Centre → BRRR Calculator',
    tags: ['brrr', '10-point-calculation', 'underwriting', 'worksheet', 'brrr-calculator'],
    isDraft: false,
  },
  {
    title: 'Calculator - 10-Point BRRR Calculation (Editable Doc)',
    description:
      'Editable Google Doc version of the 10-Point BRRR Calculation template so investors can duplicate, customise, and save deal-by-deal underwriting notes for lenders, joint-venture partners, and personal records.',
    type: 'Template',
    requiredTier: 'Pathway',
    fileType: 'DOCX',
    metaLabel: 'Editable Google Doc',
    fileUrl: 'https://docs.google.com/document/d/1H23PzZH_S8ueHEk6RNaTxDpvHz8gwFx_qTpuM0k0PGM/edit?usp=drivesdk&ouid=112922970613792374167',
    folderPath: 'Resource Centre → BRRR Calculator',
    tags: ['brrr', '10-point-calculation', 'template', 'google-doc', 'brrr-calculator'],
    isDraft: false,
  },

  // =========================================================================
  // 3. Resource Centre -> Buying Property Via Auction
  // =========================================================================
  {
    title: 'Buying Property Via Auction - Full Video Masterclass',
    description:
      'Recorded training session on sourcing and acquiring UK properties at auction—covering auction catalogue analysis, legal pack red flags, pre-auction offers, bridging finance readiness, and bidding discipline on auction day.',
    type: 'Video',
    requiredTier: 'Pathway',
    fileType: 'MP4',
    metaLabel: 'MP4 Video Masterclass',
    fileUrl: 'https://drive.google.com/file/d/1KycXPBuFgpPV6G3pJyxnBtFklWqr063n/view?usp=drivesdk',
    folderPath: 'Resource Centre → Buying Property Via Auction',
    tags: ['auction', 'buying-via-auction', 'legal-pack', 'bridging-finance', 'video'],
    isDraft: false,
  },
  {
    title: 'Buying Property Via Auction - Audio Briefing',
    description:
      'Audio-only recording of the Buying Property Via Auction training session for on-the-go listening, covering legal pack due diligence, auction finance timelines, and avoiding costly bidding mistakes.',
    type: 'Download',
    requiredTier: 'Pathway',
    fileType: 'MP4',
    metaLabel: 'M4A Audio Recording',
    fileUrl: 'https://drive.google.com/file/d/1y1uLxg-djzQb8ERG30OqMy8cOwgeYtQn/view?usp=drivesdk',
    folderPath: 'Resource Centre → Buying Property Via Auction',
    tags: ['auction', 'buying-via-auction', 'audio', 'm4a'],
    isDraft: false,
  },

  // =========================================================================
  // 4. Resource Centre -> Credit Score - How to fix errors
  // =========================================================================
  {
    title: 'How to Fix a Credit Report Error (Editable Template)',
    description:
      'Editable Word document providing step-by-step instructions and formal dispute letter templates for challenging inaccurate defaults, missed payments, or outdated address links across Experian, Equifax, and TransUnion.',
    type: 'Template',
    requiredTier: 'Pathway',
    fileType: 'DOCX',
    metaLabel: 'Editable DOCX Template',
    fileUrl: 'https://drive.google.com/file/d/1kdI3pZqGeKfza4IaYE1u0DYncAJhpBYL/view?usp=drivesdk',
    folderPath: 'Resource Centre → Credit Score - How to fix errors',
    tags: ['credit-score', 'credit-report', 'dispute-template', 'mortgage-readiness', 'docx'],
    isDraft: false,
  },
  {
    title: 'How to Fix a Credit Report Error (Reference Guide)',
    description:
      'Printable PDF guide outlining how UK credit reference agencies score borrowers, how to audit statutory credit files line by line, and the exact dispute workflow to restore mortgage readiness before applying for BTL finance.',
    type: 'Guide',
    requiredTier: 'Pathway',
    fileType: 'PDF',
    metaLabel: 'PDF Reference Guide',
    fileUrl: 'https://drive.google.com/file/d/1q7D2kLVTjsJ8OSKDJSSnSd7y6wzegnQY/view?usp=drivesdk',
    folderPath: 'Resource Centre → Credit Score - How to fix errors',
    tags: ['credit-score', 'credit-report', 'mortgage-readiness', 'guide', 'pdf'],
    isDraft: false,
  },

  // =========================================================================
  // 5. Resource Centre -> Power Team Checklist
  // =========================================================================
  {
    title: 'Power Team Checklist for Property Investors, Developers & Business Owners (Editable)',
    description:
      'Editable Word checklist and vetting questionnaire for recruiting key property specialists—including whole-of-market mortgage brokers, property solicitors, tax accountants, RICS surveyors, letting agents, and contractors.',
    type: 'Template',
    requiredTier: 'Pathway',
    fileType: 'DOCX',
    metaLabel: 'Editable DOCX Checklist',
    fileUrl: 'https://drive.google.com/file/d/1cK1yElFKo5sjU2dHV7fgP7zPHAuQU8X6/view?usp=drivesdk',
    folderPath: 'Resource Centre → Power Team Checklist',
    tags: ['power-team', 'checklist', 'vetting', 'solicitor', 'mortgage-broker', 'docx'],
    isDraft: false,
  },
  {
    title: 'Power Team Checklist for Property Investors, Developers & Business Owners (PDF)',
    description:
      'Printable PDF checklist detailing the core professionals every UK property investor and developer needs in their Power Team, complete with interview questions, red flags, and onboarding criteria.',
    type: 'Checklist',
    requiredTier: 'Pathway',
    fileType: 'PDF',
    metaLabel: 'PDF Checklist',
    fileUrl: 'https://drive.google.com/file/d/1cvxCCZaUvWeWCCEWw3vTZH_iFjZfUxB-/view?usp=drivesdk',
    folderPath: 'Resource Centre → Power Team Checklist',
    tags: ['power-team', 'checklist', 'vetting', 'team-building', 'pdf'],
    isDraft: false,
  },
  {
    title: 'Deal Analysis Formula (Visual Reference)',
    description:
      'Visual infographic summarising the PBT Deal Analysis Formula—illustrating how gross rent, operating costs, mortgage debt service, yield, and cash-on-cash return fit together when evaluating a property acquisition.',
    type: 'Download',
    requiredTier: 'Pathway',
    fileType: 'PDF',
    metaLabel: 'PNG Infographic Diagram',
    fileUrl: 'https://drive.google.com/file/d/1nMeb3hPFZwaqeK3HOMFi-w9sS8WiQjQj/view?usp=drivesdk',
    folderPath: 'Resource Centre → Power Team Checklist',
    tags: ['deal-analysis', 'formula', 'infographic', 'png', 'underwriting'],
    isDraft: false,
  },

  // =========================================================================
  // 6. Resource Centre -> Stamp Duty Land Tax (SDLT)
  // =========================================================================
  {
    title: 'Stamp Duty Land Tax (SDLT) Guide & Calculation Notes (Editable)',
    description:
      'Editable Word document covering UK Stamp Duty Land Tax rules for residential Buy-to-Let purchases, additional property surcharges, limited company (SPV) acquisitions, and mixed-use or multi-dwelling considerations.',
    type: 'Template',
    requiredTier: 'Pathway',
    fileType: 'DOCX',
    metaLabel: 'Editable DOCX Guide',
    fileUrl: 'https://drive.google.com/file/d/1XBi-d4BfnGl-floSVEvr7piA8NLHatog/view?usp=drivesdk',
    folderPath: 'Resource Centre → Stamp Duty Land Tax (SDLT)',
    tags: ['sdlt', 'stamp-duty', 'tax', 'acquisition-costs', 'spv', 'docx'],
    isDraft: false,
  },
  {
    title: 'Stamp Duty Land Tax (SDLT) Reference Guide',
    description:
      'Comprehensive PDF breakdown of Stamp Duty Land Tax thresholds, higher rates for additional dwellings, SPV corporate purchases, and budgeting rules to incorporate into upfront deal appraisals.',
    type: 'Guide',
    requiredTier: 'Pathway',
    fileType: 'PDF',
    metaLabel: 'PDF Tax Guide',
    fileUrl: 'https://drive.google.com/file/d/1zLbKZiCyC0BRXg6bxPlvpyNyr1fduGum/view?usp=drivesdk',
    folderPath: 'Resource Centre → Stamp Duty Land Tax (SDLT)',
    tags: ['sdlt', 'stamp-duty', 'tax', 'uk-property-tax', 'pdf'],
    isDraft: false,
  },

  // =========================================================================
  // 7. Resource Centre -> The Renters Right Act 2025
  // =========================================================================
  {
    title: "The Renters' Rights Act 2025 - Landlord Compliance Notes (Editable)",
    description:
      "Editable Word briefing on the UK Renters' Rights Act 2025—summarising the abolition of Section 21 no-fault evictions, transition to periodic tenancies, revised possession grounds, rent review rules, and Decent Homes Standard obligations.",
    type: 'Template',
    requiredTier: 'Pathway',
    fileType: 'DOCX',
    metaLabel: 'Editable DOCX Briefing',
    fileUrl: 'https://drive.google.com/file/d/1Hd_PNvl0v8gBZsFdvzL9Qdzp-b7CEjRs/view?usp=drivesdk',
    folderPath: 'Resource Centre → The Renters Right Act 2025',
    tags: ['renters-rights-act-2025', 'legislation', 'compliance', 'section-21', 'landlord-law', 'docx'],
    isDraft: false,
  },
  {
    title: "The Renters' Rights Act 2025 - Complete Landlord Guide",
    description:
      "Detailed PDF compliance guide explaining what the Renters' Rights Act 2025 means for UK landlords, covering tenancy agreements, possession procedures, pet requests, bidding bans, and portfolio risk management.",
    type: 'Guide',
    requiredTier: 'Pathway',
    fileType: 'PDF',
    metaLabel: 'PDF Legislation Guide',
    fileUrl: 'https://drive.google.com/file/d/1c7yXsDXnwEOn3o6VpQjd3KqT9zpi3lOx/view?usp=drivesdk',
    folderPath: 'Resource Centre → The Renters Right Act 2025',
    tags: ['renters-rights-act-2025', 'legislation', 'compliance', 'landlord-law', 'pdf'],
    isDraft: false,
  },

  // =========================================================================
  // 8. Resource Centre -> Africa - Property Development and Investment
  // =========================================================================
  {
    title: 'Property Investing and Development in Nairobi (Kenya)',
    description:
      'Recorded session examining real estate investment and development opportunities in Nairobi, Kenya—covering high-growth neighbourhoods, land title verification, off-plan vs ground-up development, financing structures, and diaspora investor due diligence.',
    type: 'Video',
    requiredTier: 'Pathway',
    fileType: 'MP4',
    metaLabel: 'MP4 Video Session (Kenya)',
    fileUrl: 'https://drive.google.com/file/d/1SlYs6hiBaHWayRCedA3mqodpYGrZ7Gaa/view?usp=drivesdk',
    folderPath: 'Resource Centre → Africa - Property Development and Investment → Kenya',
    tags: ['africa', 'kenya', 'nairobi', 'property-development', 'diaspora-investing', 'video'],
    isDraft: false,
  },
  {
    title: 'Property Development and Investment in Nigeria - Video Session',
    description:
      'Recorded training session on property development and real estate investing in Nigeria—exploring land documentation (C of O, Governor’s Consent), joint-venture development models, construction cost management, and risk mitigation.',
    type: 'Video',
    requiredTier: 'Pathway',
    fileType: 'MP4',
    metaLabel: 'MP4 Video Session (Nigeria)',
    fileUrl: 'https://drive.google.com/file/d/1ySceFR7QgW6lv1S0rQEwjFwA2V32gGgG/view?usp=drivesdk',
    folderPath: 'Resource Centre → Africa - Property Development and Investment → Nigeria',
    tags: ['africa', 'nigeria', 'property-development', 'land-title', 'diaspora-investing', 'video'],
    isDraft: false,
  },
  {
    title: 'Property Development and Investment in Nigeria - Audio Briefing',
    description:
      'Audio recording of the Nigeria Property Development and Investment training session covering title due diligence, developer partnerships, currency considerations, and market entry strategies.',
    type: 'Download',
    requiredTier: 'Pathway',
    fileType: 'MP4',
    metaLabel: 'M4A Audio Recording (Nigeria)',
    fileUrl: 'https://drive.google.com/file/d/1Kbjfa--lWUhakAE5KqmeW3X1x_e_huhc/view?usp=drivesdk',
    folderPath: 'Resource Centre → Africa - Property Development and Investment → Nigeria',
    tags: ['africa', 'nigeria', 'property-development', 'audio', 'm4a'],
    isDraft: false,
  },

  // =========================================================================
  // 9. Raw Project Archives & Zoom Config Files (Seeded as Drafts by default)
  // =========================================================================
  {
    title: 'BRRR Overview - 6 Steps to Setting Up Your BRRR Strategy (iMovie Project)',
    description:
      'Raw iMovie mobile project archive covering the 6-step setup framework for a UK Buy, Refurbish, Refinance, Rent (BRRR) strategy. Export to MP4 before publishing to members.',
    type: 'Video',
    requiredTier: 'Pathway',
    fileType: 'ZIP',
    metaLabel: 'iMovie Archive (.iMovieMobile)',
    fileUrl: 'https://drive.google.com/file/d/1jFGtGbi5VTl3lUgZfdiU4fGIYbUbIWI5/view?usp=drivesdk',
    folderPath: 'Resource Centre (Root)',
    tags: ['brrr', '6-steps', 'imovie-archive', 'raw-asset', 'root'],
    isDraft: true,
  },
  {
    title: 'Co-Living - Why the Co-Living Business is Booming (iMovie Project)',
    description:
      'Raw iMovie mobile project archive examining the growth drivers, tenant demand, and yield advantages behind modern UK co-living and HMO property models. Export to MP4 before publishing to members.',
    type: 'Video',
    requiredTier: 'Pathway',
    fileType: 'ZIP',
    metaLabel: 'iMovie Archive (.iMovieMobile)',
    fileUrl: 'https://drive.google.com/file/d/1KRi6XVZQ02G5-3yZcWF0WROBR1WSOvRI/view?usp=drivesdk',
    folderPath: 'Resource Centre (Root)',
    tags: ['co-living', 'hmo', 'imovie-archive', 'raw-asset', 'root'],
    isDraft: true,
  },
  {
    title: 'How to Buy a Property - Overview (iMovie Project)',
    description:
      'Raw iMovie mobile project archive walking through the end-to-end UK property purchasing process from offer acceptance to exchange and completion. Export to MP4 before publishing to members.',
    type: 'Video',
    requiredTier: 'Pathway',
    fileType: 'ZIP',
    metaLabel: 'iMovie Archive (.iMovieMobile)',
    fileUrl: 'https://drive.google.com/file/d/1ZFWkWid4k_owp1Mompv6eXd9e78GNvKz/view?usp=drivesdk',
    folderPath: 'Resource Centre (Root)',
    tags: ['buying-process', 'overview', 'imovie-archive', 'raw-asset', 'root'],
    isDraft: true,
  },
  {
    title: 'Buying Property Via Auction - Recording Config (recording.conf)',
    description:
      'Zoom local recording metadata/configuration file accompanying the Buying Property Via Auction video and audio session.',
    type: 'Download',
    requiredTier: 'Pathway',
    fileType: 'DOCX',
    metaLabel: 'Recording Metadata (.conf)',
    fileUrl: 'https://drive.google.com/file/d/1mEvzrPmnArx3Ja9haUj-Ae2VbYP6EXz-/view?usp=drivesdk',
    folderPath: 'Resource Centre → Buying Property Via Auction',
    tags: ['auction', 'recording-config', 'raw-asset'],
    isDraft: true,
  },
  {
    title: 'Nigeria Property Development & Investment - Recording Config (recording.conf)',
    description:
      'Zoom local recording metadata/configuration file accompanying the Nigeria Property Development and Investment video and audio session.',
    type: 'Download',
    requiredTier: 'Pathway',
    fileType: 'DOCX',
    metaLabel: 'Recording Metadata (.conf)',
    fileUrl: 'https://drive.google.com/file/d/1D7YvQGCCT6dVk7Le68lw5XZAIOxlsh9A/view?usp=drivesdk',
    folderPath: 'Resource Centre → Africa - Property Development and Investment → Nigeria',
    tags: ['africa', 'nigeria', 'recording-config', 'raw-asset'],
    isDraft: true,
  },
];

function parseArgs() {
  const flags = new Set<string>();
  const kv = new Map<string, string>();
  for (const raw of process.argv.slice(2)) {
    const match = raw.match(/^--([^=]+)=(.*)$/);
    if (match) {
      kv.set(match[1], match[2]);
    } else if (raw.startsWith('--')) {
      flags.add(raw.slice(2));
    }
  }
  return { flags, kv };
}

async function resolveCreatorId(explicitId?: string): Promise<Types.ObjectId> {
  if (explicitId) {
    if (!Types.ObjectId.isValid(explicitId)) {
      throw new Error(`Invalid --created-by ObjectId: "${explicitId}"`);
    }
    return new Types.ObjectId(explicitId);
  }

  const adminUser = await User.findOne({ role: { $in: ['super_admin', 'admin'] }, isActive: true }).sort({
    createdAt: 1,
  });

  if (!adminUser) {
    throw new Error(
      'No active admin or super_admin user found in `users` collection. Run `src/scripts/create-admin.ts` first or pass --created-by=<userId>.'
    );
  }

  return adminUser._id as Types.ObjectId;
}

async function main() {
  const { flags, kv } = parseArgs();
  const isDryRun = flags.has('dry-run');
  const publishRaw = flags.has('publish-raw');
  const explicitCreator = kv.get('created-by');

  // Guard against accidental duplicate URLs in seed data
  const seenUrls = new Set<string>();
  for (const item of RESOURCE_CENTRE_ITEMS) {
    if (seenUrls.has(item.fileUrl)) {
      throw new Error(`Duplicate fileUrl detected in RESOURCE_CENTRE_ITEMS: ${item.fileUrl}`);
    }
    seenUrls.add(item.fileUrl);
  }

  if (isDryRun) {
    const publishedCount = RESOURCE_CENTRE_ITEMS.filter((i) => (publishRaw ? true : !i.isDraft)).length;
    const draftCount = RESOURCE_CENTRE_ITEMS.length - publishedCount;
    console.log(`[DRY RUN] Validated ${RESOURCE_CENTRE_ITEMS.length} unique Resource Centre items.`);
    console.log(`  Published: ${publishedCount} | Drafts: ${draftCount}`);
    for (const item of RESOURCE_CENTRE_ITEMS) {
      const effectiveDraft = publishRaw ? false : item.isDraft;
      console.log(
        `  - [${effectiveDraft ? 'DRAFT' : 'LIVE '}] (${item.type.padEnd(9)} | ${item.fileType.padEnd(4)}) ${item.title}`
      );
    }
    return;
  }

  await connectDB();

  const createdBy = await resolveCreatorId(explicitCreator);
  let inserted = 0;
  let updated = 0;

  for (const item of RESOURCE_CENTRE_ITEMS) {
    const isDraft = publishRaw ? false : item.isDraft;
    const existing = await Resource.findOne({ fileUrl: item.fileUrl });

    if (existing) {
      existing.title = item.title;
      existing.description = item.description;
      existing.type = item.type;
      existing.requiredTier = item.requiredTier;
      existing.fileType = item.fileType;
      existing.metaLabel = item.metaLabel;
      existing.tags = Array.from(new Set(item.tags.map((t) => t.toLowerCase())));
      existing.isActive = true;
      existing.isDraft = isDraft;
      await existing.save();
      updated++;
      console.log(`Updated: [${isDraft ? 'Draft' : 'Published'}] ${item.title}`);
    } else {
      await Resource.create({
        title: item.title,
        description: item.description,
        type: item.type,
        requiredTier: item.requiredTier,
        fileType: item.fileType,
        metaLabel: item.metaLabel,
        fileUrl: item.fileUrl,
        fileSize: 0,
        tags: Array.from(new Set(item.tags.map((t) => t.toLowerCase()))),
        downloads: 0,
        createdBy,
        isActive: true,
        isDraft,
        releasedAt: new Date(),
      });
      inserted++;
      console.log(`Inserted: [${isDraft ? 'Draft' : 'Published'}] ${item.title}`);
    }
  }

  console.log(`\nResource Centre seeding complete: ${inserted} inserted, ${updated} updated (${RESOURCE_CENTRE_ITEMS.length} total).`);
  await disconnectDB();
}

main().catch(async (error) => {
  console.error('Failed to seed Resource Centre:', error);
  await disconnectDB();
  process.exit(1);
});
/**
 * Branded HTML email layout. Email clients ignore external CSS and most
 * modern layout, so this is deliberately table-based with inline styles.
 * Colours are the PBT Design Guide tokens used by the web app
 * (see pbt-portal globals.css).
 */
import fs from 'fs';
import path from 'path';

/** Content-ID the header logo is embedded under (referenced as src="cid:pbt-logo"). */
export const LOGO_CID = 'pbt-logo';
const LOGO_PATH = path.resolve(process.cwd(), 'assets', 'email', 'pbt-logo.jpg');

function logoFileExists(): boolean {
  try {
    fs.accessSync(LOGO_PATH, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * The logo, as a nodemailer inline attachment. Embedding it (rather than
 * linking to the web app) means it shows in every inbox -- including in local
 * development, where a http://localhost link can't be fetched by the
 * recipient's mail client. Returns null when EMAIL_LOGO_URL is set (a hosted
 * logo is used instead) or the file is missing (the text fallback is used).
 */
export function getEmailLogoAttachment():
  | { filename: string; path: string; cid: string; contentDisposition: 'inline' }
  | null {
  if (process.env.EMAIL_LOGO_URL || !logoFileExists()) return null;
  return { filename: 'pbt-logo.jpg', path: LOGO_PATH, cid: LOGO_CID, contentDisposition: 'inline' };
}

const BRAND = {
  navy950: '#0d0a30',
  navy900: '#130f40',
  sky600: '#1e8fc4',
  sky500: '#26aae1',
  skyTint: '#e8f6fc',
  orange500: '#f18d00',
  bg: '#f5f8fa',
  card: '#ffffff',
  border: '#e2e8ed',
  textPrimary: '#1f2937',
  textSecondary: '#47565e',
  textMuted: '#6b7b84',
};

const FONT = `'Inter','Segoe UI',Helvetica,Arial,sans-serif`;
const DISPLAY_FONT = `'Manrope','Segoe UI',Helvetica,Arial,sans-serif`;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** A "bulletproof" call-to-action button (works in Outlook, Gmail, Apple Mail). */
export function emailButton(label: string, url: string): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px 0;">
      <tr>
        <td align="center" bgcolor="${BRAND.sky600}" style="border-radius:12px;">
          <a href="${url}" target="_blank"
             style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;background-color:${BRAND.sky600};">
            ${escapeHtml(label)}
          </a>
        </td>
      </tr>
    </table>`;
}

/** Small tinted info box, e.g. for expiry notes or plan summaries. */
export function emailNote(innerHtml: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 0 0;">
      <tr>
        <td style="background-color:${BRAND.skyTint};border-radius:12px;padding:14px 18px;font-family:${FONT};font-size:14px;line-height:1.6;color:${BRAND.textSecondary};">
          ${innerHtml}
        </td>
      </tr>
    </table>`;
}

export function emailParagraph(innerHtml: string): string {
  return `<p style="margin:0 0 16px 0;font-family:${FONT};font-size:16px;line-height:1.7;color:${BRAND.textSecondary};">${innerHtml}</p>`;
}

export interface EmailLayoutOptions {
  /** Hidden inbox-preview text shown next to the subject line. */
  preheader: string;
  heading: string;
  /** Body HTML -- build it from emailParagraph / emailButton / emailNote. */
  bodyHtml: string;
  /** Link shown under the button so the URL is still usable if the button is blocked. */
  fallbackUrl?: string;
  frontendUrl: string;
}

export function renderEmailLayout(opts: EmailLayoutOptions): string {
  // The real PBT logo (hosted URL if EMAIL_LOGO_URL is set, otherwise the
  // embedded copy). It sits in a white tile, like the web app's BrandMark, so
  // if the image is blocked or fails to load the tile shows the styled "PBT"
  // alt text instead of a broken-image icon.
  const logoSrc = process.env.EMAIL_LOGO_URL
    ? escapeHtml(process.env.EMAIL_LOGO_URL)
    : logoFileExists()
      ? `cid:${LOGO_CID}`
      : null;
  const tileStyle = `width:60px;height:60px;border-radius:14px;background-color:#ffffff;font-family:${DISPLAY_FONT};font-size:18px;font-weight:800;color:${BRAND.navy900};text-align:center;`;
  const brandMark = `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td align="center" valign="middle" width="60" height="60" bgcolor="#ffffff" style="${tileStyle}">${
        logoSrc
          ? `<img src="${logoSrc}" width="52" height="52" alt="PBT" style="display:block;margin:0 auto;border:0;outline:none;font-family:${DISPLAY_FONT};font-size:18px;font-weight:800;color:${BRAND.navy900};line-height:52px;text-align:center;" />`
          : 'PBT'
      }</td>
    </tr></table>`;

  const fallback = opts.fallbackUrl
    ? `<p style="margin:20px 0 0 0;font-family:${FONT};font-size:13px;line-height:1.6;color:${BRAND.textMuted};">
         Button not working? Copy and paste this link into your browser:<br />
         <a href="${opts.fallbackUrl}" target="_blank" style="color:${BRAND.sky600};word-break:break-all;">${escapeHtml(opts.fallbackUrl)}</a>
       </p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(opts.heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${BRAND.bg}" style="background-color:${BRAND.bg};">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

          <!-- Header -->
          <tr>
            <td bgcolor="${BRAND.navy900}" style="background-color:${BRAND.navy900};background-image:linear-gradient(135deg,${BRAND.navy950},${BRAND.navy900} 60%,${BRAND.sky600});border-radius:18px 18px 0 0;padding:28px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle">${brandMark}</td>
                  <td valign="middle" style="padding-left:14px;font-family:${DISPLAY_FONT};font-size:16px;font-weight:700;line-height:1.3;color:#ffffff;">
                    Property Business<br />Training
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td height="4" style="height:4px;line-height:4px;font-size:0;background-color:${BRAND.orange500};background-image:linear-gradient(90deg,${BRAND.orange500},${BRAND.sky500},${BRAND.navy900});">&nbsp;</td>
          </tr>

          <!-- Card -->
          <tr>
            <td bgcolor="${BRAND.card}" style="background-color:${BRAND.card};border-left:1px solid ${BRAND.border};border-right:1px solid ${BRAND.border};padding:36px 32px 32px 32px;">
              <h1 style="margin:0 0 16px 0;font-family:${DISPLAY_FONT};font-size:26px;line-height:1.25;font-weight:800;color:${BRAND.textPrimary};">${escapeHtml(opts.heading)}</h1>
              ${opts.bodyHtml}
              ${fallback}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td bgcolor="${BRAND.card}" style="background-color:${BRAND.card};border:1px solid ${BRAND.border};border-top:1px solid ${BRAND.border};border-radius:0 0 18px 18px;padding:20px 32px;">
              <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.7;color:${BRAND.textMuted};">
                You're receiving this email because of activity on your Property Business Training account.<br />
                Need help? Contact <a href="mailto:support@propertybusinesstraining.com" style="color:${BRAND.sky600};text-decoration:none;">support@propertybusinesstraining.com</a>
                &nbsp;·&nbsp; <a href="${opts.frontendUrl}" target="_blank" style="color:${BRAND.sky600};text-decoration:none;">Open the PBT portal</a>
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0;font-family:${FONT};font-size:11px;color:${BRAND.textMuted};">© Property Business Training</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

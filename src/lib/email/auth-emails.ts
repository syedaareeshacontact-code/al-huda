import { Resend } from 'resend';

const DEFAULT_SITE_URL = 'https://www.readalquran.online';
const DEFAULT_FROM = 'Read al Quran <no-reply@readalquran.online>';

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character] ?? character;
  });
}

export function getPublicSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL;

  try {
    const url = new URL(configured);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return DEFAULT_SITE_URL;
    }
    return url.origin;
  } catch {
    return DEFAULT_SITE_URL;
  }
}

function buildEmailHtml(input: {
  preview: string;
  eyebrow: string;
  title: string;
  greeting: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
  expiryNote: string;
  safetyNote: string;
}) {
  const actionUrl = escapeHtml(input.actionUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(input.preview)}</title>
  </head>
  <body style="margin:0;background:#090a0d;color:#ececf0;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#090a0d;padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;overflow:hidden;border:1px solid #2a2b31;border-radius:22px;background:#15161b;box-shadow:0 24px 70px rgba(0,0,0,.35);">
            <tr>
              <td style="height:5px;background:linear-gradient(90deg,#9c7612,#f0c63f,#9c7612);"></td>
            </tr>
            <tr>
              <td style="padding:34px 34px 12px;">
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width:42px;height:42px;border-radius:50%;background:#e6bb35;color:#17140a;text-align:center;font-size:22px;font-weight:700;">✦</td>
                    <td style="padding-left:12px;">
                      <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;color:#ffffff;">Read al Quran</div>
                      <div style="margin-top:3px;font-size:10px;font-weight:700;letter-spacing:2px;color:#b79b44;">QURAN · HADITH · TAFSEER</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 34px 36px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:2px;color:#d5ad34;">${escapeHtml(input.eyebrow)}</div>
                <h1 style="margin:12px 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.16;color:#ffffff;">${escapeHtml(input.title)}</h1>
                <p style="margin:0 0 12px;font-size:16px;line-height:1.7;color:#d7d7dc;">${escapeHtml(input.greeting)}</p>
                <p style="margin:0 0 26px;font-size:15px;line-height:1.75;color:#aaaab2;">${escapeHtml(input.body)}</p>
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="border-radius:12px;background:#e6bb35;">
                      <a href="${actionUrl}" style="display:inline-block;padding:14px 22px;color:#17140a;font-size:15px;font-weight:700;text-decoration:none;">${escapeHtml(input.actionLabel)}</a>
                    </td>
                  </tr>
                </table>
                <p style="margin:22px 0 0;font-size:13px;line-height:1.65;color:#83838d;">${escapeHtml(input.expiryNote)}</p>
                <div style="margin:26px 0 18px;height:1px;background:#2a2b31;"></div>
                <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#74747e;">Button not working? Copy and paste this secure link:</p>
                <p style="margin:0;word-break:break-all;font-size:12px;line-height:1.6;color:#c4a43f;">${actionUrl}</p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #2a2b31;background:#111217;padding:20px 34px;font-size:12px;line-height:1.65;color:#74747e;">
                ${escapeHtml(input.safetyNote)}<br>
                © ${new Date().getUTCFullYear()} Read al Quran · readalquran.online
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function sendAuthEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('EMAIL_SERVICE_NOT_CONFIGURED');
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.AUTH_EMAIL_FROM?.trim() || DEFAULT_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    console.error('[Auth Email] Resend rejected an email.', {
      name: error.name,
      message: error.message,
    });
    throw new Error('EMAIL_DELIVERY_FAILED');
  }
}

export async function sendVerificationEmail(input: {
  name: string;
  email: string;
  token: string;
}) {
  const verificationUrl = `${getPublicSiteUrl()}/api/auth/verify-email?token=${encodeURIComponent(input.token)}`;
  const greeting = `Assalamu Alaikum ${input.name.trim() || 'there'},`;
  const body =
    'Confirm your email address to activate your account and securely save your Quran progress, bookmarks, reminders, and reading preferences.';

  await sendAuthEmail({
    to: input.email,
    subject: 'Verify your Read al Quran account',
    html: buildEmailHtml({
      preview: 'Verify your email to activate your Read al Quran account.',
      eyebrow: 'EMAIL VERIFICATION',
      title: 'Complete your account',
      greeting,
      body,
      actionLabel: 'Verify email address',
      actionUrl: verificationUrl,
      expiryNote: 'For your security, this verification link expires in 24 hours.',
      safetyNote:
        'If you did not create this account, you can safely ignore this email.',
    }),
    text: `${greeting}\n\n${body}\n\nVerify your email: ${verificationUrl}\n\nThis link expires in 24 hours.`,
  });
}

export async function sendPasswordResetEmail(input: {
  name: string;
  email: string;
  token: string;
}) {
  const resetUrl = `${getPublicSiteUrl()}/reset-password?token=${encodeURIComponent(input.token)}`;
  const greeting = `Assalamu Alaikum ${input.name.trim() || 'there'},`;
  const body =
    'We received a request to reset your Read al Quran password. Use the secure button below to choose a new password.';

  await sendAuthEmail({
    to: input.email,
    subject: 'Reset your Read al Quran password',
    html: buildEmailHtml({
      preview: 'Use this secure link to reset your Read al Quran password.',
      eyebrow: 'PASSWORD RESET',
      title: 'Choose a new password',
      greeting,
      body,
      actionLabel: 'Reset my password',
      actionUrl: resetUrl,
      expiryNote: 'For your security, this reset link expires in 60 minutes.',
      safetyNote:
        'If you did not request a password reset, ignore this email. Your password will remain unchanged.',
    }),
    text: `${greeting}\n\n${body}\n\nReset your password: ${resetUrl}\n\nThis link expires in 60 minutes.`,
  });
}

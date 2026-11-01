import nodemailer from 'nodemailer';
import { getPasswordResetExpiryMinutes } from './passwordReset';

let cachedTransporter = null;
let transportInitialized = false;

function buildTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port || !user || !pass) {
    console.warn('SMTP credentials missing; password reset emails will not be sent.');
    return null;
  }

  const secure =
    process.env.SMTP_SECURE === 'true' ||
    process.env.SMTP_SECURE === '1' ||
    port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
}

// UAT and dev hold real member emails, so EMAIL_REDIRECT_TO sends every email
// to one test inbox instead, naming the member it was for in the subject.
function redirected(transporter, inbox) {
  return {
    sendMail: (mail) => transporter.sendMail({ ...mail, to: inbox, subject: `[for ${mail.to}] ${mail.subject}` })
  };
}

let directTransporter = null;

// direct: skip EMAIL_REDIRECT_TO. Only for emails someone asked for on this
// copy of the site itself (beta invites), which hold no member data.
function getTransporter({ direct = false } = {}) {
  if (!transportInitialized) {
    directTransporter = buildTransporter();
    cachedTransporter =
      directTransporter && process.env.EMAIL_REDIRECT_TO
        ? redirected(directTransporter, process.env.EMAIL_REDIRECT_TO)
        : directTransporter;
    transportInitialized = true;
  }
  return direct ? directTransporter : cachedTransporter;
}

function formatName(name, fallback = 'there') {
  const trimmed = (name || '').toString().trim();
  if (!trimmed) return fallback;
  return trimmed;
}

export async function sendPasswordResetEmail({ to, name, resetUrl, expiresAt }) {
  if (!to || !resetUrl) {
    console.warn('Missing destination or reset URL for password reset email.');
    return { sent: false };
  }

  const transporter = getTransporter();
  const displayName = formatName(name);
  const from = process.env.EMAIL_FROM || 'Manchester Gents <no-reply@manchestergents.com>';
  const expiryMinutes = getPasswordResetExpiryMinutes();
  const subject = 'Reset your Manchester Gents password';

  const text = [
    `Hi ${displayName},`,
    '',
    'We received a request to reset your Manchester Gents password.',
    `Use the link below to set a new password. This link expires in ${expiryMinutes} minutes:`,
    resetUrl,
    '',
    'If you did not request this reset, you can safely ignore this email.'
  ].join('\n');

  const html = `
    <p>Hi ${displayName},</p>
    <p>We received a request to reset your Manchester Gents password.</p>
    <p><a href="${resetUrl}" style="color:#d2a85c;">Reset your password</a></p>
    <p style="opacity:0.8;">This link expires in ${expiryMinutes} minutes.</p>
    <p>If you did not request this reset, you can safely ignore this email.</p>
  `;

  if (!transporter) {
    console.warn('SMTP not configured; skipping email send. Reset URL:', resetUrl);
    return { sent: false, previewUrl: resetUrl };
  }

  const info = await transporter.sendMail({
    to,
    from,
    subject,
    text,
    html
  });

  return {
    sent: true,
    messageId: info.messageId,
    previewUrl: nodemailer.getTestMessageUrl(info) || null
  };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Plain, on-brand email used for member messages (welcome, reminders).
async function sendMemberEmail({ to, subject, paragraphs, action, direct = false }) {
  if (!to) return { sent: false };
  const transporter = getTransporter({ direct });
  const from = process.env.EMAIL_FROM || 'Manchester Gents <no-reply@manchestergents.com>';
  const text = [...paragraphs, ...(action ? ['', `${action.label}: ${action.url}`] : [])].join('\n\n');
  const html = `
    <div style="background:#1c2837;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:520px;margin:0 auto;color:#f7f4ed;font-size:16px;line-height:1.6;">
        <p style="font-size:22px;color:#ffd460;margin:0 0 20px;letter-spacing:0.02em;">Manchester Gents</p>
        ${paragraphs.map((p) => `<p style="margin:0 0 16px;">${escapeHtml(p)}</p>`).join('')}
        ${
          action
            ? `<p style="margin:28px 0;"><a href="${escapeHtml(action.url)}" style="background:#ffd460;color:#1c2837;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block;">${escapeHtml(action.label)}</a></p>`
            : ''
        }
        <p style="margin:24px 0 0;font-size:13px;color:rgba(247,244,237,0.6);">Questions? Reply to this email or message @manchestergents on Instagram.</p>
      </div>
    </div>`;
  if (!transporter) {
    console.warn(`SMTP not configured; skipping "${subject}" email to ${to}.`);
    return { sent: false };
  }
  const info = await transporter.sendMail({ to, from, subject, text, html });
  return { sent: true, messageId: info.messageId };
}

export function sendWelcomeEmail({ to, name, eventsUrl }) {
  return sendMemberEmail({
    to,
    subject: 'Welcome to Manchester Gents',
    paragraphs: [
      `Hi ${formatName(name)},`,
      'Thanks for joining Manchester Gents. Socials are relaxed evenings at The Lodge: suits on, good drinks, easy conversation.',
      'Reserve your spot for the next one on the website. Once you have, you’ll join that evening’s group chat in the Manchester Gents app or on the website.'
    ],
    action: { label: 'See upcoming events', url: eventsUrl }
  });
}

export function sendRsvpReminderEmail({ to, name, eventTitle, dateLabel, eventUrl }) {
  return sendMemberEmail({
    to,
    subject: `RSVP for ${eventTitle}`,
    paragraphs: [
      `Hi ${formatName(name)},`,
      `A quick reminder to RSVP for ${eventTitle}${dateLabel ? ` on ${dateLabel}` : ''}. Spaces are limited so everyone gets time to talk.`
    ],
    action: { label: 'Reserve your spot', url: eventUrl }
  });
}

// Approved for the app beta: how to install the test version on their phone.
export function sendBetaInviteEmail({ to, platform, iosAppUrl, androidAppUrl, androidGroupUrl }) {
  const ios = platform === 'IOS';
  const steps = ios
    ? [
        '1. Install TestFlight, Apple’s free app for testing apps: https://apps.apple.com/app/testflight/id899247664',
        `2. On your iPhone, open your invite: ${iosAppUrl}. It opens in TestFlight: tap Accept, then Install.`,
        '3. Open MCR Gents and sign in with your Manchester Gents email and password.'
      ]
    : [
        ...(androidGroupUrl
          ? [`1. Join the testers group with the Google account you use for the Play Store: ${androidGroupUrl}. Tap Join group.`]
          : []),
        `${androidGroupUrl ? '2' : '1'}. Become a tester with the same Google account: ${androidAppUrl}. Tap Become a tester, then the link to Google Play.`,
        `${androidGroupUrl ? '3' : '2'}. Install MCR Gents from Google Play, open it and sign in with your Manchester Gents email and password.`
      ];
  return sendMemberEmail({
    to,
    direct: true,
    subject: 'You’re in the Manchester Gents app beta',
    paragraphs: [
      'Hi there,',
      `Thanks for offering to test the Manchester Gents app. You’re in. Here’s how to install it on your ${ios ? 'iPhone' : 'Android phone'}:`,
      ...steps,
      'It’s a test version: messages, RSVPs and photos in it stay in the test and never reach the real site, and things may break.',
      'Please leave feedback in the community chat in the app (Chats, then Community): what you were doing, what happened and which phone you have. A screenshot helps.'
    ],
    action: ios
      ? { label: 'Open your TestFlight invite', url: iosAppUrl }
      : androidGroupUrl
        ? { label: 'Join the testers group', url: androidGroupUrl }
        : { label: 'Become a tester', url: androidAppUrl }
  });
}

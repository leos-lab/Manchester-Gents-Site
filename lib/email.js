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

function getTransporter() {
  if (!transportInitialized) {
    cachedTransporter = buildTransporter();
    transportInitialized = true;
  }
  return cachedTransporter;
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

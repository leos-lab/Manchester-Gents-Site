/* eslint-disable no-console */
import prisma from '../lib/prisma.js';
import { hashPassword } from '../lib/password.js';

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@manchestergents.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'change-me-now';
  const adminHandle = process.env.SEED_ADMIN_HANDLE || 'manchester.gents';

  const passwordHash = await hashPassword(adminPassword);
  const consentTimestamp = new Date();

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      firstName: 'Club',
      lastName: 'Admin',
      preferredName: 'Club Admin',
      shareFirstName: true,
      generalPhotoConsent: true,
      groupFaceConsent: true,
      otherFaceConsent: true,
      taggingConsent: true,
      termsConsentCulture: true,
      termsSafeSpace: true,
      termsNoHate: true,
      termsPrivacy: true,
      termsGuidelines: true,
      termsAgreed: true,
      termsSignedAt: consentTimestamp,
      consentUpdatedAt: consentTimestamp,
      isPlaceholder: false
    },
    create: {
      email: adminEmail,
      instagramHandle: adminHandle,
      passwordHash,
      role: 'ADMIN',
      name: 'Club Admin',
      firstName: 'Club',
      lastName: 'Admin',
      preferredName: 'Club Admin',
      fullName: 'Club Admin',
      shareFirstName: true,
      generalPhotoConsent: true,
      groupFaceConsent: true,
      otherFaceConsent: true,
      taggingConsent: true,
      termsConsentCulture: true,
      termsSafeSpace: true,
      termsNoHate: true,
      termsPrivacy: true,
      termsGuidelines: true,
      termsAgreed: true,
      termsSignedAt: consentTimestamp,
      consentUpdatedAt: consentTimestamp,
      isPlaceholder: false
    }
  });

  const event = await prisma.event.upsert({
    where: { slug: 'the-lodge-social' },
    update: {
      threadId: 'example-thread-id'
    },
    create: {
      slug: 'the-lodge-social',
      title: 'The Lodge Social',
      subtitle: 'Drinks & conversation for suited gents',
      description:
        'A relaxed two-hour meetup for well-dressed gents at The Lodge in Manchester. No agenda — just sharp tailoring, easy conversation, and the option to carry on downstairs at The Eagle afterwards.',
      location: 'The Lodge · Manchester',
      groupChatLink: 'https://chat.whatsapp.com/example-event-link',
      threadId: 'example-thread-id',
      galleryUrl: 'https://photos.example.com/the-lodge-social',
      startTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
      endTime: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10 + 1000 * 60 * 60 * 3),
      primaryColor: '#ffd460',
      secondaryColor: '#3e587b',
      accentColor: '#ffc62d',
      backgroundColor: '#1c2837',
      textColor: '#f7f4ed',
      signupDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      capacity: 40,
      published: true
    }
  });

  console.log('Seeded admin account:', admin.email);
  console.log('Seeded sample event:', event.title);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { redirect } from 'next/navigation';
import styles from './page.module.css';
import ProfileOverview from '@/components/ProfileOverview';

export const metadata = {
  title: 'Profile | Manchester Gents'
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/login?redirect=${encodeURIComponent('/profile')}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      instagramHandle: true,
      firstName: true,
      lastName: true,
      preferredName: true,
      shareFirstName: true,
      phoneNumber: true,
      preferredContactMethod: true,
      profilePhotoUrl: true,
      profilePhotoOriginalUrl: true,
      termsConsentCulture: true,
      termsSafeSpace: true,
      termsNoHate: true,
      termsPrivacy: true,
      termsGuidelines: true,
      termsAgreed: true,
      generalPhotoConsent: true,
      groupFaceConsent: true,
      otherFaceConsent: true,
      taggingConsent: true,
      consentUpdatedAt: true
    }
  });

  if (!user) {
    redirect('/register');
  }

  const serialisedUser = {
    ...user,
    consentUpdatedAt: user.consentUpdatedAt ? user.consentUpdatedAt.toISOString() : null
  };

  return (
    <div className={styles.page}>
      <NavBar />
      <main className={styles.profileMain}>
        <header className={styles.profileHeader}>
          <h1>Your member profile</h1>
          <p>
            Update your preferences for how we connect with you and how you appear in Manchester
            Gents coverage. These consents apply to all future events, and your suited reference
            photo stays private with the team.
          </p>
        </header>
        <ProfileOverview user={serialisedUser} />
      </main>
      <Footer />
    </div>
  );
}

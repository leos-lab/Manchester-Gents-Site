import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import BetaRequestForm from './BetaRequestForm';
import styles from './page.module.css';

const TESTFLIGHT_APP = 'https://apps.apple.com/app/testflight/id899247664';
const PHONE = { IOS: 'iPhone', ANDROID: 'Android' };

// The beta part of the Get the app pages (dev and UAT): sign in, then request
// to join with the account's details filled in; once approved, the install
// links. platform: 'IOS', 'ANDROID', or empty to let them choose.
export default async function BetaSection({ platform = '', links }) {
  const session = await getServerSession(authOptions);
  const here = `/get-the-app${platform ? `/${platform === 'IOS' ? 'ios' : 'android'}` : ''}`;

  if (!session?.user?.id) {
    return (
      <section className={styles.notice} id="request">
        <h2>Request to join the beta</h2>
        <p>Sign in with your Manchester Gents account first. We’ll fill in your details so you can send your request.</p>
        <div className={styles.buttons}>
          <Link href={`/login?callbackUrl=${encodeURIComponent(`${here}#request`)}`} className={styles.primary}>
            Sign in to request
          </Link>
          <Link href="/register" className={styles.secondary}>
            Not a member yet? Join
          </Link>
        </div>
      </section>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      instagramHandle: true,
      role: true,
      betaApprovedAt: true,
      betaRequests: { where: { status: { in: ['PENDING', 'APPROVED'] } }, select: { platform: true, status: true, email: true } }
    }
  });
  const approvedFor = new Set(user.betaRequests.filter((r) => r.status === 'APPROVED').map((r) => r.platform));
  const pending = user.betaRequests.find((r) => r.status === 'PENDING' && (!platform || r.platform === platform));
  const inBeta = user.role === 'ADMIN' || Boolean(user.betaApprovedAt);

  if (inBeta && (!platform || approvedFor.has(platform) || user.role === 'ADMIN')) {
    return (
      <section className={styles.notice} id="request">
        <h2>You’re in the beta</h2>
        <p>
          {platform
            ? `Here are your install links. We’ve also emailed them to you.`
            : 'You can use the signed-in site, and your install links are in your email.'}
        </p>
        {platform === 'IOS' && links.iosAppUrl ? (
          <div className={styles.buttons}>
            <a href={TESTFLIGHT_APP} className={styles.secondary} target="_blank" rel="noreferrer">
              Get TestFlight
            </a>
            <a href={links.iosAppUrl} className={styles.primary} target="_blank" rel="noreferrer">
              Open the TestFlight invite
            </a>
          </div>
        ) : null}
        {platform === 'ANDROID' && links.androidAppUrl ? (
          <div className={styles.buttons}>
            {links.androidGroupUrl ? (
              <a href={links.androidGroupUrl} className={styles.secondary} target="_blank" rel="noreferrer">
                1. Join the testers group
              </a>
            ) : null}
            <a href={links.androidAppUrl} className={styles.primary} target="_blank" rel="noreferrer">
              {links.androidGroupUrl ? '2. Become a tester' : 'Become a tester'}
            </a>
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className={styles.platform} id="request">
      <h2>Request to join the beta</h2>
      {pending ? (
        <p className={styles.formDone}>
          Your {PHONE[pending.platform]} request is waiting for approval. We’ll email {pending.email} once you’re in. You can
          update it below.
        </p>
      ) : (
        <p>We’ve filled in your details from your account. Change them if you’d like the invite somewhere else.</p>
      )}
      <BetaRequestForm platform={platform} email={user.email} instagramHandle={user.instagramHandle} />
    </section>
  );
}

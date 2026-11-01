import Link from 'next/link';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { getHomeContent } from '@/lib/homeContent';
import { isTestSite } from '@/lib/siteStage';
import { FeedbackNote, Requirements, TestingNotice } from '../shared';
import BetaSection from '../BetaSection';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Get the app for iPhone | Manchester Gents'
};

const TESTFLIGHT_APP = 'https://apps.apple.com/app/testflight/id899247664';

// iPhone: while testing, people request to join; an admin approves them in
// the app, which emails the TestFlight invite.
export default async function IosPage() {
  const { iosAppUrl } = await getHomeContent();
  const testing = isTestSite();
  return (
    <div className={styles.page}>
      <NavBar />
      <main className={`${styles.main} glass-panel`}>
        <Link href="/get-the-app" className={styles.back}>
          ← Get the app
        </Link>
        <h1 className="heading-font">The app for iPhone</h1>

        {!iosAppUrl ? (
          <p className={styles.intro}>The iPhone app isn’t ready to download yet. Check back soon.</p>
        ) : testing ? (
          <>
            <p className={styles.intro}>
              While the app is in testing, it comes through <strong>TestFlight</strong>, Apple’s own app for trying apps before
              they reach the App Store. Ask to join below, and once we’ve approved you it takes about two minutes to install.
            </p>
            <Requirements>
              <li>An iPhone on iOS 16.4 or later (Settings → General → About → iOS Version).</li>
              <li>Your Apple Account, the one you use for the App Store.</li>
              <li>
                <strong>Open the invite email on your iPhone.</strong> The invite only works there, not on a computer.
              </li>
            </Requirements>
            <section className={styles.platform}>
              <h2>How it works</h2>
              <ol className={styles.steps}>
                <li>
                  <strong>Sign in and request to join the beta</strong> below. Your details are filled in from your account.
                </li>
                <li>
                  <strong>We approve your request</strong>, usually within a day, and email you a TestFlight invite.
                </li>
                <li>
                  <strong>Install TestFlight</strong> from the App Store (it’s free and made by Apple), then open the invite on
                  your iPhone and tap <em>Accept</em> and <em>Install</em>.
                </li>
                <li>
                  <strong>Open MCR Gents</strong>, sign in, and allow notifications so you hear about new messages and events.
                </li>
              </ol>
              <a href={TESTFLIGHT_APP} className={styles.secondary} target="_blank" rel="noreferrer">
                Get TestFlight now
              </a>
            </section>
            <BetaSection platform="IOS" links={{ iosAppUrl }} />
            <section className={styles.platform}>
              <h2>Good to know</h2>
              <ul className={styles.facts}>
                <li>New versions appear in TestFlight. Turn on <em>Automatic Updates</em> there to get them without thinking.</li>
                <li>Each test version works for 90 days. We’ll have a newer one out well before then.</li>
                <li>To stop testing, delete the app, or open it in TestFlight and tap <em>Stop Testing</em>.</li>
              </ul>
            </section>
            <TestingNotice />
            <FeedbackNote />
          </>
        ) : (
          <>
            <p className={styles.intro}>Download MCR Gents from the App Store, then sign in with your Manchester Gents email and password.</p>
            <a href={iosAppUrl} className={styles.primary} target="_blank" rel="noreferrer">
              Download on the App Store
            </a>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

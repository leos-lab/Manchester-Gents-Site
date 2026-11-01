import Link from 'next/link';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { getHomeContent } from '@/lib/homeContent';
import { isTestSite } from '@/lib/siteStage';
import { FeedbackNote, Requirements, TestingNotice } from '../shared';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Get the app for iPhone | Manchester Gents'
};

const TESTFLIGHT_APP = 'https://apps.apple.com/app/testflight/id899247664';

// iPhone: while testing, TestFlight first, then the invite link.
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
              they reach the App Store. It takes about two minutes.
            </p>
            <Requirements>
              <li>An iPhone on iOS 16.4 or later (Settings → General → About → iOS Version).</li>
              <li>Your Apple Account, the one you use for the App Store.</li>
              <li>
                <strong>Open this page on your iPhone.</strong> The invite only works there, not on a computer.
              </li>
            </Requirements>
            <section className={styles.platform}>
              <h2>Install it</h2>
              <ol className={styles.steps}>
                <li>
                  <strong>Install TestFlight</strong> from the App Store. It’s free and made by Apple.
                  <a href={TESTFLIGHT_APP} className={styles.secondary} target="_blank" rel="noreferrer">
                    Get TestFlight
                  </a>
                </li>
                <li>
                  <strong>Open the invite.</strong> It opens in TestFlight: tap <em>Accept</em>, then <em>Install</em>.
                  <a href={iosAppUrl} className={styles.primary} target="_blank" rel="noreferrer">
                    Open the invite
                  </a>
                </li>
                <li>
                  <strong>Open MCR Gents</strong> from your home screen, sign in, and allow notifications so you hear about new
                  messages and events.
                </li>
              </ol>
            </section>
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

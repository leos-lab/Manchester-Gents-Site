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
  title: 'Get the app for Android | Manchester Gents'
};

// Android: while testing, people request to join; an admin approves them in
// the app, which emails the testers group and Google Play testing links.
export default async function AndroidPage() {
  const { androidAppUrl, androidGroupUrl } = await getHomeContent();
  const testing = isTestSite();
  return (
    <div className={styles.page}>
      <NavBar />
      <main className={`${styles.main} glass-panel`}>
        <Link href="/get-the-app" className={styles.back}>
          ← Get the app
        </Link>
        <h1 className="heading-font">The app for Android</h1>

        {!androidAppUrl ? (
          <p className={styles.intro}>The Android app isn’t ready to download yet. Check back soon.</p>
        ) : testing ? (
          <>
            <p className={styles.intro}>
              While the app is in testing, Google only lets signed-up testers install it. Ask to join below, and once we’ve
              approved you, you install it from Google Play as usual.
            </p>
            <Requirements>
              <li>An Android phone on Android 7 or later.</li>
              <li>
                <strong>The same Google account</strong> for every step as the one signed in to the Play Store on your phone.
                Testing access is tied to that account.
              </li>
            </Requirements>
            <section className={styles.platform}>
              <h2>How it works</h2>
              <ol className={styles.steps}>
                <li>
                  <strong>Sign in and request to join the beta</strong> below, giving the email address of your Google account.
                </li>
                <li>
                  <strong>We approve your request</strong>, usually within a day, and email you the links.
                </li>
                <li>
                  {androidGroupUrl ? (
                    <>
                      <strong>Join the testers group</strong>, then <strong>become a tester</strong>
                    </>
                  ) : (
                    <strong>Become a tester</strong>
                  )}{' '}
                  with the links in the email, and install MCR Gents from Google Play.
                </li>
                <li>
                  <strong>Open MCR Gents</strong>, sign in, and allow notifications so you hear about new messages and events.
                </li>
              </ol>
            </section>
            <BetaSection platform="ANDROID" links={{ androidAppUrl, androidGroupUrl }} />
            <section className={styles.platform}>
              <h2>Good to know</h2>
              <ul className={styles.facts}>
                <li>
                  If Google Play says the app isn’t available, wait a few minutes after becoming a tester and try again, and check
                  you’re using the same Google account.
                </li>
                <li>New versions arrive through Google Play like any other app update.</li>
                <li>
                  To stop testing, open the <em>Become a tester</em> link again and tap <em>Leave the program</em>, then delete the
                  app.
                </li>
              </ul>
            </section>
            <TestingNotice />
            <FeedbackNote />
          </>
        ) : (
          <>
            <p className={styles.intro}>Download MCR Gents from Google Play, then sign in with your Manchester Gents email and password.</p>
            <a href={androidAppUrl} className={styles.primary} target="_blank" rel="noreferrer">
              Get it on Google Play
            </a>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

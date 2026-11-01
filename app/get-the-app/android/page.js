import Link from 'next/link';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { getHomeContent } from '@/lib/homeContent';
import { isTestSite } from '@/lib/siteStage';
import { FeedbackNote, Requirements, TestingNotice } from '../shared';
import styles from '../page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Get the app for Android | Manchester Gents'
};

// Android: while testing, join the testers Google Group (anyone can join),
// then opt in to the test on Google Play.
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
              While the app is in testing, Google only lets approved testers install it.
              {androidGroupUrl ? ' You join our testers group first, then install it from Google Play as usual.' : ''}
            </p>
            <Requirements>
              <li>An Android phone on Android 7 or later.</li>
              <li>
                <strong>The same Google account</strong> for every step as the one signed in to the Play Store on your phone.
                Testing access is tied to that account.
              </li>
            </Requirements>
            <section className={styles.platform}>
              <h2>Install it</h2>
              <ol className={styles.steps}>
                {androidGroupUrl ? (
                  <li>
                    <strong>Join the testers group.</strong> Sign in with your Google account and tap <em>Join group</em>. You’re in
                    straight away.
                    <a href={androidGroupUrl} className={styles.secondary} target="_blank" rel="noreferrer">
                      Join the testers group
                    </a>
                  </li>
                ) : null}
                <li>
                  <strong>Become a tester.</strong> {androidGroupUrl ? 'Then open' : 'Open'} this link, tap{' '}
                  <em>Become a tester</em>, then tap the link to download it on Google Play.
                  <a href={androidAppUrl} className={styles.primary} target="_blank" rel="noreferrer">
                    Become a tester
                  </a>
                </li>
                <li>
                  <strong>Install MCR Gents</strong> from Google Play, open it, sign in, and allow notifications so you hear about
                  new messages and events.
                </li>
              </ol>
            </section>
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

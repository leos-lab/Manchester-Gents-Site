import Link from 'next/link';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { getHomeContent } from '@/lib/homeContent';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Get the app | Manchester Gents'
};

const TESTFLIGHT_APP = 'https://apps.apple.com/app/testflight/id899247664';

// Where the home page's app buttons go: what to expect before installing.
// While the app is in testing, iPhone needs TestFlight first and Android
// needs the testers Google Group; at launch it's just the store links.
export default async function GetTheAppPage() {
  const { iosAppUrl, androidAppUrl, androidGroupUrl } = await getHomeContent();
  const iosTesting = iosAppUrl.includes('testflight.apple.com');
  const androidTesting = Boolean(androidGroupUrl) || androidAppUrl.includes('/apps/testing/');
  const testing = (iosAppUrl && iosTesting) || (androidAppUrl && androidTesting);

  return (
    <div className={styles.page}>
      <NavBar />
      <main className={`${styles.main} glass-panel`}>
        <h1 className="heading-font">Get the app</h1>
        <p className={styles.intro}>
          {testing
            ? 'The Manchester Gents app is in testing. It takes a couple of extra steps to install, depending on your phone.'
            : 'RSVPs, event chats, messages and photos from every social, on your phone.'}
        </p>

        {!iosAppUrl && !androidAppUrl ? <p>The app isn’t available to download yet. Check back soon.</p> : null}

        {iosAppUrl ? (
          <section id="iphone" className={styles.platform}>
            <h2>iPhone</h2>
            {iosTesting ? (
              <ol className={styles.steps}>
                <li>
                  <strong>Install TestFlight.</strong> It’s Apple’s free app for trying apps before they reach the App Store.
                  <a href={TESTFLIGHT_APP} className={styles.secondary} target="_blank" rel="noreferrer">
                    Get TestFlight
                  </a>
                </li>
                <li>
                  <strong>Open the invite on your iPhone</strong>, then tap Accept and Install in TestFlight.
                  <a href={iosAppUrl} className={styles.primary} target="_blank" rel="noreferrer">
                    Open the invite
                  </a>
                </li>
                <li>
                  <strong>Open MCR Gents</strong> and sign in with your Manchester Gents email and password.
                </li>
              </ol>
            ) : (
              <a href={iosAppUrl} className={styles.primary} target="_blank" rel="noreferrer">
                Download on the App Store
              </a>
            )}
          </section>
        ) : null}

        {androidAppUrl ? (
          <section id="android" className={styles.platform}>
            <h2>Android</h2>
            {androidTesting ? (
              <ol className={styles.steps}>
                {androidGroupUrl ? (
                  <li>
                    <strong>Ask to join the testers group</strong> with the Google account you use for the Play Store. We approve
                    requests by hand, and Google emails you once you’re in.
                    <a href={androidGroupUrl} className={styles.secondary} target="_blank" rel="noreferrer">
                      Join the testers group
                    </a>
                  </li>
                ) : null}
                <li>
                  <strong>Become a tester.</strong> {androidGroupUrl ? 'Once you’re approved, open' : 'Open'} this link, tap
                  Become a tester, then follow the link to Google Play to install.
                  <a href={androidAppUrl} className={styles.primary} target="_blank" rel="noreferrer">
                    Become a tester
                  </a>
                </li>
                <li>
                  <strong>Open MCR Gents</strong> and sign in with your Manchester Gents email and password.
                </li>
              </ol>
            ) : (
              <a href={androidAppUrl} className={styles.primary} target="_blank" rel="noreferrer">
                Get it on Google Play
              </a>
            )}
          </section>
        ) : null}

        {testing ? (
          <p className={styles.note}>
            This is a test version. Anything you do in it, like messages, RSVPs and photos, stays in the test and never reaches the
            real Manchester Gents site.
          </p>
        ) : null}
        <p className={styles.note}>
          Can’t use the app? <Link href="/chat">Chats also work on the website.</Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}

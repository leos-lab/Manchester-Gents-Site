import Link from 'next/link';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { getHomeContent } from '@/lib/homeContent';
import { isTestSite } from '@/lib/siteStage';
import BetaSection from './BetaSection';
import { FeedbackNote, TestingNotice } from './shared';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Get the app | Manchester Gents'
};

// Pick your phone. The home page's buttons go straight to /get-the-app/ios
// and /get-the-app/android. On dev and UAT, members request to join the beta
// here too (and land here if they aren't in it yet).
export default async function GetTheAppPage({ searchParams }) {
  const testing = isTestSite();
  const links = testing ? await getHomeContent() : null;
  // Sent here by middleware: signed in, but not a beta tester yet.
  const betaRequired = testing && searchParams?.beta === 'required';
  return (
    <div className={styles.page}>
      <NavBar />
      <main className={`${styles.main} glass-panel`}>
        <h1 className="heading-font">Get the app</h1>
        {betaRequired ? (
          <p className={styles.formDone} role="status">
            This test version of the site is for beta testers. Request to join below, and you’ll be able to use it once you’re
            approved. Until then you can still see the home page.
          </p>
        ) : null}
        <p className={styles.intro}>
          RSVPs, event chats, messages and photos from every social, on your phone. Event chats have moved off Instagram and
          into the app.
        </p>
        <div className={styles.choices}>
          <Link href="/get-the-app/ios" className={styles.choice}>
            <strong>iPhone</strong>
            <span>{testing ? 'Through TestFlight, iOS 16.4 or later' : 'From the App Store'}</span>
          </Link>
          <Link href="/get-the-app/android" className={styles.choice}>
            <strong>Android</strong>
            <span>{testing ? 'Through Google Play testing, Android 7 or later' : 'From Google Play'}</span>
          </Link>
        </div>
        {testing ? <BetaSection links={links} /> : null}
        {testing ? <TestingNotice /> : null}
        {testing ? <FeedbackNote /> : null}
        <p className={styles.note}>
          Can’t use the app? <Link href="/chat">Chats also work on the website.</Link>
        </p>
      </main>
      <Footer />
    </div>
  );
}

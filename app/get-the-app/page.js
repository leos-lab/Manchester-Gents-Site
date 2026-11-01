import Link from 'next/link';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { isTestSite } from '@/lib/siteStage';
import { FeedbackNote, TestingNotice } from './shared';
import styles from './page.module.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Get the app | Manchester Gents'
};

// Pick your phone. The home page's buttons go straight to /get-the-app/ios
// and /get-the-app/android.
export default function GetTheAppPage() {
  const testing = isTestSite();
  return (
    <div className={styles.page}>
      <NavBar />
      <main className={`${styles.main} glass-panel`}>
        <h1 className="heading-font">Get the app</h1>
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

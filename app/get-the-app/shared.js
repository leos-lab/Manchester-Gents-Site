import Link from 'next/link';
import styles from './page.module.css';

// Pieces shared by /get-the-app and its iPhone and Android pages.

export function TestingNotice() {
  return (
    <section className={styles.notice}>
      <h2>The app is still in testing</h2>
      <p>Thanks for helping us try it before it reaches the App Store and Google Play. A few things to expect:</p>
      <ul>
        <li>
          <strong>It’s a test copy.</strong> Messages, RSVPs and photos in it stay in the test and never reach the real Manchester
          Gents site or other members.
        </li>
        <li>
          <strong>Things may break</strong> or change between versions, and new versions arrive regularly.
        </li>
        <li>
          <strong>The icon has a badge</strong> so you can tell it apart, and it’s called MCR Gents. It will sit alongside the real
          app when that launches.
        </li>
        <li>
          <strong>Sign in with your Manchester Gents email and password.</strong> If you joined very recently and it doesn’t work,
          create an account in the app.
        </li>
      </ul>
    </section>
  );
}

export function FeedbackNote() {
  return (
    <section className={styles.notice}>
      <h2>Tell us what you think</h2>
      <p>
        Leave feedback in the <strong>community chat</strong>: open the app, go to Chats, then Community. Tell us what you were
        doing, what happened, and which phone you have. A screenshot helps.
      </p>
      <p>
        Can’t open the app? <Link href="/chat?room=community">Post in the community chat on the website.</Link>
      </p>
    </section>
  );
}

export function Requirements({ children }) {
  return (
    <section className={styles.requirements}>
      <h2>Before you start</h2>
      <ul>{children}</ul>
    </section>
  );
}

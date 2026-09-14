import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import styles from './page.module.css';

export const metadata = {
  title: 'Privacy | Manchester Gents'
};

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <NavBar />
      <main className={`${styles.privacyMain} glass-panel`}>
        <h1>Privacy Policy</h1>
        <p>
          Manchester Gents respects your privacy. We use your Instagram username and email address
          strictly for membership communication, event bookings, and updates about the club.
        </p>
        <p>
          Data is stored securely and only accessible to administrators. You can request the removal
          of your data or an export of what we hold by emailing hello@manchestergents.com.
        </p>
        <p>
          We never sell or share personal information with third parties. Event partners receive only
          aggregated, anonymised insights.
        </p>
      </main>
      <Footer />
    </div>
  );
}

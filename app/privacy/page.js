import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { privacyPolicy } from '@/lib/consentContent';
import styles from './page.module.css';

export const metadata = {
  title: 'Privacy | Manchester Gents'
};

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <NavBar />
      <main className={`${styles.privacyMain} glass-panel`}>
        <h1>{privacyPolicy.title}</h1>
        {privacyPolicy.paragraphs.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </main>
      <Footer />
    </div>
  );
}

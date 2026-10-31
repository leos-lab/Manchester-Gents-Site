import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { termsChecklist } from '@/lib/consentContent';
import styles from '../privacy/page.module.css';

export const metadata = {
  title: 'Community guidelines | Manchester Gents'
};

// The terms every member agrees to when they join (same copy as the app).
export default function GuidelinesPage() {
  return (
    <div className={styles.page}>
      <NavBar />
      <main className={`${styles.privacyMain} glass-panel`}>
        <h1>Community guidelines</h1>
        <p>Every member agrees to these when they join. They keep Manchester Gents a safe, welcoming space.</p>
        {termsChecklist.map((item) => (
          <section key={item.key}>
            <h2>{item.title}</h2>
            <p>{item.description}</p>
          </section>
        ))}
      </main>
      <Footer />
    </div>
  );
}

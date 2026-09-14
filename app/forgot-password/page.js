import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { ForgotPasswordForm } from '@/components/AuthForm';
import styles from '../login/page.module.css';

export const metadata = {
  title: 'Forgot password | Manchester Gents'
};

export default function ForgotPasswordPage() {
  return (
    <div className={styles.page}>
      <NavBar />
      <main className={styles.authMain}>
        <section className={`${styles.authCard} glass-panel`}>
          <div className={styles.authContent}>
            <span className="heading-font">Forgot password</span>
            <h1>Send a reset link</h1>
            <p>
              Enter the email or Instagram username linked to your account and we&rsquo;ll email you a
              link to set a new password.
            </p>
            <ForgotPasswordForm />
          </div>
          <div className={styles.authSide}>
            <span className="heading-font">Ready to return?</span>
            <p>Use your reset link to sign back in and reserve your spot at the next Lodge social.</p>
            <a href="/login" className={styles.authLink}>
              Back to login →
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

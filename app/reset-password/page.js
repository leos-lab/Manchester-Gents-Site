import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { ResetPasswordForm } from '@/components/AuthForm';
import styles from '../login/page.module.css';

export const metadata = {
  title: 'Reset password | Manchester Gents'
};

export default function ResetPasswordPage({ searchParams }) {
  const token = typeof searchParams?.token === 'string' ? searchParams.token : '';

  return (
    <div className={styles.page}>
      <NavBar />
      <main className={styles.authMain}>
        <section className={`${styles.authCard} glass-panel`}>
          <div className={styles.authContent}>
            <span className="heading-font">Reset password</span>
            <h1>Choose a new password</h1>
            <p>
              Paste the reset token from your email (if it&apos;s not already filled in) and set a new
              password to get back into your account.
            </p>
            <ResetPasswordForm token={token} />
          </div>
          <div className={styles.authSide}>
            <span className="heading-font">Already sorted?</span>
            <p>Head back to the login page and grab your spot at the next Lodge evening.</p>
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

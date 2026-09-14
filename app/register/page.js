import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { RegisterForm } from '@/components/AuthForm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import styles from './page.module.css';

export const metadata = {
  title: 'Join Manchester Gents'
};

function getRedirectTarget(searchParams) {
  const candidate =
    (typeof searchParams?.redirect === 'string' && searchParams.redirect) ||
    (typeof searchParams?.from === 'string' && searchParams.from) ||
    (typeof searchParams?.callbackUrl === 'string' && searchParams.callbackUrl) ||
    '/';
  if (!candidate.startsWith('/')) {
    return '/';
  }
  return candidate;
}

export default async function RegisterPage({ searchParams }) {
  const redirectTo = getRedirectTarget(searchParams);
  const session = await getServerSession(authOptions);
  if (session) {
    redirect(redirectTo);
  }

  const redirectQuery = redirectTo && redirectTo !== '/' ? `?redirect=${encodeURIComponent(redirectTo)}` : '';

  return (
    <div className={styles.page}>
      <NavBar />
      <main className={styles.authMain}>
        <section className={`${styles.authCard} glass-panel`}>
          <div className={styles.authContent}>
            <span className="heading-font">Secure your place</span>
            <h1>Join Manchester Gents</h1>
            <p>
              Share your Instagram username, suited details, and (optionally) a private reference
              photo so we can welcome you at our relaxed evenings in The Lodge, Manchester.
            </p>
            <RegisterForm redirectTo={redirectTo} />
          </div>
          <div className={styles.authSide}>
            <span className="heading-font">Already inside?</span>
            <p>Sign in to see which socials you’re attending and grab a spot at the next one.</p>
            <a href={`/login${redirectQuery}`} className={styles.authLink}>
              Log in →
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

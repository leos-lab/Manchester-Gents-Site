import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { LoginForm } from '@/components/AuthForm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import styles from './page.module.css';

export const metadata = {
  title: 'Log in | Manchester Gents'
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

export default async function LoginPage({ searchParams }) {
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
            <span className="heading-font">Members</span>
            <h1>Access your account</h1>
            <p>
              Use your Instagram username or email to confirm your spot at upcoming Lodge socials.
            </p>
            <LoginForm redirectTo={redirectTo} />
            <a href={`/forgot-password${redirectQuery}`} className={styles.authLink}>
              Forgot your password?
            </a>
          </div>
          <div className={styles.authSide}>
            <span className="heading-font">Not a member yet?</span>
            <p>Request your invitation and join our relaxed suit-and-drink evenings in Manchester.</p>
            <a href={`/register${redirectQuery}`} className={styles.authLink}>
              Create account →
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

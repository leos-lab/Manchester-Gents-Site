import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import NavBar from '@/components/NavBar';
import Footer from '@/components/Footer';
import { authOptions } from '@/lib/auth';
import styles from './layout.module.css';

export default async function AdminLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') {
    redirect('/');
  }

  return (
    <div className={styles.page}>
      <NavBar />
      {children}
      <Footer />
    </div>
  );
}


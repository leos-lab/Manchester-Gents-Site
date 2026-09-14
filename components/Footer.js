import styles from './Footer.module.css';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div>
          <span className="brand-mark heading-font">Manchester Gents</span>
          <p className={styles.footerBrandText}>Where style meets camaraderie.</p>
        </div>
        <div className={styles.footerLinks}>
          <a href="mailto:hello@manchestergents.com">Contact</a>
          <a href="https://www.instagram.com" rel="noreferrer" target="_blank">Instagram</a>
          <a href="/privacy">Privacy</a>
        </div>
        <p className={styles.footerCopy}>&copy; {currentYear} Manchester Gents</p>
      </div>
    </footer>
  );
}

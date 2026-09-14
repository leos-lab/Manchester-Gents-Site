import { photographyNotice } from '@/lib/consentContent';
import styles from './PhotographyNotice.module.css';

export default function PhotographyNotice({ className }) {
  const { title, paragraphs, contact } = photographyNotice;

  return (
    <div className={`${styles.notice} ${className || ''}`}>
      <span className={styles.eyebrow}>{title}</span>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
      <p>
        For any questions or image-removal requests, contact us on Instagram{' '}
        <a
          href={`https://instagram.com/${contact.instagramHandle}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          @{contact.instagramHandle}
        </a>{' '}
        or email <a href={`mailto:${contact.email}`}>{contact.email}</a>.
      </p>
    </div>
  );
}

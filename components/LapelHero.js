import styles from './LapelHero.module.css';

// Three event photos cut along the lines of a jacket's lapels (after the
// Manchester Gents logo), joined by thin gold seams, with the wordmark over
// the top. Uses event cover images only: gallery photos stay members-only.
export default function LapelHero({ photos = [], children }) {
  const [left, centre, right] = [photos[0], photos[2] || photos[1], photos[1] || photos[0]];
  return (
    <section className={styles.hero} aria-label="Manchester Gents">
      <div className={styles.jacket} aria-hidden="true">
        <Panel className={styles.left} src={left} />
        <Panel className={styles.centre} src={centre} />
        <Panel className={styles.right} src={right} />
      </div>
      <div className={styles.content}>{children}</div>
    </section>
  );
}

function Panel({ className, src }) {
  return (
    <div className={`${styles.panel} ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" decoding="async" fetchPriority="high" /> : <div className={styles.cloth} />}
    </div>
  );
}

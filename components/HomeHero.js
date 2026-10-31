import styles from './HomeHero.module.css';

// Full-width photo chosen in Admin → Home page (or the latest event cover),
// with an optional caption at the top and the intro over the bottom. The
// photo is cropped around its focus point (set when it was chosen).
export default function HomeHero({ photo, caption, children }) {
  return (
    <section className={styles.hero} aria-label="Manchester Gents">
      <div className={styles.photo} aria-hidden="true">
        {photo?.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.src}
            srcSet={photo.srcSet}
            sizes="100vw"
            alt=""
            decoding="async"
            fetchPriority="high"
            style={photo.focus ? { objectPosition: `${photo.focus.x}% ${photo.focus.y}%` } : undefined}
          />
        ) : (
          <div className={styles.cloth} />
        )}
      </div>
      {caption ? <p className={styles.caption}>{caption}</p> : null}
      <div className={styles.content}>{children}</div>
    </section>
  );
}

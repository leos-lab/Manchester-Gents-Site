import styles from './PhotoMarquee.module.css';

// Photos from past socials (chosen in Admin → Home page) drifting slowly
// across the page. Listed twice so the loop is seamless; the copy is hidden
// from screen readers. Stops for "reduce motion" and can be scrolled by hand.
export default function PhotoMarquee({ photos }) {
  if (!photos?.length) return null;
  const seconds = Math.max(40, photos.length * 8);
  return (
    <section className={styles.marquee} aria-label="Photos from our socials">
      <div className={styles.track} style={{ animationDuration: `${seconds}s` }}>
        {[0, 1].map((copy) => (
          <ul key={copy} className={styles.row} aria-hidden={copy === 1 ? 'true' : undefined}>
            {photos.map((p) => (
              <li key={`${copy}-${p.id}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.src}
                  srcSet={p.srcSet}
                  sizes="(min-width: 900px) 420px, 70vw"
                  alt=""
                  loading="lazy"
                  decoding="async"
                  style={p.focus ? { objectPosition: `${p.focus.x}% ${p.focus.y}%` } : undefined}
                />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}

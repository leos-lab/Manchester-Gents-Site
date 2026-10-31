'use client';

import styles from './FocusPicker.module.css';

// Click the photo to set its focus point (percent across and down). Pages
// crop around it (object-position), so the subject stays in frame at any
// shape; the previews show a wide and a tall crop.
export default function FocusPicker({ photo, onChange }) {
  const focus = photo.focus || { x: 50, y: 50 };
  const pick = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const clamp = (v) => Math.round(Math.min(100, Math.max(0, v)));
    onChange({ x: clamp(((e.clientX - box.left) / box.width) * 100), y: clamp(((e.clientY - box.top) / box.height) * 100) });
  };
  const onKey = (e) => {
    const step = e.shiftKey ? 10 : 2;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    onChange({ x: Math.min(100, Math.max(0, focus.x + move[0])), y: Math.min(100, Math.max(0, focus.y + move[1])) });
  };
  return (
    <div className={styles.picker}>
      <div
        className={styles.frame}
        onClick={pick}
        onKeyDown={onKey}
        role="slider"
        tabIndex={0}
        aria-label="Focus point. Click the photo, or use the arrow keys."
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={focus.x}
        aria-valuetext={`${focus.x}% across, ${focus.y}% down`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src} alt="" draggable={false} />
        <span className={styles.dot} style={{ left: `${focus.x}%`, top: `${focus.y}%` }} aria-hidden="true" />
      </div>
      <div className={styles.previews} aria-hidden="true">
        {['wide', 'tall'].map((shape) => (
          <figure key={shape} className={styles[shape]}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.src} alt="" style={{ objectPosition: `${focus.x}% ${focus.y}%` }} />
            <figcaption>{shape === 'wide' ? 'Desktop' : 'Phone'}</figcaption>
          </figure>
        ))}
      </div>
      <p className={styles.hint}>Click the part of the photo that should always stay in view.</p>
    </div>
  );
}

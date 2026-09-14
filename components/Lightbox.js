'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

export default function Lightbox({ imageUrl, onClose }) {
  useEffect(() => {
    if (!imageUrl) {
      return undefined;
    }

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeydown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [imageUrl, onClose]);

  if (!imageUrl) {
    return null;
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const content = (
    <div className="lightbox-backdrop" onClick={handleBackdropClick}>
      <div className="lightbox-content">
        <button type="button" className="lightbox-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="lightbox-image-wrap">
          <Image
            src={imageUrl}
            alt="Full size reference"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 90vw"
            className="lightbox-image"
          />
        </div>
      </div>
      <style jsx>{`
        .lightbox-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(5, 10, 18, 0.82);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 2rem;
        }
        .lightbox-content {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }
        .lightbox-close {
          position: absolute;
          top: -0.5rem;
          right: -0.5rem;
          width: 2.2rem;
          height: 2.2rem;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.6);
          color: #fff;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
        }
        .lightbox-image-wrap {
          position: relative;
          width: min(90vw, 960px);
          height: min(90vh, 960px);
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(12, 20, 32, 0.9);
        }
        .lightbox-image {
          object-fit: contain;
          object-position: center;
        }
      `}</style>
    </div>
  );

  return createPortal(content, document.body);
}

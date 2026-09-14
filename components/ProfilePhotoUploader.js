'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { getCroppedImage } from '@/lib/cropImage';
import Image from 'next/image';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function ProfilePhotoUploader({ value, onChange, disabled = false, required = false }) {
  const [isOriginalUploading, setIsOriginalUploading] = useState(false);
  const [isCroppedUploading, setIsCroppedUploading] = useState(false);
  const [error, setError] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropSource, setCropSource] = useState(null);
  const [cropSourceIsObjectUrl, setCropSourceIsObjectUrl] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [isPortalReady, setIsPortalReady] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalUpload, setOriginalUpload] = useState(null);

  useEffect(() => () => {
    if (cropSource && cropSourceIsObjectUrl) {
      URL.revokeObjectURL(cropSource);
    }
  }, [cropSource, cropSourceIsObjectUrl]);

  const handleFileSelection = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Only JPEG, PNG, or WebP images are accepted.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError('Image must be 5MB or smaller.');
      return;
    }

    setError(null);
    if (cropSource && cropSourceIsObjectUrl) {
      URL.revokeObjectURL(cropSource);
    }
    setSelectedFile(file);
    setOriginalUpload(null);
    setCropSourceIsObjectUrl(true);
    const blobUrl = URL.createObjectURL(file);
    setCropSource(blobUrl);
    setShowCropper(true);
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  useEffect(() => {
    setIsPortalReady(true);
  }, []);

  useEffect(() => {
    if (!isPortalReady || !showCropper) {
      return undefined;
    }

    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyPadding = document.body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.paddingRight = originalBodyPadding;
    };
  }, [showCropper, isPortalReady]);

  const handleCropConfirm = async () => {
    if (!cropSource || !croppedAreaPixels) {
      setError('Please adjust the crop before saving.');
      return;
    }
    setError(null);
    setIsCroppedUploading(true);
    try {
      let originalUrl = value?.originalUrl || originalUpload?.url || null;
      if (selectedFile) {
        setIsOriginalUploading(true);
        const uploadedOriginal = await uploadToCloudinary(selectedFile, 'original');
        originalUrl = uploadedOriginal.url;
        setOriginalUpload(uploadedOriginal);
        setSelectedFile(null);
      }
      const blob = await getCroppedImage(cropSource, croppedAreaPixels, {
        circle: true,
        width: 400,
        height: 400
      });
      const file = new File([blob], 'profile-cropped.png', { type: 'image/png' });
      const croppedUpload = await uploadToCloudinary(file, 'cropped');
      onChange({
        originalUrl: originalUrl || value?.originalUrl || '',
        croppedUrl: croppedUpload.url
      });
      if (cropSource && cropSourceIsObjectUrl) {
        URL.revokeObjectURL(cropSource);
      }
      setCropSource(null);
      setCropSourceIsObjectUrl(false);
      setShowCropper(false);
    } catch (cropError) {
      setError(cropError.message || 'Unable to crop image.');
    } finally {
      setIsCroppedUploading(false);
      setIsOriginalUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    onChange({ originalUrl: '', croppedUrl: '' });
    if (cropSource && cropSourceIsObjectUrl) {
      URL.revokeObjectURL(cropSource);
    }
    setCropSource(null);
    setCropSourceIsObjectUrl(false);
    setSelectedFile(null);
    setOriginalUpload(null);
    setShowCropper(false);
    setError(null);
  };

  const handleReCrop = () => {
    if (value?.originalUrl) {
      if (cropSource && cropSourceIsObjectUrl) {
        URL.revokeObjectURL(cropSource);
      }
      setCropSource(value.originalUrl);
      setCropSourceIsObjectUrl(false);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setSelectedFile(null);
      setShowCropper(true);
    }
  };

  const handleCropCancel = () => {
    if (cropSource && cropSourceIsObjectUrl) {
      URL.revokeObjectURL(cropSource);
    }
    setCropSource(null);
    setCropSourceIsObjectUrl(false);
    setSelectedFile(null);
    setOriginalUpload(null);
    setShowCropper(false);
    setIsOriginalUploading(false);
    setIsCroppedUploading(false);
    setError(null);
  };

  return (
    <>
      <div className="uploader">
        <label className="upload-label">
          <span>
            Private reference photo
            {required ? ' (required)' : ''}
          </span>
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileSelection}
            disabled={disabled || isOriginalUploading || isCroppedUploading}
            aria-required={required}
          />
        </label>
        <p className="upload-note">
          Upload a suited photo so the admin team can recognise you when editing event imagery. We keep
          the original private — only the team can access it.
        </p>
        {(isOriginalUploading || isCroppedUploading) && <p className="upload-status">Uploading…</p>}
        {error && <p className="upload-error">{error}</p>}
        {value?.croppedUrl ? (
          <div className="preview">
            <Image
              src={value.croppedUrl}
              alt="Profile reference"
              width={96}
              height={96}
              className="preview-image"
            />
            <div className="preview-actions">
              <button type="button" onClick={handleReCrop} disabled={disabled}>
                Re-crop
              </button>
              <button type="button" onClick={handleRemovePhoto} disabled={disabled}>
                Remove
              </button>
            </div>
          </div>
        ) : null}
      </div>
      {showCropper && cropSource && (
        isPortalReady
          ? createPortal(
              <CropperModal
                image={cropSource}
                crop={crop}
                zoom={zoom}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                onCancel={handleCropCancel}
                onConfirm={handleCropConfirm}
                isSaving={isCroppedUploading}
              />,
              document.body
            )
          : null
      )}
      <style jsx>{`
        .uploader {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .upload-label {
          display: inline-flex;
          flex-direction: column;
          gap: 0.4rem;
          font-size: 0.78rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          opacity: 0.8;
        }
        .upload-label input[type='file'] {
          color: inherit;
        }
        .upload-note {
          margin: 0;
          font-size: 0.75rem;
          opacity: 0.65;
        }
        .upload-status {
          margin: 0;
          font-size: 0.78rem;
          opacity: 0.7;
        }
        .upload-error {
          margin: 0;
          font-size: 0.8rem;
          color: #ff9f9f;
        }
        .preview {
          display: inline-flex;
          flex-direction: column;
          gap: 0.4rem;
          width: fit-content;
        }
        .preview-image {
          width: 96px;
          height: 96px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          object-fit: cover;
        }
        .preview-actions {
          display: flex;
          gap: 0.5rem;
        }
        .preview-actions button {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 999px;
          padding: 0.3rem 0.8rem;
          font-size: 0.7rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--color-gold);
        }
      `}</style>
    </>
  );
}

async function uploadToCloudinary(file, variant) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('variant', variant);

  const response = await fetch('/api/profile/photo', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || 'Unable to upload image.');
  }

  return response.json();
}

function CropperModal({
  image,
  crop,
  zoom,
  onCropChange,
  onZoomChange,
  onCropComplete,
  onCancel,
  onConfirm,
  isSaving
}) {
  return (
    <div className="cropper-overlay" role="dialog" aria-modal="true">
      <div className="cropper-container">
        <button
          type="button"
          className="close-button"
          onClick={onCancel}
          disabled={isSaving}
          aria-label="Close photo cropper"
        >
          ✕
        </button>
        <div className="cropper-frame">
          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="cropper-controls">
          <label>
            Zoom
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(event) => onZoomChange(Number(event.target.value))}
            />
          </label>
          <div className="cropper-buttons">
            <button type="button" onClick={onCancel} disabled={isSaving}>
              Cancel
            </button>
            <button type="button" onClick={onConfirm} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save crop'}
            </button>
          </div>
        </div>
      </div>
      <style jsx>{`
        .cropper-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 18, 30, 0.95);
          display: flex;
          z-index: 1000;
          padding: clamp(1rem, 4vw, 2.5rem);
          box-sizing: border-box;
          overscroll-behavior: contain;
        }
        .cropper-container {
          position: relative;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: clamp(1rem, 2.5vw, 1.75rem);
          background: rgba(11, 21, 35, 0.92);
          border-radius: clamp(12px, 2vw, 22px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 40px 80px rgba(4, 8, 16, 0.6);
          padding: clamp(1rem, 3vw, 2rem);
          overflow: hidden;
          box-sizing: border-box;
        }
        .close-button {
          position: absolute;
          top: clamp(0.5rem, 2vw, 1rem);
          right: clamp(0.5rem, 2vw, 1rem);
          background: rgba(15, 23, 39, 0.75);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 999px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          color: var(--color-gold);
          cursor: pointer;
        }
        .close-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .cropper-frame {
          position: relative;
          flex: 1;
          min-height: 0;
          border-radius: clamp(12px, 2vw, 22px);
          overflow: hidden;
          background: rgba(6, 12, 20, 0.9);
          touch-action: none;
        }
        .cropper-frame :global(.reactEasyCrop_Container) {
          position: absolute !important;
          inset: 0;
        }
        .cropper-frame :global(.reactEasyCrop_CropArea) {
          border-radius: 50% !important;
        }
        .cropper-controls {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
          padding: clamp(0.75rem, 2vw, 1.25rem);
          border-radius: clamp(12px, 2vw, 18px);
          background: rgba(8, 16, 28, 0.85);
          backdrop-filter: blur(12px);
        }
        .cropper-controls label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .cropper-controls input[type='range'] {
          width: 100%;
        }
        .cropper-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .cropper-buttons button {
          padding: 0.65rem 1rem;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: transparent;
          color: var(--color-gold);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-size: 0.75rem;
        }
        .cropper-buttons button:last-child {
          background: linear-gradient(120deg, var(--color-gold), var(--color-amber));
          color: #0f1727;
          border: none;
        }
        .cropper-buttons button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        @media (max-width: 720px) {
          .cropper-overlay {
            padding: 0.5rem;
          }
          .cropper-container {
            border-radius: 0;
            padding: 1rem;
          }
          .close-button {
            width: 32px;
            height: 32px;
            font-size: 0.9rem;
          }
          .cropper-controls {
            padding: 0.75rem;
          }
        }
      `}</style>
    </div>
  );
}

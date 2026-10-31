import { useEffect, useState } from 'react';
import { api } from './api';

// Community guidelines, privacy policy, photography notice and welcome-screen
// covers from /api/v1/content. Fetched once per launch and shared.
let cached = null;
let pending = null;

export function loadContent() {
  if (cached) return Promise.resolve(cached);
  pending ??= api
    .content()
    .then((content) => (cached = content))
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function useContent() {
  const [content, setContent] = useState(cached);
  const [error, setError] = useState(null);
  useEffect(() => {
    if (content) return;
    loadContent()
      .then(setContent)
      .catch((e) => setError(e.message));
  }, [content]);
  return { content, error, retry: () => loadContent().then(setContent).catch((e) => setError(e.message)) };
}

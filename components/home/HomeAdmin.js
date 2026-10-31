'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminPhotoCurator from '@/components/admin/AdminPhotoCurator';
import { AppFields, HeroFields, ShowcaseFields } from '@/components/admin/HomeSectionEditors';
import styles from './HomeAdmin.module.css';

// Admins edit the home page in place: switch on admin mode (remembered per
// browser) and an Edit button appears on each editable section.
const AdminMode = createContext({ isAdmin: false, on: false });
const STORAGE_KEY = 'mg-admin-mode';

export function AdminModeProvider({ isAdmin, picker, children }) {
  const [on, setOn] = useState(false);
  const [editing, setEditing] = useState(null); // { section, eventId? }

  useEffect(() => {
    try {
      setOn(isAdmin && window.localStorage.getItem(STORAGE_KEY) === '1');
    } catch {
      // storage unavailable: starts off
    }
  }, [isAdmin]);

  const toggle = () =>
    setOn((value) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, value ? '0' : '1');
      } catch {
        // not remembered
      }
      return !value;
    });

  return (
    <AdminMode.Provider value={{ isAdmin, on: isAdmin && on, toggle, edit: setEditing }}>
      {children}
      {isAdmin ? (
        <button type="button" className={`${styles.toggle} ${on ? styles.toggleOn : ''}`} onClick={toggle} aria-pressed={on}>
          {on ? 'Admin mode on' : 'Admin mode'}
        </button>
      ) : null}
      {editing ? <EditPanel {...editing} picker={picker} onClose={() => setEditing(null)} /> : null}
    </AdminMode.Provider>
  );
}

export function EditButton({ section, eventId, label = 'Edit', className }) {
  const { on, edit } = useContext(AdminMode);
  if (!on) return null;
  return (
    <button type="button" className={`${styles.edit} ${className || ''}`} onClick={() => edit({ section, eventId })}>
      {label}
    </button>
  );
}

// Content only visitors normally see (or placeholders), shown to admins in
// admin mode so they can edit it.
export function AdminModeOnly({ children, note }) {
  const { on } = useContext(AdminMode);
  if (!on) return null;
  return (
    <div className={styles.adminOnly}>
      {note ? <p className={styles.adminNote}>{note}</p> : null}
      {children}
    </div>
  );
}

const TITLES = { hero: 'Hero', apps: 'App downloads', showcase: 'Scrolling photos', featured: 'Photos shown first' };

function EditPanel({ section, eventId, picker, onClose }) {
  const router = useRouter();
  const [content, setContent] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (section === 'featured') return;
    fetch('/api/admin/home-content')
      .then((res) => res.json())
      .then((json) => setContent(json.content))
      .catch(() => setStatus('Couldn’t load the current content.'));
  }, [section]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = async () => {
    setStatus('Saving…');
    try {
      const res = await fetch('/api/admin/home-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content)
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || 'Couldn’t save.');
      router.refresh();
      onClose();
    } catch (e) {
      setStatus(e.message);
    }
  };

  const closeFeatured = () => {
    router.refresh();
    onClose();
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label={`Edit ${TITLES[section]}`}>
      <div className={styles.panel}>
        <header className={styles.panelHead}>
          <h2>{TITLES[section]}</h2>
          <button type="button" className={styles.close} onClick={section === 'featured' ? closeFeatured : onClose}>
            {section === 'featured' ? 'Done' : 'Cancel'}
          </button>
        </header>
        <div className={styles.panelBody}>
          {section === 'featured' ? (
            <AdminPhotoCurator events={picker.events.filter((e) => e.id === eventId)} apiBase={picker.apiBase} siteSlug={picker.siteSlug} />
          ) : !content ? (
            <p>{status || 'Loading…'}</p>
          ) : section === 'hero' ? (
            <HeroFields content={content} setContent={setContent} picker={picker} />
          ) : section === 'apps' ? (
            <AppFields content={content} setContent={setContent} />
          ) : (
            <ShowcaseFields content={content} setContent={setContent} picker={picker} />
          )}
        </div>
        {section !== 'featured' && content ? (
          <footer className={styles.panelFoot}>
            {status ? <span role="status">{status}</span> : <span />}
            <button type="button" className={styles.save} onClick={save}>
              Save
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}

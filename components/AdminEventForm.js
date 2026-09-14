'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { eventSchema } from '@/lib/validators';

const emptyForm = {
  title: '',
  slug: '',
  subtitle: '',
  description: '',
  location: '',
  groupChatLink: '',
  threadId: '',
  galleryUrl: '',
  startTime: '',
  endTime: '',
  primaryColor: '#ffd460',
  secondaryColor: '#3e587b',
  accentColor: '#ffc62d',
  backgroundColor: '#1c2837',
  textColor: '#f7f4ed',
  signupDeadline: '',
  capacity: ''
};

export default function AdminEventForm({ existingEvent }) {
  const router = useRouter();
  const [formState, setFormState] = useState(existingEvent ? mapEvent(existingEvent) : emptyForm);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormState((prev) => ({
      ...prev,
      [field]: field === 'slug' ? value.toLowerCase().replace(/\s+/g, '-') : value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const payload = {
        ...formState,
        published: true,
        capacity: formState.capacity ? Number(formState.capacity) : undefined
      };
      const parsed = eventSchema.safeParse({
        ...payload,
        startTime: payload.startTime || undefined,
        endTime: payload.endTime || undefined,
        signupDeadline: payload.signupDeadline || undefined
      });
      if (!parsed.success) {
        throw new Error('Please check the event details before saving.');
      }

      const response = await fetch(existingEvent ? `/api/events/${existingEvent.id}` : '/api/events', {
        method: existingEvent ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || 'Could not save event.');
      }

      setSuccess(existingEvent ? 'Event updated.' : 'Event created.');
      router.refresh();
      if (!existingEvent) {
        setFormState(emptyForm);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="admin-form glass-panel" onSubmit={handleSubmit}>
      <div className="form-grid">
        <FormField label="Title" value={formState.title} onChange={handleChange('title')} required />
        <FormField label="Slug" value={formState.slug} onChange={handleChange('slug')} required />
      </div>
      <FormField label="Subtitle" value={formState.subtitle} onChange={handleChange('subtitle')} />
      <FormField
        label="Description"
        value={formState.description}
        onChange={handleChange('description')}
        type="textarea"
      />
      <div className="form-grid">
        <FormField
          label="Location"
          value={formState.location}
          onChange={handleChange('location')}
          placeholder="e.g. Private lounge, Spinningfields"
        />
        <FormField
          label="Capacity"
          value={formState.capacity}
          onChange={handleChange('capacity')}
          placeholder="Optional"
        />
      </div>
      <FormField
        label="Group chat link"
        value={formState.groupChatLink}
        onChange={handleChange('groupChatLink')}
        type="url"
        placeholder="https://chat.whatsapp.com/..."
      />
      <FormField
        label="Instagram thread ID"
        value={formState.threadId}
        onChange={handleChange('threadId')}
        placeholder="Copy from the IG group (e.g. 1234567890123456)"
      />
      <div className="form-grid">
        <FormField
          label="Start time"
          value={formState.startTime}
          onChange={handleChange('startTime')}
          type="datetime-local"
          required
        />
        <FormField
          label="End time"
          value={formState.endTime}
          onChange={handleChange('endTime')}
          type="datetime-local"
        />
      </div>
      <FormField
        label="Signup deadline"
        value={formState.signupDeadline}
        onChange={handleChange('signupDeadline')}
        type="datetime-local"
      />
      <FormField
        label="Gallery link"
        value={formState.galleryUrl}
        onChange={handleChange('galleryUrl')}
        type="url"
        placeholder="https://..."
      />
      <div className="color-grid">
        {[
          ['primaryColor', 'Primary'],
          ['secondaryColor', 'Secondary'],
          ['accentColor', 'Accent'],
          ['backgroundColor', 'Background'],
          ['textColor', 'Text']
        ].map(([field, label]) => (
          <FormField
            key={field}
            label={`${label} colour`}
            value={formState[field]}
            onChange={handleChange(field)}
            type="color"
          />
        ))}
      </div>
      {error && <p className="form-error">{error}</p>}
      {success && <p className="form-success">{success}</p>}
      <button type="submit" className="form-submit" disabled={isSubmitting}>
        {isSubmitting ? 'Saving…' : existingEvent ? 'Update event' : 'Create event'}
      </button>
      <style jsx>{`
        .admin-form {
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1rem;
        }
        .color-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 0.75rem;
        }
        .form-error {
          margin: 0;
          color: #ff9c9c;
          font-size: 0.85rem;
        }
        .form-success {
          margin: 0;
          color: #84ffc6;
          font-size: 0.85rem;
        }
        .form-submit {
          align-self: flex-start;
          padding: 0.8rem 1.8rem;
          border-radius: 12px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #0f1727;
          background: linear-gradient(120deg, var(--color-gold), var(--color-amber));
        }
      `}</style>
    </form>
  );
}

function mapEvent(event) {
  return {
    title: event.title || '',
    slug: event.slug || '',
    subtitle: event.subtitle || '',
    description: event.description || '',
    location: event.location || '',
    groupChatLink: event.groupChatLink || '',
    threadId: event.threadId || '',
    galleryUrl: event.galleryUrl || '',
    startTime: event.startTime ? new Date(event.startTime).toISOString().slice(0, 16) : '',
    endTime: event.endTime ? new Date(event.endTime).toISOString().slice(0, 16) : '',
    primaryColor: event.primaryColor || '#ffd460',
    secondaryColor: event.secondaryColor || '#3e587b',
    accentColor: event.accentColor || '#ffc62d',
    backgroundColor: event.backgroundColor || '#1c2837',
    textColor: event.textColor || '#f7f4ed',
    signupDeadline: event.signupDeadline
      ? new Date(event.signupDeadline).toISOString().slice(0, 16)
      : '',
    capacity: event.capacity || ''
  };
}

function FormField({ label, type = 'text', ...props }) {
  if (type === 'textarea') {
    return (
      <label className="field">
        <span>{label}</span>
        <textarea {...props} rows={4} />
        <style jsx>{`
          .field {
            display: flex;
            flex-direction: column;
            gap: 0.45rem;
          }
          textarea {
            border-radius: 12px;
            padding: 0.9rem 1rem;
            background: rgba(11, 21, 35, 0.7);
            border: 1px solid rgba(255, 255, 255, 0.08);
            color: inherit;
          }
          textarea:focus {
            outline: none;
            border-color: var(--color-gold);
          }
        `}</style>
      </label>
    );
  }

  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} {...props} />
      <style jsx>{`
        .field {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        input {
          border-radius: 12px;
          padding: 0.7rem 1rem;
          background: rgba(11, 21, 35, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: inherit;
        }
        input:focus {
          outline: none;
          border-color: var(--color-gold);
        }
        input[type='color'] {
          height: 50px;
          padding: 0.2rem;
        }
      `}</style>
    </label>
  );
}

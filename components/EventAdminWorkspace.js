'use client';

import { useState } from 'react';
import AdminEventForm from '@/components/AdminEventForm';
import AdminAddToEventForm from '@/components/AdminAddToEventForm';
import EventAttendeeManager from '@/components/EventAttendeeManager';
import CommunityChatChecklist from '@/components/CommunityChatChecklist';
import EventAttendeeSyncPanel from '@/components/EventAttendeeSyncPanel';
import styles from './EventAdminWorkspace.module.css';

const TAB_CONFIG = [
  {
    id: 'event',
    label: 'Event details',
    description: 'Tune copy, palette, schedule, and capacity controls.'
  },
  {
    id: 'guestlist',
    label: 'Guest list',
    description: 'Add members or placeholders, then prune the attendee list if plans change.'
  },
  {
    id: 'community',
    label: 'Community chat',
    description: 'After the night wraps, add first-time attendees to the standing Instagram DM.'
  }
];

export default function EventAdminWorkspace({
  event,
  users = [],
  attendees = [],
  eventAttendees = [],
  isAdmin = false
}) {
  const [activeTab, setActiveTab] = useState('event');

  return (
    <section className={styles.workspace}>
      <div className={styles.tabBar} role="tablist" aria-label="Event admin sections">
        {TAB_CONFIG.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.tabPanels}>
        {TAB_CONFIG.map((tab) => (
          <section
            key={tab.id}
            role="tabpanel"
            aria-labelledby={`tab-${tab.id}`}
            className={`${styles.panel} ${activeTab === tab.id ? styles.panelActive : styles.panelHidden}`}
          >
            <div className={styles.panelIntro}>
              <h2>{tab.label}</h2>
              <p>{tab.description}</p>
            </div>
            {tab.id === 'event' && (
              <div className={styles.panelBody}>
                <AdminEventForm existingEvent={event} />
              </div>
            )}
            {tab.id === 'guestlist' && (
              <div className={styles.panelBody}>
                <div className={styles.guestGrid}>
                  <div className={styles.guestCard}>
                    <AdminAddToEventForm events={[event]} users={users} />
                  </div>
                  <div className={styles.guestCard}>
                    <EventAttendeeManager eventId={event.id} attendees={attendees} />
                  </div>
                </div>
              </div>
            )}
            {tab.id === 'community' && (
              <div className={styles.panelBody}>
                <EventAttendeeSyncPanel
                  event={event}
                  attendees={eventAttendees}
                  isAdmin={isAdmin}
                />
                <CommunityChatChecklist
                  attendees={eventAttendees}
                  eventStartTime={event.startTime}
                />
              </div>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./AdminRsvpRemindersTable.module.css";

function normalizeHandle(handle) {
  return (handle || "").replace(/^@/, "").trim();
}

export default function AdminRsvpRemindersTable({
  eventId,
  eventSlug,
  eventTitle,
  eventStartTimeIso,
  rsvpLink,
  members,
}) {

  const [statusById, setStatusById] = useState(() => ({}));
  const [query, setQuery] = useState("");

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return members;

    return members.filter((member) => {
      const handle = normalizeHandle(member.instagramHandle).toLowerCase();
      const name = (member.displayName || "").toLowerCase();
      return handle.includes(normalizedQuery) || name.includes(normalizedQuery);
    });
  }, [members, query]);

  const handleSend = async (member) => {
    const memberId = member.id;
    setStatusById((prev) => ({
      ...prev,
      [memberId]: { state: "sending", message: "Sending…" },
    }));


    try {
      const response = await fetch("/api/admin/rsvp-reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: memberId, eventId }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to send reminder.");
      }

      setStatusById((prev) => ({
        ...prev,
        [memberId]: { state: "sent", message: data.via === "push" ? "Sent to the app." : "Emailed." },
      }));
    } catch (error) {
      setStatusById((prev) => ({
        ...prev,
        [memberId]: {
          state: "error",
          message: error.message || "Unable to send reminder.",
        },
      }));
    }
  };

  return (
    <section className={styles.section}>
      <header className={styles.sectionHeader}>
        <div>
          <h2>Members missing RSVP</h2>
          <p className={styles.sectionMeta}>
            {members.length} {members.length === 1 ? "member" : "members"}{" "}
            haven’t RSVPed yet.
          </p>
        </div>
        <div className={styles.tools}>
          <label className={styles.search}>
            <span className={styles.searchLabel}>Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={styles.searchInput}
              placeholder="Search name or @handle"
            />
          </label>
          <Link
            href={`/events/${eventSlug}`}
            className={styles.viewEventLink}
            target="_blank"
            rel="noreferrer"
          >
            View event →
          </Link>
        </div>
      </header>

      <p className={styles.templateHint}>
        Members with the app get a push notification that opens the event. Everyone else gets an email.
      </p>

      {members.length === 0 ? (
        <div className={`${styles.emptyCard} glass-panel`}>
          <h3>Everyone is RSVPed</h3>
          <p>
            No non-placeholder members are currently missing an RSVP for this
            event.
          </p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <p className={styles.emptyNotice}>No matches for “{query}”.</p>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Member</th>
                <th>Instagram</th>
                <th>Joined</th>
                <th>Events</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((member) => {
                const handle = normalizeHandle(member.instagramHandle);
                const memberStatus = statusById[member.id];
                const sending = memberStatus?.state === "sending";
                const sent = memberStatus?.state === "sent";
                const error = memberStatus?.state === "error";

                return (
                  <tr key={member.id}>
                    <td data-label="Member">
                      <div className={styles.memberBlock}>
                        <span className={styles.memberName}>
                          {member.displayName || "Member"}
                        </span>
                        <Link
                          href={`/admin/members/${handle || member.id}`}
                          className={styles.memberLink}
                        >
                          View profile →
                        </Link>
                      </div>
                    </td>
                    <td data-label="Instagram">
                      <span className={styles.handleText}>
                        {handle ? `@${handle}` : "—"}
                      </span>
                    </td>
                    <td data-label="Joined">
                      {member.createdAtIso
                        ? new Date(member.createdAtIso).toLocaleDateString(
                            "en-GB"
                          )
                        : "—"}
                    </td>
                    <td data-label="Events">
                      {member.eventsSignedUpCount ?? 0}
                    </td>
                    <td className={styles.actionCell}>
                      <div className={styles.actionStack}>
                        <button
                          type="button"
                          className={`${styles.sendButton} ${
                            sent ? styles.sendButtonSent : ""
                          }`}
                          onClick={() => handleSend(member)}
                          disabled={sending || sent || !handle}
                          title={
                            !handle ? "Missing Instagram handle" : undefined
                          }
                        >
                          {sending ? "Sending…" : sent ? "Sent" : "Send reminder"}
                        </button>
                        {memberStatus?.message && (
                          <span
                            className={`${styles.status} ${
                              error
                                ? styles.statusError
                                : sent
                                ? styles.statusSuccess
                                : ""
                            }`}
                          >
                            {memberStatus.message}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

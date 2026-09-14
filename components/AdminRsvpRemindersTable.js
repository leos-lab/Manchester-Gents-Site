"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import styles from "./AdminRsvpRemindersTable.module.css";

function normalizeHandle(handle) {
  return (handle || "").replace(/^@/, "").trim();
}

function fillTemplate(template, tokens) {
  return Object.entries(tokens).reduce((value, [key, replacement]) => {
    const safe = String(replacement ?? "");
    return value.replaceAll(`{{${key}}}`, safe);
  }, template);
}

export default function AdminRsvpRemindersTable({
  eventId,
  eventSlug,
  eventTitle,
  eventStartTimeIso,
  rsvpLink,
  members,
}) {
  const [messageTemplate, setMessageTemplate] = useState(() => {
    const startTime = eventStartTimeIso ? new Date(eventStartTimeIso) : null;
    const dateLabel = startTime
      ? startTime.toLocaleString("en-GB", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "";

    return [
      "Hi {{name}}!",
      "",
      "Thank you for being part of Manchester Gents by registering an account with us!",
      "",

      `Quick reminder to RSVP for ${eventTitle}${
        dateLabel ? ` (${dateLabel})` : ""
      }.`,
      "",
      "RSVP here:",
      "{{rsvpLink}}",
      "",
      "If you have any questions, please message @manchestergents. 🕴️🐝",
    ].join("\n");
  });

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
    const handle = normalizeHandle(member.instagramHandle);
    if (!handle) {
      setStatusById((prev) => ({
        ...prev,
        [memberId]: { state: "error", message: "Missing Instagram handle." },
      }));
      return;
    }

    setStatusById((prev) => ({
      ...prev,
      [memberId]: { state: "sending", message: "Sending…" },
    }));

    const message = fillTemplate(messageTemplate, {
      name: member.displayName || handle,
      rsvpLink,
      eventTitle,
      eventSlug,
    });

    try {
      const response = await fetch("/api/admin/rsvp-reminders/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: memberId,
          eventId,
          message,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to send DM.");
      }

      setStatusById((prev) => ({
        ...prev,
        [memberId]: { state: "sent", message: "Sent." },
      }));
    } catch (error) {
      setStatusById((prev) => ({
        ...prev,
        [memberId]: {
          state: "error",
          message: error.message || "Unable to send DM.",
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

      <details className={styles.templateDetails}>
        <summary className={styles.templateSummary}>Message template</summary>
        <p className={styles.templateHint}>
          Use placeholders: <code>{"{{name}}"}</code>,{" "}
          <code>{"{{rsvpLink}}"}</code>.
        </p>
        <textarea
          className={styles.templateTextarea}
          value={messageTemplate}
          onChange={(event) => setMessageTemplate(event.target.value)}
          rows={8}
        />
      </details>

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
                          {sending ? "Sending…" : sent ? "Sent" : "Send DM"}
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

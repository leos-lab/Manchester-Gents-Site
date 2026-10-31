'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Nav bar bell (as in the app's toolbar): opens /notifications and shows how
// many are unread. Checks again on each page change and every few minutes.
export default function NotificationBell() {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const check = () =>
      fetch('/api/v1/notifications')
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => !cancelled && json && setUnread(json.unread))
        .catch(() => {});
    check();
    const timer = setInterval(check, 3 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [pathname]);

  return (
    <Link href="/notifications" className="nav-secondary nav-bell" aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      {unread ? <span className="nav-bell-badge">{unread > 9 ? '9+' : unread}</span> : null}
    </Link>
  );
}

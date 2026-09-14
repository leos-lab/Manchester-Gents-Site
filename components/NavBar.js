"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import clsx from "clsx";
import { getDisplayName } from "@/lib/displayName";
import ToggleAdminModeButton from "@/components/ToggleAdminModeButton";
import { useAdminMode } from "@/components/AdminModeProvider";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/events", label: "Events" },
];

function NavBarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const userRole = session?.user?.role;
  const displayName = getDisplayName(session?.user);
  const avatarUrl = session?.user?.profilePhotoUrl || null;
  const [menuOpen, setMenuOpen] = useState(false);
  const { adminMode } = useAdminMode();

  const redirectPath = useMemo(() => {
    const basePath = pathname || "/";
    if (basePath.startsWith("/login") || basePath.startsWith("/register")) {
      return "/";
    }
    const query = searchParams?.toString();
    return query ? `${basePath}?${query}` : basePath;
  }, [pathname, searchParams]);

  const loginHref = `/login${redirectPath === "/" ? "" : `?redirect=${encodeURIComponent(redirectPath)}`}`;
  const registerHref = `/register${redirectPath === "/" ? "" : `?redirect=${encodeURIComponent(redirectPath)}`}`;

  // Close the mobile menu when navigating to a new route.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className={clsx("navbar", menuOpen && "navbar-open")}>
      <div className="nav-inner">
        <div className="brand-row">
          <Link href="/" className="brand" aria-label="Manchester Gents home">
            <Image
              src="/images/Horizontal Logo.svg"
              alt="Manchester Gents"
              width={190}
              height={52}
              priority
              className="brand-image"
            />
          </Link>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="primary-navigation"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <span className="sr-only">
              {menuOpen ? "Close navigation" : "Open navigation"}
            </span>
            <span className={clsx("menu-icon", menuOpen && "menu-icon-open")} />
          </button>
        </div>
        <div className={clsx("nav-panel", menuOpen && "nav-panel-open")}>
          <nav id="primary-navigation" className="nav-links">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "nav-link",
                  pathname === link.href && "nav-link-active"
                )}
              >
                {link.label}
              </Link>
            ))}
            {userRole === "ADMIN" && (
              <Link
                href="/admin"
                className={clsx(
                  "nav-link",
                  pathname.startsWith("/admin") && "nav-link-active"
                )}
              >
                Admin
              </Link>
            )}
          </nav>
          <div className="nav-actions">
            {userRole === "ADMIN" && <ToggleAdminModeButton />}
            {status === "loading" ? null : session ? (
              <>
                <Link href="/dashboard" className="nav-secondary">
                  Dashboard
                </Link>
                <Link href="/profile" className="nav-cta">
                  {avatarUrl && (
                    <span className="nav-avatar">
                      <Image
                        src={avatarUrl}
                        alt={displayName || "Profile"}
                        width={28}
                        height={28}
                      />
                    </span>
                  )}
                  <span>{displayName || "Profile"}</span>
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="nav-secondary"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link href={loginHref} className="nav-secondary">
                  Log in
                </Link>
                <Link href={registerHref} className="nav-cta">
                  Join the Club
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <style jsx>{`
        .navbar {
          position: sticky;
          top: 0;
          z-index: 50;
          backdrop-filter: saturate(140%) blur(16px);
          background: radial-gradient(
            circle at top left,
            rgba(37, 54, 83, 0.78),
            rgba(11, 19, 33, 0.88)
          );
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .navbar-open {
          box-shadow: 0 18px 40px rgba(9, 15, 26, 0.36);
        }
        .nav-inner {
          max-width: 1200px;
          margin: 0 auto;
          padding: clamp(0.65rem, 3vw, 0.85rem) clamp(1rem, 5vw, 1.75rem);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .brand-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
        }
        .brand {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
        }
        .brand-image {
          height: 50px;
          width: auto;
          filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.35));
        }
        .menu-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 46px;
          height: 46px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(17, 27, 45, 0.6);
          color: inherit;
          transition: background 0.2s ease, border-color 0.2s ease;
        }
        @media (max-width: 720px) {
          .brand-image {
            height: 42px;
          }
        }
        .menu-toggle:focus-visible {
          outline: 2px solid var(--color-gold);
          outline-offset: 3px;
        }
        .menu-toggle:hover {
          background: rgba(22, 34, 56, 0.78);
          border-color: rgba(255, 255, 255, 0.28);
        }
        .menu-icon,
        .menu-icon::before,
        .menu-icon::after {
          content: "";
          display: block;
          width: 22px;
          height: 2px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.88);
          transition: transform 0.2s ease, opacity 0.2s ease;
        }
        .menu-icon {
          position: relative;
        }
        .menu-icon::before {
          position: absolute;
          top: -6px;
        }
        .menu-icon::after {
          position: absolute;
          top: 6px;
        }
        .menu-icon-open {
          background: transparent;
        }
        .menu-icon-open::before {
          transform: translateY(6px) rotate(45deg);
        }
        .menu-icon-open::after {
          transform: translateY(-6px) rotate(-45deg);
        }
        .nav-panel {
          display: none;
          flex-direction: column;
          gap: 1.25rem;
          width: 100%;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .nav-panel-open {
          display: flex;
        }
        .nav-links {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .nav-link {
          font-size: 0.95rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          opacity: 0.78;
          padding: 0.65rem 1rem;
          border-radius: 12px;
          background: rgba(22, 33, 53, 0.56);
          border: 1px solid transparent;
          transition: opacity 0.2s ease, border-color 0.2s ease,
            background 0.2s ease;
        }
        .nav-link-active {
          color: var(--color-gold);
          opacity: 1;
          border-color: rgba(255, 255, 255, 0.24);
          background: rgba(22, 33, 53, 0.78);
        }
        .nav-link:hover {
          opacity: 1;
          border-color: rgba(255, 255, 255, 0.18);
        }
        .nav-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        :global(.nav-cta),
        :global(.nav-secondary) {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0 1.4rem;
          height: 44px;
          border-radius: 999px;
          font-size: 0.9rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        :global(.nav-cta) {
          color: #0c1523;
          background: linear-gradient(
            140deg,
            var(--color-gold),
            var(--color-amber)
          );
          box-shadow: 0 12px 22px rgba(255, 212, 96, 0.32);
        }
        :global(.nav-cta:hover) {
          filter: brightness(1.08);
        }
        :global(.nav-secondary) {
          color: var(--color-gold);
          background: rgba(30, 46, 70, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.16);
        }
        :global(.nav-secondary:hover) {
          background: rgba(35, 52, 80, 0.86);
          border-color: rgba(255, 255, 255, 0.22);
        }
        :global(.nav-avatar) {
          display: inline-flex;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.18);
        }
        :global(.nav-avatar img) {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          border: 0;
        }
        @media (min-width: 960px) {
          .nav-inner {
            display: grid;
            grid-template-columns: auto 1fr auto;
            align-items: center;
            padding: 1.1rem 2.5rem;
            gap: 2.5rem;
          }
          .brand-row {
            margin: 0;
          }
          .menu-toggle {
            display: none;
          }
          .nav-panel {
            display: contents;
          }
          .nav-links {
            flex-direction: row;
            justify-content: center;
            gap: 1.75rem;
            justify-self: center;
          }
          .nav-link {
            background: transparent;
            padding: 0.35rem 0;
            border-radius: 0;
            border: none;
          }
          .nav-link-active {
            border-bottom: 2px solid var(--color-gold);
            background: transparent;
          }
          .nav-actions {
            flex-direction: row;
            align-items: center;
            gap: 1rem;
            justify-self: end;
          }
        }
        @media (min-width: 1200px) {
          .nav-inner {
            padding: 1.25rem 3rem;
          }
          .nav-link {
            font-size: 1rem;
            letter-spacing: 0.1em;
          }
        }
      `}</style>
    </header>
  );
}

export default function NavBar() {
  return (
    <Suspense
      fallback={
        <header className="navbar">
          <div className="nav-inner">
            <div className="brand-row">
              <Link href="/" className="brand" aria-label="Manchester Gents home">
                <Image
                  src="/images/Horizontal Logo.svg"
                  alt="Manchester Gents"
                  width={190}
                  height={52}
                  priority
                  className="brand-image"
                />
              </Link>
            </div>
          </div>
        </header>
      }
    >
      <NavBarContent />
    </Suspense>
  );
}

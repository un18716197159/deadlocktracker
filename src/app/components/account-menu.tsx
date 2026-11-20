"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../lib/i18n/provider";
import "./account-menu.css";

type Me = { accountId: number; name?: string; avatar?: string } | null | undefined;

function SteamIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.7 0 .6 4.9.03 11.1l6.4 2.65a3.4 3.4 0 0 1 1.92-.59h.2l2.85-4.13v-.06a4.5 4.5 0 1 1 4.5 4.5h-.1l-4.07 2.9v.16a3.4 3.4 0 0 1-6.73.7L.3 14.9A12 12 0 1 0 12 0Zm-4.4 18.2-1.46-.6a2.55 2.55 0 0 0 4.9-.95 2.55 2.55 0 0 0-3.35-2.4l1.5.62a1.88 1.88 0 1 1-1.4 3.5l-.19-.17Zm8.28-5.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm0-.8a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" />
    </svg>
  );
}

export default function AccountMenu() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [me, setMe] = useState<Me>(undefined);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => alive && setMe(data?.user ?? null))
      .catch(() => alive && setMe(null));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.reload();
  }

  if (me === undefined) return <div className="account-menu account-placeholder" aria-hidden="true" />;

  if (me === null) {
    return (
      <div className="account-menu">
        <a className="steam-signin" href={`/api/auth/steam?next=${encodeURIComponent(pathname || "/")}`}>
          <SteamIcon />
          <span>{t("auth.signIn")}</span>
        </a>
      </div>
    );
  }

  return (
    <div className="account-menu" ref={root}>
      <button className="account-avatar-button" type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <span className="account-avatar" style={me.avatar ? { backgroundImage: `url("${me.avatar}")` } : undefined}>{me.avatar ? "" : (me.name ?? "P").slice(0, 1).toUpperCase()}</span>
        <span className="account-name">{me.name ?? t("auth.profile")}</span>
      </button>
      {open && (
        <div className="account-dropdown" role="menu">
          <Link role="menuitem" href={`/players/${me.accountId}`} onClick={() => setOpen(false)}>{t("auth.profile")}</Link>
          <button role="menuitem" type="button" onClick={logout}>{t("auth.signOut")}</button>
        </div>
      )}
    </div>
  );
}

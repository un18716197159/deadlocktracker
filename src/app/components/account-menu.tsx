"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import "./account-menu.css";

type Me = { accountId: number } | null | undefined;

export default function AccountMenu() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me>(undefined);

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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.reload();
  }

  if (me === undefined) return <div className="account-menu" aria-hidden="true" />;

  if (me === null) {
    return (
      <div className="account-menu">
        <a className="account-button primary" href={`/api/auth/steam?next=${encodeURIComponent(pathname || "/")}`}>
          Sign in with Steam
        </a>
      </div>
    );
  }

  return (
    <div className="account-menu">
      <Link className="account-button primary" href={`/players/${me.accountId}`}>
        My profile
      </Link>
      <button className="account-button" type="button" onClick={logout}>
        Sign out
      </button>
    </div>
  );
}

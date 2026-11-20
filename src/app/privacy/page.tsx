import AppShell from "../components/app-shell";
import { L } from "../../lib/i18n/provider";

export const metadata = {
  title: "Privacy & about | Deadlock Tracker",
  description: "What Deadlock Tracker stores, which cookies it uses, and where the data comes from.",
};

export default function PrivacyPage() {
  return (
    <AppShell active="">
      <main className="content-inner legal-page">
        <h1><L>Privacy &amp; about</L></h1>
        <p className="muted"><L>Deadlock Tracker is an unofficial fan project and is not affiliated with Valve. Deadlock and its artwork are © Valve Corporation.</L></p>

        <h2><L>Where the data comes from</L></h2>
        <p><L>Match, player and hero statistics come from the community-run Deadlock API. Item icons are the game&apos;s artwork, shown with credit to deadlock.gs. Public Steam profile information (name and avatar) is shown for players that the API returns.</L></p>

        <h2><L>Signing in with Steam</L></h2>
        <p><L>Sign-in uses Steam OpenID. We only receive your public SteamID and never your Steam password. We store your SteamID, the matching Deadlock account ID, and the time of your last login so that your profile button and saved players work.</L></p>

        <h2><L>Saved players</L></h2>
        <p><L>If you save a player, we store that player&apos;s account ID, public name and avatar link, linked to your account. You can remove a saved player at any time with the star button on their profile.</L></p>

        <h2><L>Cookies and local storage</L></h2>
        <ul>
          <li><b>dt_session</b> <L>— keeps you signed in (strictly necessary, expires after 30 days).</L></li>
          <li><b>dt_lang</b> <L>— remembers your language.</L></li>
          <li><b><L>Local storage</L></b> <L>— language, and the list of recently viewed players, stay in your browser only.</L></li>
        </ul>
        <p><L>We do not use advertising cookies.</L></p>

        <h2><L>Contact and removal</L></h2>
        <p><L>To have your stored sign-in data removed, use Sign out and contact the site owner through the project&apos;s GitHub repository.</L></p>
      </main>
    </AppShell>
  );
}

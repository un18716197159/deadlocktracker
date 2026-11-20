import AppShell from "../components/app-shell";

export const metadata = {
  title: "Privacy & about | Deadlock Intelligence",
  description: "What Deadlock Intelligence stores, which cookies it uses, and where the data comes from.",
};

export default function PrivacyPage() {
  return (
    <AppShell active="">
      <main className="content-inner legal-page">
        <h1>Privacy &amp; about</h1>
        <p className="muted">Deadlock Intelligence is an unofficial fan project and is not affiliated with Valve. Deadlock and its artwork are © Valve Corporation.</p>

        <h2>Where the data comes from</h2>
        <p>Match, player and hero statistics come from the community-run Deadlock API. Item icons are the game&apos;s artwork, shown with credit to deadlock.gs. Public Steam profile information (name and avatar) is shown for players that the API returns.</p>

        <h2>Signing in with Steam</h2>
        <p>Sign-in uses Steam OpenID. We only receive your public SteamID and never your Steam password. We store your SteamID, the matching Deadlock account ID, and the time of your last login so that your profile button and saved players work.</p>

        <h2>Saved players</h2>
        <p>If you save a player, we store that player&apos;s account ID, public name and avatar link, linked to your account. You can remove a saved player at any time with the star button on their profile.</p>

        <h2>Cookies and local storage</h2>
        <ul>
          <li><b>dt_session</b> — keeps you signed in (strictly necessary, expires after 30 days).</li>
          <li><b>dt_lang</b> — remembers your language.</li>
          <li><b>Local storage</b> — language, and the list of recently viewed players, stay in your browser only.</li>
        </ul>
        <p>We do not use advertising cookies.</p>

        <h2>Contact and removal</h2>
        <p>To have your stored sign-in data removed, use Sign out and contact the site owner through the project&apos;s GitHub repository.</p>
      </main>
    </AppShell>
  );
}

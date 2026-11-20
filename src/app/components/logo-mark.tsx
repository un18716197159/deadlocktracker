/**
 * Deadlock Tracker mark: an angular hexagon badge (art-deco, like the game's emblems) with a keyhole
 * cut out of it, and a thin inner frame. Flat, no gradients. The same drawing is in src/app/icon.svg.
 */
export default function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 1 29.5 8.75v14.5L16 31 2.5 23.25V8.75Z" fill="#7c6cf0" />
      <path d="M16 4.6 26.4 10.6v10.8L16 27.4 5.6 21.4V10.6Z" fill="none" stroke="#0e1015" strokeWidth="1.1" />
      <path d="M16 8.6a4 4 0 0 1 1.9 7.52L19.6 22.6h-7.2l1.7-6.48A4 4 0 0 1 16 8.6Z" fill="#0e1015" />
    </svg>
  );
}

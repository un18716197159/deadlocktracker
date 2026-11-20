export default function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#8b5cf6" />
      <path d="M9 8h7.2c5 0 8 3.2 8 8s-3 8-8 8H9V8Zm4 3.6v8.8h3c2.7 0 4.2-1.7 4.2-4.4s-1.5-4.4-4.2-4.4h-3Z" fill="#fff" />
    </svg>
  );
}

type RankBadgeProps = {
  tier?: number | null;
  subrank?: number | null;
  name?: string | null;
  image?: string | null;
  size?: "sm" | "md" | "lg";
};

export default function RankBadge({ tier, subrank, name, image, size = "md" }: RankBadgeProps) {
  const hasBadge = typeof image === "string" && image.length > 0;
  const label = name || (typeof tier === "number" ? `Tier ${tier}` : "Rank unavailable");
  return <span
    className={`rank-badge${size === "md" ? "" : ` rank-badge-${size}`}${hasBadge ? "" : " rank-badge-fallback"}`}
    role="img"
    aria-label={hasBadge ? `${label}${typeof subrank === "number" ? `, division ${subrank}` : ""}` : "Rank artwork unavailable"}
    title={hasBadge ? `${label}${typeof subrank === "number" ? ` · Division ${subrank}` : ""}` : "Rank artwork unavailable"}
    style={hasBadge ? { backgroundImage: `url("${image}")` } : undefined}
  >{hasBadge ? null : "—"}</span>;
}

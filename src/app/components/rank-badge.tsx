type RankBadgeProps = {
  tier?: number | null;
  subrank?: number | null;
  name?: string | null;
  size?: "sm" | "md" | "lg";
};

export default function RankBadge({ tier, subrank, name, size = "md" }: RankBadgeProps) {
  const hasBadge = Number.isInteger(tier) && typeof tier === "number" && tier >= 1 && tier <= 11
    && Number.isInteger(subrank) && typeof subrank === "number" && subrank >= 1 && subrank <= 6;
  const label = name || (typeof tier === "number" ? `Tier ${tier}` : "Rank unavailable");
  if (!hasBadge) return null;

  const image = `https://api.deadlock-api.com/v1/assets/ranks/${tier}/${subrank}/image?format=webp`;
  return <span
    className={`rank-badge${size === "md" ? "" : ` rank-badge-${size}`}`}
    role="img"
    aria-label={`${label}, division ${subrank}`}
    title={`${label} · Division ${subrank}`}
    style={{ backgroundImage: `url("${image}")` }}
  />;
}

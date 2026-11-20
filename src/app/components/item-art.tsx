"use client";

import { useState } from "react";
import { isColorItemIcon, itemImage } from "../../lib/assets";

type Art = { name?: string | null; image?: string | null; image_webp?: string | null; disabled?: boolean | null };

/** Item icon: current local in-game icon first, API image if the local file does not exist. */
export default function ItemArt({ item, alt = "" }: { item: Art; alt?: string }) {
  const [failed, setFailed] = useState(false);
  const api = item.image_webp || item.image || null;
  const src = failed ? api : itemImage(item);
  if (!src) return <i aria-hidden="true">?</i>;
  return <img src={src} alt={alt} loading="lazy" data-icon={isColorItemIcon(src) ? "color" : "glyph"} onError={() => { if (!failed) setFailed(true); }} />;
}

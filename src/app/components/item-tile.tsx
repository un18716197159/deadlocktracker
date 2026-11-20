import ItemArt from "./item-art";
import type { ItemAsset } from "../../lib/items-api";
import "./item-tile.css";

type TileItem = Pick<ItemAsset, "name" | "image" | "image_webp" | "item_slot_type" | "item_tier"> | null;

/** In-game style item icon: white glyph on a slot-coloured tile (weapon / vitality / spirit). */
export default function ItemTile({ item, size = "md" }: { item: TileItem; size?: "sm" | "md" | "lg" | "xl" }) {
  const label = item?.name ?? "Item unavailable";
  return (
    <span className={`item-tile item-tile-${size}`} data-slot={item?.item_slot_type ?? "unknown"} title={label}>
      {item ? <ItemArt item={item} alt={label} /> : <i aria-hidden="true">?</i>}
    </span>
  );
}

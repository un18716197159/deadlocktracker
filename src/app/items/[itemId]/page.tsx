import { connection } from "next/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import AppShell from "../../components/app-shell";
import { getAllItemAssetsIn, getItemAsset } from "../../../lib/items-api";
import { apiLanguage, getRequestLocale } from "../../../lib/i18n/server";
import ItemDetail from "./item-detail";
import { L } from "../../../lib/i18n/provider";

export async function generateMetadata({ params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const item = /^\d+$/.test(itemId) ? await getItemAsset(Number(itemId)).catch(() => undefined) : undefined;
  if (!item) return { title: "Item | Deadlock Tracker" };
  return {
    title: `${item.name} — Deadlock item stats | Deadlock Tracker`,
    description: `${item.name}: win rate, pick rate, cost and the heroes that buy it most in Deadlock.`,
  };
}

async function Content({ params }: { params: Promise<{ itemId: string }> }) {
  await connection();
  const { itemId } = await params;
  if (!/^\d+$/.test(itemId) || !Number.isSafeInteger(Number(itemId))) notFound();
  const language = apiLanguage(await getRequestLocale());
  let item = await getItemAsset(Number(itemId));
  if (item && language !== "english") {
    // Localized name/description; keep the English asset if the API rejects that language.
    const localized = await getAllItemAssetsIn(language).catch(() => []);
    item = localized.find((entry) => entry.id === Number(itemId)) ?? item;
  }
  if (!item) notFound();
  return <ItemDetail item={item} />;
}

export default function Page({ params }: { params: Promise<{ itemId: string }> }) {
  return <AppShell active="Items"><Suspense fallback={<main className="content-inner item-detail-page"><p className="api-message" role="status"><L>Loading item details…</L></p></main>}><Content params={params} /></Suspense></AppShell>;
}

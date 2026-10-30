import { connection } from "next/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import AppShell from "../../components/app-shell";
import { getItemAsset } from "../../../lib/items-api";
import ItemDetail from "./item-detail";

export const metadata = { title: "Item Details | Deadlock Intelligence" };

async function Content({ params }: { params: Promise<{ itemId: string }> }) {
  await connection();
  const { itemId } = await params;
  if (!/^\d+$/.test(itemId) || !Number.isSafeInteger(Number(itemId))) notFound();
  const item = await getItemAsset(Number(itemId));
  if (!item) notFound();
  return <ItemDetail item={item} />;
}

export default function Page({ params }: { params: Promise<{ itemId: string }> }) {
  return <AppShell active="Items"><Suspense fallback={<main className="content-inner item-detail-page"><p className="api-message" role="status">Loading item details…</p></main>}><Content params={params} /></Suspense></AppShell>;
}

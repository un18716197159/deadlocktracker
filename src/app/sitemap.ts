import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const routes = ["", "/heroes", "/items", "/builds", "/matches", "/leaderboards", "/compare"];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return routes.map((route) => ({ url: `${base}${route}`, changeFrequency: "daily", priority: route === "" ? 1 : 0.7 }));
}

import { ImageResponse } from "next/og";

export const alt = "Deadlock Intelligence — Deadlock stats, decoded";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #100e12 0%, #231d2a 60%, #39274b 100%)",
          color: "#f0ebf4",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, letterSpacing: 8, color: "#c5a8e8" }}>DEADLOCK INTELLIGENCE</div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 96, fontWeight: 700, lineHeight: 1.05 }}>Deadlock stats, decoded.</div>
        <div style={{ display: "flex", marginTop: 32, fontSize: 32, color: "#a69baa" }}>Players · Heroes · Items · Builds · Leaderboards</div>
      </div>
    ),
    size,
  );
}

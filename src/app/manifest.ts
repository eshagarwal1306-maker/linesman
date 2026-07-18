import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Linesman — Sharp line vs the market",
    short_name: "Linesman",
    description:
      "Linesman scores prediction-market prices against TxLINE's sharp consensus and audits World Cup settlements.",
    start_url: "/feed",
    display: "standalone",
    background_color: "#0A0E14",
    theme_color: "#0A0E14",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/icon", sizes: "192x192", type: "image/png" },
    ],
  };
}

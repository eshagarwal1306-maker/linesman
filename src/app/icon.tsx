import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0E14",
          borderRadius: 96,
        }}
      >
        <div
          style={{
            fontSize: 300,
            fontWeight: 900,
            color: "#00E676",
            fontFamily: "sans-serif",
            transform: "skewX(-6deg)",
          }}
        >
          L
        </div>
      </div>
    ),
    { ...size },
  );
}

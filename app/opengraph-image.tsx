import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const loadFont = (file: string) => readFile(join(process.cwd(), "assets", "fonts", file));

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Cartaz de rua: papel, tinta, urucum e amarelo-sol. */
export default async function OpengraphImage() {
  const [black, extra] = await Promise.all([
    loadFont("archivo-latin-900-normal.woff"),
    loadFont("archivo-latin-800-normal.woff"),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#f4eee2",
          color: "#16120f",
          fontFamily: "Archivo",
        }}
      >
        <div style={{ display: "flex", height: 28, background: "#ffc61a", borderBottom: "6px solid #16120f" }} />
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 80px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
            <svg viewBox="0 0 48 48" width={170} height={170} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 3C12.4 3 3 10.6 3 20.4c0 5.5 3 10.4 7.7 13.5-.4 3-1.6 5.6-3.8 7.7 4-.1 7.7-1.6 10.6-4.1 1.9.5 3.5.7 5.5.7C35.6 38.2 45 30.2 45 20.4 45 10.6 35.6 3 24 3z" fill="#e8431f" />
          <rect x="12.5" y="17" width="4" height="7" rx="2" fill="#ffc61a" />
          <rect x="19" y="11" width="4" height="19" rx="2" fill="#ffc61a" />
          <rect x="25.5" y="14" width="4" height="13" rx="2" fill="#ffc61a" />
          <rect x="32" y="18.5" width="4" height="4" rx="2" fill="#ffc61a" />
        </svg>
            <div
              style={{
                display: "flex",
                fontSize: 124,
                fontWeight: 900,
                letterSpacing: -6,
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              TenhaVoz
            </div>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 36,
              fontSize: 44,
              fontWeight: 800,
              lineHeight: 1.1,
            }}
          >
            Uma voz sozinha se perde. Juntas, chegam.
          </div>
          <div style={{ display: "flex", marginTop: 16, fontSize: 30, color: "#4a423a" }}>
            Mobilize pessoas por e-mail e arrecade para a sua causa.
          </div>
        </div>
        <div style={{ display: "flex", height: 22, background: "#0e5a39" }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: extra, weight: 800, style: "normal" },
        { name: "Archivo", data: black, weight: 900, style: "normal" },
      ],
    }
  );
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

const loadFont = (file: string) => readFile(join(process.cwd(), "assets", "fonts", file));
import { createPublicClient } from "@/lib/supabase/public";
import { getPublishedCampaignBySlug } from "@/lib/campaigns";
import { deriveThemeShades, isValidHexColor } from "@/lib/color";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MAX_TITLE_LENGTH = 110;

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createPublicClient();
  const campaign = await getPublishedCampaignBySlug(supabase, slug);

  const title = campaign
    ? campaign.title.length > MAX_TITLE_LENGTH
      ? `${campaign.title.slice(0, MAX_TITLE_LENGTH)}…`
      : campaign.title
    : "TenhaVoz";

  // Cor da campanha (a mesma da página). Sem cor, o roxo padrão do TenhaVoz.
  const shades =
    campaign?.theme_color && isValidHexColor(campaign.theme_color)
      ? deriveThemeShades(campaign.theme_color)
      : null;
  const bgFrom = shades?.dark ?? "#4338ca";
  const bgTo = shades?.base ?? "#4f46e5";
  const ink = shades?.on ?? "#ffffff";
  const inkSoft = shades?.onSoft ?? "rgba(255,255,255,0.8)";

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
          justifyContent: "center",
          padding: "80px 90px",
          fontFamily: "Archivo",
          background: `linear-gradient(135deg, ${bgFrom} 0%, ${bgTo} 100%)`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              display: "flex",
              height: 44,
              width: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              background: "rgba(255,255,255,0.22)",
            }}
          >
            <svg
              viewBox="0 0 48 48"
              width={28}
              height={28}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M24 3C12.4 3 3 10.6 3 20.4c0 5.5 3 10.4 7.7 13.5-.4 3-1.6 5.6-3.8 7.7 4-.1 7.7-1.6 10.6-4.1 1.9.5 3.5.7 5.5.7C35.6 38.2 45 30.2 45 20.4 45 10.6 35.6 3 24 3z" fill={ink} />
              <rect x="12.5" y="17" width="4" height="7" rx="2" fill={bgFrom} />
              <rect x="19" y="11" width="4" height="19" rx="2" fill={bgFrom} />
              <rect x="25.5" y="14" width="4" height="13" rx="2" fill={bgFrom} />
              <rect x="32" y="18.5" width="4" height="4" rx="2" fill={bgFrom} />
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 700,
              color: inkSoft,
              letterSpacing: -0.5,
            }}
          >
            TenhaVoz
          </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 44,
            fontSize: 60,
            fontWeight: 800,
            lineHeight: 1.15,
            color: ink,
            letterSpacing: -1,
          }}
        >
          {title}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 32,
            fontSize: 26,
            color: inkSoft,
          }}
        >
          Clique e envie por e-mail em um clique
        </div>
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

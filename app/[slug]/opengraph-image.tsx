import { ImageResponse } from "next/og";
import { createPublicClient } from "@/lib/supabase/public";
import { getPublishedCampaignBySlug } from "@/lib/campaigns";

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
          background: "linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)",
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
              background: "rgba(255,255,255,0.18)",
            }}
          >
            <svg
              viewBox="0 0 48 48"
              width={28}
              height={28}
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M24 4C13 4 4 11.6 4 21c0 5.4 2.9 10.2 7.5 13.3-.3 2.4-1.4 4.7-3.3 6.5 3.4-.2 6.6-1.5 9.2-3.6 2.1.6 4.3.9 6.6.9 11 0 20-7.6 20-17S35 4 24 4z"
                fill="white"
              />
              <circle cx="16.5" cy="20" r="2.2" fill="#4338ca" />
              <circle cx="24" cy="20" r="2.2" fill="#4338ca" />
              <circle cx="31.5" cy="20" r="2.2" fill="#4338ca" />
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 700,
              color: "rgba(255,255,255,0.85)",
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
            color: "white",
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
            color: "rgba(255,255,255,0.8)",
          }}
        >
          Clique e envie por e-mail em um clique
        </div>
      </div>
    ),
    { ...size }
  );
}

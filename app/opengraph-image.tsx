import { ImageResponse } from "next/og";

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
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4338ca 0%, #4f46e5 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            height: 140,
            width: 140,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 32,
            background: "rgba(255,255,255,0.15)",
            marginBottom: 40,
          }}
        >
          <svg
            viewBox="0 0 48 48"
            width={80}
            height={80}
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
            fontSize: 84,
            fontWeight: 800,
            color: "white",
            letterSpacing: -2,
          }}
        >
          TenhaVoz
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 16,
            fontSize: 32,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          Dê voz à sua causa
        </div>
      </div>
    ),
    { ...size }
  );
}

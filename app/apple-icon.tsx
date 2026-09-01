import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4338ca",
        }}
      >
        <svg
          viewBox="0 0 48 48"
          width={104}
          height={104}
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
    ),
    { ...size }
  );
}

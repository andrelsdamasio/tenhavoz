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
          background: "#f4eee2",
        }}
      >
        <svg viewBox="0 0 48 48" width={124} height={124} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M24 3C12.4 3 3 10.6 3 20.4c0 5.5 3 10.4 7.7 13.5-.4 3-1.6 5.6-3.8 7.7 4-.1 7.7-1.6 10.6-4.1 1.9.5 3.5.7 5.5.7C35.6 38.2 45 30.2 45 20.4 45 10.6 35.6 3 24 3z" fill="#16120f" />
          <rect x="12.5" y="17" width="4" height="7" rx="2" fill="#ffc61a" />
          <rect x="19" y="11" width="4" height="19" rx="2" fill="#ffc61a" />
          <rect x="25.5" y="14" width="4" height="13" rx="2" fill="#ffc61a" />
          <rect x="32" y="18.5" width="4" height="4" rx="2" fill="#ffc61a" />
        </svg>
      </div>
    ),
    { ...size }
  );
}

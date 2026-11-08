import QRCode from "qrcode";

/** "QR Code" recolhível com download em SVG (cartaz, panfleto, story). Gerado no servidor. */
export default async function QrCodeDetails({ url, name }: { url: string; name: string }) {
  let svg: string;
  try {
    svg = await QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
  } catch (err) {
    console.error("[qr] falha ao gerar o QR Code", err);
    return null;
  }
  const href = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  return (
    <details className="group text-right">
      <summary className="cursor-pointer list-none text-sm text-brand-600 hover:underline">QR Code</summary>
      <div className="mt-2 flex flex-col items-end gap-2">
        <div
          className="h-32 w-32 rounded-md border border-gray-200 bg-white p-1 [&>svg]:h-full [&>svg]:w-full"
          role="img"
          aria-label={`QR Code de ${url}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <a href={href} download={`qrcode-${name}.svg`} className="text-xs text-gray-600 hover:underline">
          Baixar (SVG)
        </a>
      </div>
    </details>
  );
}

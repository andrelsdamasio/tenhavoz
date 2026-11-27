import { getActiveAd } from "@/lib/ad";
import { listLiveAds, pickAd, type DisplayAd } from "@/lib/ad-orders";

/** O que mostrar agora: um anúncio pago no ar (sorteado) ou, na falta, o anúncio manual do admin. */
export async function getAdToShow(client: unknown): Promise<DisplayAd | null> {
  const [live, manual] = await Promise.all([listLiveAds(client), getActiveAd(client)]);
  return pickAd<DisplayAd>(live, manual);
}

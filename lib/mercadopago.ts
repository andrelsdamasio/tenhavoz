import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

let clientSingleton: MercadoPagoConfig | null = null;

function getClient(): MercadoPagoConfig {
  if (!clientSingleton) {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurada.");
    }
    clientSingleton = new MercadoPagoConfig({ accessToken });
  }
  return clientSingleton;
}

export function getMercadoPagoPreferenceClient(): Preference {
  return new Preference(getClient());
}

export function getMercadoPagoPaymentClient(): Payment {
  return new Payment(getClient());
}

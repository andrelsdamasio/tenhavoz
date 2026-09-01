import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { listCoupons } from "@/lib/coupons";
import { formatBRL } from "@/lib/pricing";
import CouponForm from "./coupon-form";
import { toggleCouponActiveAction, deleteCouponAction } from "./actions";

function formatDiscount(discountType: string, discountValue: number): string {
  return discountType === "percent" ? `${discountValue}%` : formatBRL(discountValue);
}

export default async function CouponsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    redirect("/dashboard");
  }

  const coupons = await listCoupons(createAdminClient());

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cupons de desconto</h1>
        <Link href="/admin" className="text-sm text-brand-600 hover:underline">
          ← Configurações
        </Link>
      </div>

      <div className="mb-8">
        <CouponForm />
      </div>

      {coupons.length === 0 ? (
        <p className="text-gray-600">Nenhum cupom criado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {coupons.map((coupon) => {
            const exhausted =
              coupon.max_redemptions !== null &&
              coupon.redemption_count >= coupon.max_redemptions;
            const expired = coupon.expires_at ? new Date(coupon.expires_at) < new Date() : false;

            return (
              <li
                key={coupon.id}
                className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-4"
              >
                <div>
                  <p className="font-mono font-medium">{coupon.code}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDiscount(coupon.discount_type, coupon.discount_value)} de desconto ·{" "}
                    {coupon.redemption_count}
                    {coupon.max_redemptions !== null ? ` / ${coupon.max_redemptions}` : ""} usos
                    {coupon.expires_at &&
                      ` · expira em ${new Date(coupon.expires_at).toLocaleDateString("pt-BR")}`}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      coupon.active && !exhausted && !expired
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {!coupon.active
                      ? "Desativado"
                      : exhausted
                        ? "Esgotado"
                        : expired
                          ? "Expirado"
                          : "Ativo"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <form action={toggleCouponActiveAction}>
                    <input type="hidden" name="couponId" value={coupon.id} />
                    <input
                      type="hidden"
                      name="nextActive"
                      value={coupon.active ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                    >
                      {coupon.active ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                  <form action={deleteCouponAction}>
                    <input type="hidden" name="couponId" value={coupon.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      Excluir
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

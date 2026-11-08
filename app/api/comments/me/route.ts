import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * O que a pessoa que está vendo a página pode fazer nos comentários. A página
 * pública é cacheada e igual para todos, então isto vem separado.
 */
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  const campaignId = new URL(request.url).searchParams.get("campaignId") ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ loggedIn: false }, { headers });

  let isOwner = false;
  let myCommentIds: string[] = [];
  if (/^[0-9a-f-]{36}$/i.test(campaignId)) {
    try {
      const admin = createAdminClient();
      const [campaign, mine] = await Promise.all([
        admin.from("campaigns").select("user_id").eq("id", campaignId).maybeSingle(),
        admin.from("campaign_comments").select("id").eq("campaign_id", campaignId).eq("user_id", user.id),
      ]);
      isOwner = campaign.data?.user_id === user.id;
      myCommentIds = (mine.data ?? []).map((c) => c.id);
    } catch (err) {
      console.error("[comentarios] falha ao ler permissões", err);
    }
  }

  return NextResponse.json(
    { loggedIn: true, isAdmin: isAdminEmail(user.email), isOwner, myCommentIds },
    { headers }
  );
}

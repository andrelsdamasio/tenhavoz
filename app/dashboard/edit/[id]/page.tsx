import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCampaignForOwner, isCampaignEditable } from "@/lib/campaigns";
import { getAppSettings } from "@/lib/settings";
import CampaignForm from "@/components/CampaignForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCampaignPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const campaign = await getCampaignForOwner(supabase, id);
  if (!campaign || campaign.user_id !== user.id) {
    redirect("/dashboard");
  }

  if (!isCampaignEditable(campaign)) {
    redirect("/dashboard?editExpired=1");
  }

  const {
    enabled_templates: enabledTemplates,
    manifest_char_limit: manifestCharLimit,
    manifest_char_limit_enabled: manifestCharLimitEnabled,
    template_color_palette: colorPalette,
  } = await getAppSettings(supabase);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-2 text-2xl font-semibold">Editar campanha</h1>
      <p className="mb-6 text-sm text-gray-500">
        Você pode editar essa campanha até 24 horas depois de criada. Depois
        disso, as alterações ficam bloqueadas.
      </p>
      <CampaignForm
        enabledTemplates={enabledTemplates}
        manifestCharLimit={manifestCharLimit}
        manifestCharLimitEnabled={manifestCharLimitEnabled}
        colorPalette={colorPalette}
        editCampaign={campaign}
      />
    </div>
  );
}

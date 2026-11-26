import AdSlot from "@/components/AdSlot";
import { getActiveAd } from "@/lib/ad";
import TrustNote from "@/components/TrustNote";
import CampaignForm from "@/components/CampaignForm";
import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/settings";

export default async function NewCampaignPage() {
  const supabase = await createClient();
  const {
    enabled_templates: enabledTemplates,
    manifest_char_limit: manifestCharLimit,
    manifest_char_limit_enabled: manifestCharLimitEnabled,
    template_color_palette: colorPalette,
  } = await getAppSettings(supabase);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 display text-4xl sm:text-5xl">Nova campanha</h1>
      <div className="mb-6 space-y-3">
        <TrustNote kind="email" />
        <AdSlot ad={await getActiveAd(supabase)} />
      </div>
      <CampaignForm
        enabledTemplates={enabledTemplates}
        manifestCharLimit={manifestCharLimit}
        manifestCharLimitEnabled={manifestCharLimitEnabled}
        colorPalette={colorPalette}
      />
    </div>
  );
}

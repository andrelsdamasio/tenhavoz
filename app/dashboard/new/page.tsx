import CampaignForm from "@/components/CampaignForm";
import { createClient } from "@/lib/supabase/server";
import { getAppSettings } from "@/lib/settings";

export default async function NewCampaignPage() {
  const supabase = await createClient();
  const {
    enabled_templates: enabledTemplates,
    manifest_char_limit: manifestCharLimit,
    manifest_char_limit_enabled: manifestCharLimitEnabled,
  } = await getAppSettings(supabase);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold">Nova campanha</h1>
      <CampaignForm
        enabledTemplates={enabledTemplates}
        manifestCharLimit={manifestCharLimit}
        manifestCharLimitEnabled={manifestCharLimitEnabled}
      />
    </div>
  );
}

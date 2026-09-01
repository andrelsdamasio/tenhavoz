import type { TemplateId } from "@/lib/types";
import type { TemplateProps } from "./types";
import Template1 from "./template-1";
import Template2 from "./template-2";
import Template3 from "./template-3";

const TEMPLATES: Record<TemplateId, (props: TemplateProps) => React.ReactElement> = {
  1: Template1,
  2: Template2,
  3: Template3,
};

export function getTemplateComponent(templateId: TemplateId) {
  return TEMPLATES[templateId] ?? Template1;
}

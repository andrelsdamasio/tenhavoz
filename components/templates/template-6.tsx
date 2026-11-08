import HeroVariant from "./hero-variants";
import type { TemplateProps } from "./types";

/** Template 6 (Aurora): variação do tema 2. */
export default function Template6(props: TemplateProps) {
  return <HeroVariant {...props} variant="aurora" />;
}

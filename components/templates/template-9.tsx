import HeroVariant from "./hero-variants";
import type { TemplateProps } from "./types";

/** Template 9 (Noturno): variação do tema 2. */
export default function Template9(props: TemplateProps) {
  return <HeroVariant {...props} variant="noturno" />;
}

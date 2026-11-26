"use client";

import * as Tooltip from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";

export default function HintTip({ text }: { text: string }) {
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button type="button" aria-label={text} className="text-ink-soft hover:text-ink">
            <Info aria-hidden="true" className="h-4 w-4" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content sideOffset={6} className="z-[70] max-w-xs rounded-md border-2 border-ink bg-paper px-3 py-2 text-xs font-semibold text-ink shadow-md">
            {text}
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

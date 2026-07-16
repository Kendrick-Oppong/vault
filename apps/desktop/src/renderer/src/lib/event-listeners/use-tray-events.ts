import { useEffect } from "react";
import { useModalActions } from "@/stores/ui/modal.selectors";

export function useTrayEvents() {
  const { openQuickActions } = useModalActions();

  useEffect(() => {
    if (!globalThis.api?.onOpenQuickActions) return;
    return globalThis.api.onOpenQuickActions(() => openQuickActions());
  }, [openQuickActions]);
}

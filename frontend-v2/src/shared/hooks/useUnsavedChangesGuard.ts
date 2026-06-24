import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

const DEFAULT_MESSAGE = "You have unsaved timeline edits. Leave this page and discard local changes?";

export function useUnsavedChangesGuard(enabled: boolean, message = DEFAULT_MESSAGE): void {
  const blocker = useBlocker(enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [enabled, message]);

  useEffect(() => {
    if (!enabled || blocker.state !== "blocked") {
      return;
    }

    if (window.confirm(message)) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker, enabled, message]);
}

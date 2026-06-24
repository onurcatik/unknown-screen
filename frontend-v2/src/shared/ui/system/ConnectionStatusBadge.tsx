import { env } from "@shared/config";
import { useOnlineStatus } from "@shared/hooks";
import { Badge } from "../feedback";

export function ConnectionStatusBadge() {
  const isOnline = useOnlineStatus();

  return (
    <div className="connection-status" aria-live="polite">
      <Badge tone={isOnline ? "success" : "danger"}>{isOnline ? "Browser online" : "Browser offline"}</Badge>
      <span title={env.apiBaseUrl}>{env.apiBaseUrl}</span>
    </div>
  );
}

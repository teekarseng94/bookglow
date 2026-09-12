import React from "react";
import { StatusBadge } from "../ui/StatusBadge";
import type { IntegrationStatus } from "../../integrations/registry";

export function IntegrationStatusBadge({ status }: { status?: IntegrationStatus }) {
  if (status === "connected") {
    return (
      <StatusBadge tone="success" label="Connected">
        <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Connected
      </StatusBadge>
    );
  }
  if (status === "needs_reauth") {
    return <StatusBadge tone="warning">Reconnect</StatusBadge>;
  }
  if (status === "pending") {
    return <StatusBadge tone="info">Choose a location</StatusBadge>;
  }
  if (status === "setup_required") {
    return <StatusBadge tone="warning">Setup required</StatusBadge>;
  }
  if (status === "error") {
    return <StatusBadge tone="danger">Needs attention</StatusBadge>;
  }
  return null;
}

export default IntegrationStatusBadge;

import React from "react";
import { Link } from "react-router-dom";
import type { IntegrationDefinition, IntegrationStatus } from "../../integrations/registry";
import { IntegrationStatusBadge } from "./IntegrationStatusBadge";

export function IntegrationRow({
  integration,
  status,
  icon,
}: {
  integration: IntegrationDefinition;
  status?: IntegrationStatus;
  icon: React.ReactNode;
}) {
  return (
    <Link
      to={integration.route}
      className="flex items-center gap-3 px-4 py-4 min-h-[72px] hover:bg-[var(--bg-soft)] transition-colors"
    >
      <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-[var(--bg-soft)] border border-[var(--line)] flex items-center justify-center">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">{integration.name}</span>
          <IntegrationStatusBadge status={status} />
        </span>
        <span className="block text-xs text-[var(--text-muted)] mt-0.5 leading-snug">
          {integration.description}
        </span>
      </span>
      <svg
        className="w-5 h-5 flex-shrink-0 text-[var(--text-muted)]"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  );
}

export default IntegrationRow;

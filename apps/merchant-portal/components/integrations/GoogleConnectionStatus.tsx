import React from "react";
import type { GoogleReviewsConnection } from "../../services/googleReviewsService";
import { GoogleMark } from "./GoogleMark";
import { IntegrationStatusBadge } from "./IntegrationStatusBadge";
import type { IntegrationStatus } from "../../integrations/registry";

function formatTimestamp(value?: string | null): string {
  if (!value) return "Never";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Never";
  return parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function toBadgeStatus(status: GoogleReviewsConnection["status"]): IntegrationStatus {
  if (status === "connected") return "connected";
  if (status === "needs_reauth") return "needs_reauth";
  if (status === "pending_location") return "pending";
  if (status === "setup_required") return "setup_required";
  if (status === "error") return "error";
  return "disconnected";
}

export function GoogleConnectionStatus({ connection }: { connection: GoogleReviewsConnection }) {
  const rating =
    typeof connection.averageRating === "number" ? connection.averageRating.toFixed(1) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <GoogleMark className="w-8 h-8" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold text-[var(--text-primary)]">Google Reviews</p>
            <IntegrationStatusBadge status={toBadgeStatus(connection.status)} />
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] break-words">
          {connection.locationTitle || "Google location"}
        </p>
        {connection.locationAddress ? (
          <p className="text-sm text-[var(--text-muted)] break-words mt-0.5">
            {connection.locationAddress}
          </p>
        ) : null}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-[var(--text-muted)]">Google rating</dt>
        <dd className="text-[var(--text-primary)] font-semibold">
          {rating ? `${rating} ★` : "Not available yet"}
        </dd>
        <dt className="text-[var(--text-muted)]">Reviews</dt>
        <dd className="text-[var(--text-primary)] font-semibold">
          {typeof connection.totalReviewCount === "number"
            ? connection.totalReviewCount.toLocaleString()
            : "Not available yet"}
        </dd>
        <dt className="text-[var(--text-muted)]">Last synced</dt>
        <dd className="text-[var(--text-primary)]">{formatTimestamp(connection.lastSyncedAt)}</dd>
      </dl>
    </div>
  );
}

export default GoogleConnectionStatus;

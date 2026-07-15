/**
 * ServiceSkeleton — stable loading placeholders for the service discovery area
 * (filters + cards). Reserves layout to avoid jumps when real data arrives.
 */
import React from 'react';

export function ServiceSkeleton() {
  return (
    <div className="bgv2-service-skeleton" aria-hidden="true">
      <div className="bgv2-skeleton-filters">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="bgv2-skeleton bgv2-skeleton-chip" />
        ))}
      </div>
      <div className="bgv2-service-list">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bgv2-service-card bgv2-service-card--skeleton">
            <span className="bgv2-skeleton bgv2-skeleton-media" />
            <span className="bgv2-service-card-body">
              <span className="bgv2-skeleton bgv2-skeleton-line bgv2-skeleton-line--title" />
              <span className="bgv2-skeleton bgv2-skeleton-line" />
              <span className="bgv2-skeleton bgv2-skeleton-line bgv2-skeleton-line--short" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * ProfessionalSkeleton — stable loading placeholders for the professional list.
 * Reserves layout to avoid jumps when real staff arrive.
 */
import React from 'react';

export function ProfessionalSkeleton() {
  return (
    <div className="bgv2-pro-list" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bgv2-pro-card bgv2-pro-card--skeleton">
          <span className="bgv2-skeleton bgv2-skeleton-avatar" />
          <span className="bgv2-pro-body">
            <span className="bgv2-skeleton bgv2-skeleton-line bgv2-skeleton-line--title" />
            <span className="bgv2-skeleton bgv2-skeleton-line bgv2-skeleton-line--short" />
          </span>
        </div>
      ))}
    </div>
  );
}

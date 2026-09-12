import React from "react";

export function IntegrationSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0">
      <h2 className="px-1 mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        {title}
      </h2>
      <div className="rounded-ui-lg border border-[var(--line)] bg-[var(--bg-surface)] overflow-hidden divide-y divide-[var(--line)]">
        {children}
      </div>
    </section>
  );
}

export default IntegrationSection;

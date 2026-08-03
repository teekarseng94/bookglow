import React, { useCallback, useEffect, useState } from "react";

const SECTIONS = [
  { id: "services", label: "Services" },
  { id: "team", label: "Team" },
  { id: "reviews", label: "Reviews" },
  { id: "address", label: "Address" },
] as const;

export type BookingSectionId = (typeof SECTIONS)[number]["id"];

export interface BookingSectionTabsProps {
  /** Sticky offset (px) used when scrolling to a section. */
  stickyOffset?: number;
}

/** Sticky section navigation for the public booking page (mobile / tablet). */
export const BookingSectionTabs: React.FC<BookingSectionTabsProps> = ({
  stickyOffset = 112,
}) => {
  const [activeId, setActiveId] = useState<BookingSectionId>("services");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const elements = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => Boolean(el)
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id as BookingSectionId);
        }
      },
      {
        root: null,
        // Account for sticky header + tabs so the active section tracks correctly
        rootMargin: `-${stickyOffset}px 0px -45% 0px`,
        threshold: [0, 0.15, 0.35, 0.55],
      }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [stickyOffset]);

  const handleTabClick = useCallback(
    (id: BookingSectionId) => {
      const el = document.getElementById(id);
      if (!el) return;
      setActiveId(id);
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    []
  );

  return (
    <nav className="booking-section-tabs" aria-label="Page sections">
      <div className="booking-section-tabs__inner" role="tablist">
        {SECTIONS.map((section) => {
          const selected = activeId === section.id;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={section.id}
              id={`tab-${section.id}`}
              className={`booking-section-tabs__tab${selected ? " booking-section-tabs__tab--active" : ""}`}
              onClick={() => handleTabClick(section.id)}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BookingSectionTabs;

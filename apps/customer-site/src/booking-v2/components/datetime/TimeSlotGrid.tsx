/**
 * TimeSlotGrid — governed grid of selectable time slots.
 *
 * A radiogroup of 44px slot buttons. Unavailable slots are rendered disabled
 * with a strikethrough (not colour alone). Selection shows text state via
 * aria-checked and the accent style.
 */
import React from 'react';
import type { TimeSlotOption } from '../../data/availability';

interface Props {
  slots: TimeSlotOption[];
  selectedTime: string | null;
  onSelect: (slot: TimeSlotOption) => void;
}

export function TimeSlotGrid({ slots, selectedTime, onSelect }: Props) {
  return (
    <div className="bgv2-slot-grid" role="radiogroup" aria-label="Available times">
      {slots.map((slot) => {
        const selected = slot.time === selectedTime;
        return (
          <button
            key={slot.time}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`bgv2-slot${selected ? ' is-selected' : ''}`}
            disabled={!slot.available}
            onClick={() => onSelect(slot)}
          >
            {slot.label}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { useCallback } from "react";

interface BatchStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function BatchStepper({
  value,
  onChange,
  min = 1,
  max = 50,
  disabled = false,
}: BatchStepperProps) {
  const decrement = useCallback(() => {
    if (value > min) onChange(value - 1);
  }, [value, min, onChange]);

  const increment = useCallback(() => {
    if (value < max) onChange(value + 1);
  }, [value, max, onChange]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = parseInt(e.target.value, 10);
      if (isNaN(raw)) return;
      const clamped = Math.max(min, Math.min(max, raw));
      onChange(clamped);
    },
    [min, max, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        increment();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        decrement();
      }
    },
    [increment, decrement]
  );

  return (
    <div className="batch-stepper">
      <label className="field-label" htmlFor="batch-row-count">
        Rows
      </label>
      <div className="batch-stepper__controls">
        <button
          type="button"
          className="batch-stepper__btn"
          onClick={decrement}
          disabled={disabled || value <= min}
          aria-label="Decrease row count"
        >
          −
        </button>
        <input
          id="batch-row-count"
          type="number"
          className="batch-stepper__input"
          min={min}
          max={max}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label="Number of rows to add"
        />
        <button
          type="button"
          className="batch-stepper__btn"
          onClick={increment}
          disabled={disabled || value >= max}
          aria-label="Increase row count"
        >
          +
        </button>
      </div>
    </div>
  );
}

// ============================================================
// FILE: src/features/batch/components/batch-stepper.tsx
// ============================================================
// PURPOSE: A number input with minus/plus stepper buttons for selecting batch row count.
// HOW IT WORKS: Renders a labeled number input flanked by decrement/increment buttons. Supports keyboard arrows, clamping to min/max, and disabled state. Buttons are 44px on mobile for touch targets.
// PROPS: value (number), onChange (callback), min (number, default 1), max (number, default 50), disabled (boolean).
// INTEGRATION: React, no external dependencies.
// ============================================================

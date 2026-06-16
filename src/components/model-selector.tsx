"use client";

import { MODEL_LABELS, ModelId } from "@/modules/ai/types";

interface ModelSelectorProps {
  value: ModelId;
  onChange: (model: ModelId) => void;
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  return (
    <div className="model-selector">
      <label htmlFor="model-select" className="model-label">
        AI Model
      </label>
      <select
        id="model-select"
        className="model-select"
        value={value}
        onChange={(e) => onChange(e.target.value as ModelId)}
      >
        {Object.entries(MODEL_LABELS).map(([id, { name, description }]) => (
          <option key={id} value={id} title={description}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============================================================
// FILE: src/components/model-selector.tsx
// ============================================================
// PURPOSE: Dropdown selector for choosing an AI model from the available options.
// HOW IT WORKS: Renders a <select> with all 8 models from MODEL_LABELS. Each option
//   shows the model name with a tooltip showing the description. Controlled component
//   with value/onChange props.
// PROPS: value (ModelId), onChange (callback with new ModelId)
// INTEGRATION: AI types (MODEL_LABELS, ModelId)
// ============================================================

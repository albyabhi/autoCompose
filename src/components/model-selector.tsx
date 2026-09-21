"use client";

import { MODEL_LABELS, type ModelId } from "@/modules/ai/types";

type ModelSelectorValue = ModelId | "recommended";

interface ModelSelectorProps {
  value: ModelSelectorValue;
  onChange: (model: ModelSelectorValue) => void;
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
        onChange={(e) => {
          const next = e.target.value;
          if (next === "recommended") {
            onChange("recommended");
            return;
          }
          onChange(next as ModelId);
        }}
      >
        <option value="recommended">Recommended (Fastest)</option>
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
// PURPOSE: Dropdown for picking which AI model writes the email — shows all live NVIDIA NIM models with descriptions as tooltips.
// HOW IT WORKS: Controlled <select> component. Options: "Recommended (Fastest)" (uses server-side fastest model) + specific models from MODEL_LABELS (gptOss, nemotron3Super, nemotron3Ultra). Each option has title attribute with description. value/onChange props make it controlled.
// PROPS: value (ModelId | "recommended"), onChange(model: ModelId | "recommended") => void.
// INTEGRATION: AI types (MODEL_LABELS, ModelId from src/modules/ai/types.ts). Used by GenerateForm component.
// ============================================================

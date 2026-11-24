"use client";

import { BUSINESS_CATEGORIES } from "@/lib/business-catalog";

export function BusinessPicker({
  category,
  businessType,
  custom,
  onCategory,
  onType,
  onCustom,
}: {
  category: string;
  businessType: string;
  custom: string;
  onCategory: (id: string) => void;
  onType: (id: string) => void;
  onCustom: (value: string) => void;
}) {
  const selected = BUSINESS_CATEGORIES.find((item) => item.id === category);
  return (
    <div className="picker">
      <fieldset className="choices">
        <legend>Category</legend>
        {BUSINESS_CATEGORIES.map((item) => (
          <label key={item.id} className={category === item.id ? "onboard-choice on" : "onboard-choice"}>
            <input
              type="radio"
              name="category"
              value={item.id}
              checked={category === item.id}
              onChange={() => {
                onCategory(item.id);
                onType("");
              }}
            />
            {item.label}
          </label>
        ))}
      </fieldset>
      {selected ? (
        <fieldset className="choices">
          <legend>Business type</legend>
          {selected.types.map((item) => (
            <label key={item.id} className={businessType === item.id ? "onboard-choice on" : "onboard-choice"}>
              <input type="radio" name="business-type" value={item.id} checked={businessType === item.id} onChange={() => onType(item.id)} />
              {item.label}
            </label>
          ))}
        </fieldset>
      ) : null}
      {businessType === "other" ? (
        <label className="field">
          Type it
          <input type="text" value={custom} maxLength={80} onChange={(event) => onCustom(event.target.value)} />
        </label>
      ) : null}
    </div>
  );
}

"use client";

import { BUSINESS_CATEGORIES, categoryById } from "@/lib/business-catalog";

export type PickerValue = {
  category: string;
  businessType: string;
  customType: string;
};

export function showsCustomType(value: PickerValue) {
  const category = categoryById(value.category);
  return Boolean(category?.types.find((type) => type.id === value.businessType)?.custom);
}

export function BusinessPicker({ value, onChange }: { value: PickerValue; onChange: (next: PickerValue) => void }) {
  const category = categoryById(value.category);
  const custom = showsCustomType(value);
  return (
    <div className="biz-picker">
      <div>
        <p className="biz-step">1. Category</p>
        <div className="biz-cats" role="listbox" aria-label="Category">
          {BUSINESS_CATEGORIES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={item.id === value.category}
              className={item.id === value.category ? "on" : ""}
              onClick={() => onChange({ category: item.id, businessType: "", customType: "" })}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="biz-step">2. Business type</p>
        {category ? (
          <div className="biz-types" role="listbox" aria-label="Business type">
            {category.types.map((type) => (
              <button
                key={type.id}
                type="button"
                role="option"
                aria-selected={type.id === value.businessType}
                className={type.id === value.businessType ? "on" : ""}
                onClick={() => onChange({ category: category.id, businessType: type.id, customType: type.custom ? value.customType : "" })}
              >
                {type.label}
              </button>
            ))}
            {custom ? (
              <label className="field">
                Type it
                <input
                  type="text"
                  value={value.customType}
                  maxLength={80}
                  autoComplete="off"
                  onChange={(event) => onChange({ ...value, customType: event.target.value })}
                />
              </label>
            ) : null}
          </div>
        ) : (
          <p className="muted">Pick a category first.</p>
        )}
      </div>
    </div>
  );
}

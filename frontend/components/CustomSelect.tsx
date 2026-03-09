"use client";

import { useEffect, useMemo, useState } from "react";

import { apiClientJson } from "@/lib/api";
import { toUserErrorMessage } from "@/lib/errorMessage";

type SelectOption = {
  value: string;
  label: string;
};

interface CustomSelectProps {
  fieldKey: string;
  builtInOptions: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const ADD_CUSTOM_SENTINEL = "__add_custom__";

export default function CustomSelect({
  fieldKey,
  builtInOptions,
  value,
  onChange,
  placeholder = "Select an option",
  className
}: CustomSelectProps) {
  const [customOptions, setCustomOptions] = useState<SelectOption[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    apiClientJson<SelectOption[]>(`/custom-options?field_key=${encodeURIComponent(fieldKey)}`)
      .then((data) => {
        if (!active) return;
        setCustomOptions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!active) return;
        setCustomOptions([]);
      });

    return () => {
      active = false;
    };
  }, [fieldKey]);

  const mergedOptions = useMemo(() => {
    const merged = [...builtInOptions, ...customOptions];
    const seen = new Set<string>();
    return merged.filter((option) => {
      if (!option.value || seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    });
  }, [builtInOptions, customOptions]);

  const selectClassName = className ?? "rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full";

  async function handleSaveCustomOption() {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setError("Please enter an option name.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const created = await apiClientJson<SelectOption>("/custom-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field_key: fieldKey, label: trimmed })
      });
      setCustomOptions((prev) => {
        if (prev.some((opt) => opt.value === created.value)) {
          return prev;
        }
        return [...prev, created];
      });
      onChange(created.value);
      setIsAdding(false);
      setInputValue("");
    } catch (saveError) {
      setError(toUserErrorMessage(saveError, "Unable to save custom option."));
    } finally {
      setSaving(false);
    }
  }

  if (isAdding) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            placeholder="Enter custom option"
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground w-full"
          />
          <button
            type="button"
            onClick={() => handleSaveCustomOption().catch(() => undefined)}
            disabled={saving}
            className="bg-primary text-primary-foreground rounded-xl px-3 py-2 text-sm"
          >
            Save
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsAdding(false);
            setInputValue("");
            setError(null);
          }}
          className="text-sm text-muted-foreground underline"
        >
          Cancel
        </button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(event) => {
        if (event.target.value === ADD_CUSTOM_SENTINEL) {
          setIsAdding(true);
          setError(null);
          return;
        }
        onChange(event.target.value);
      }}
      className={selectClassName}
    >
      <option value="">{placeholder}</option>
      {mergedOptions.map((option) => (
        <option key={`${fieldKey}-${option.value}`} value={option.value}>
          {option.label}
        </option>
      ))}
      <option value={ADD_CUSTOM_SENTINEL}>＋ Add custom…</option>
    </select>
  );
}

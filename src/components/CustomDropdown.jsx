import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

/**
 * CustomDropdown
 * A modern, rounded, accessible replacement for native HTML <select> elements.
 * Eliminates native Windows/OS stark square menus and ugly dark-grey highlight blocks.
 */
export default function CustomDropdown({
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  title,
  icon,
  style = {},
  menuStyle = {},
  disabled = false,
  align = "left",
  size = "md", // "sm" | "md" | "lg"
  variant = "filter" // "filter" | "plain"
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click and Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Normalize options to objects: { value, label, icon, badge, count, disabled, isSeparator }
  const normalizedOptions = options.map(opt => {
    if (typeof opt === "string" || typeof opt === "number") {
      return { value: opt, label: String(opt) };
    }
    return opt;
  });

  const selectedOpt = normalizedOptions.find(o => String(o.value) === String(value));

  const height = size === "sm" ? "28px" : size === "lg" ? "36px" : "32px";
  const fontSize = size === "sm" ? "11px" : "12px";

  const isFilterActive = variant === "filter" && selectedOpt?.value !== undefined && selectedOpt.value !== "all" && selectedOpt.value !== "";

  return (
    <div
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "relative",
        display: "inline-block",
        width: style.width || "auto",
        verticalAlign: "middle"
      }}
    >
      <button
        type="button"
        title={title}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) setIsOpen(prev => !prev);
        }}
        style={{
          height,
          padding: "0 26px 0 10px",
          fontSize,
          fontWeight: "600",
          color: isFilterActive ? "#1d4ed8" : "#1e293b",
          backgroundColor: isFilterActive ? "#eff6ff" : "#ffffff",
          border: isFilterActive ? "1.5px solid #3b82f6" : "1px solid #cbd5e1",
          borderRadius: "6px",
          cursor: disabled ? "not-allowed" : "pointer",
          outline: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          whiteSpace: "nowrap",
          position: "relative",
          width: "100%",
          boxSizing: "border-box",
          fontFamily: "'Inter', sans-serif",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          opacity: disabled ? 0.6 : 1,
          transition: "all 0.15s ease",
          ...style
        }}
      >
        {(selectedOpt?.icon || icon) && (
          <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
            {selectedOpt?.icon || icon}
          </span>
        )}
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedOpt ? selectedOpt.label : placeholder}
        </span>
        <ChevronDown
          size={12}
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: isOpen ? "translateY(-50%) rotate(180deg)" : "translateY(-50%) rotate(0deg)",
            color: style.color || (selectedOpt?.value && selectedOpt.value !== "all" && selectedOpt.value !== "" ? "#2563eb" : "#64748b"),
            transition: "transform 0.15s ease",
            pointerEvents: "none"
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            [align === "right" ? "right" : "left"]: 0,
            zIndex: 1200,
            minWidth: "160px",
            width: style.width ? "100%" : "max-content",
            maxWidth: "320px",
            maxHeight: "260px",
            overflowY: "auto",
            backgroundColor: "#ffffff",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
            padding: "5px",
            fontFamily: "'Inter', sans-serif",
            animation: "fadeIn 0.12s ease",
            ...menuStyle
          }}
        >
          {normalizedOptions.map((opt, idx) => {
            if (opt.isSeparator) {
              return (
                <div
                  key={`sep-${idx}`}
                  style={{
                    height: "1px",
                    backgroundColor: "#f1f5f9",
                    margin: "4px 2px"
                  }}
                />
              );
            }

            const isSelected = String(opt.value) === String(value);

            return (
              <div
                key={String(opt.value ?? idx)}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 8px",
                  borderRadius: "6px",
                  cursor: opt.disabled ? "not-allowed" : "pointer",
                  backgroundColor: isSelected ? "#eff6ff" : "transparent",
                  color: opt.disabled ? "#94a3b8" : isSelected ? "#1d4ed8" : "#1e293b",
                  fontWeight: isSelected ? "700" : "500",
                  fontSize: "12px",
                  transition: "background 0.1s ease",
                  gap: "8px"
                }}
                onMouseEnter={(e) => {
                  if (!isSelected && !opt.disabled) e.currentTarget.style.backgroundColor = "#f8fafc";
                }}
                onMouseLeave={(e) => {
                  if (!isSelected && !opt.disabled) e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                  {opt.icon && <span style={{ display: "inline-flex", alignItems: "center" }}>{opt.icon}</span>}
                  <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {opt.label}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                  {opt.count !== undefined && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: "600",
                        color: isSelected ? "#2563eb" : "#64748b",
                        backgroundColor: isSelected ? "#dbeafe" : "#f1f5f9",
                        padding: "1px 6px",
                        borderRadius: "8px"
                      }}
                    >
                      {opt.count}
                    </span>
                  )}
                  {isSelected && <Check size={13} color="#2563eb" strokeWidth={2.5} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

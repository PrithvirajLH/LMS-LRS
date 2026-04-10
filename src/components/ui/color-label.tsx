"use client";

import { createContext, useContext, useState } from "react";

// Context for show/hide toggle
const ColorLabelContext = createContext<boolean>(true);

export function ColorLabelProvider({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(true);

  return (
    <ColorLabelContext.Provider value={show}>
      <div className="relative">
        {/* Toggle button — fixed top right */}
        <button
          onClick={() => setShow(!show)}
          className="fixed top-4 right-4 z-[100] flex items-center gap-2 rounded-lg px-3 py-2 shadow-lg transition-colors duration-200"
          style={{
            backgroundColor: show ? "rgba(0,0,0,0.8)" : "rgba(0,0,0,0.4)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.15)",
          }}
        >
          <div
            className="w-7 h-4 rounded-full relative transition-colors duration-200"
            style={{ backgroundColor: show ? "#3A6870" : "#666" }}
          >
            <div
              className="w-3 h-3 rounded-full absolute top-0.5 transition-all duration-200"
              style={{
                backgroundColor: "#fff",
                left: show ? 14 : 2,
              }}
            />
          </div>
          <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#fff" }}>
            {show ? "LABELS ON" : "LABELS OFF"}
          </span>
        </button>
        {children}
      </div>
    </ColorLabelContext.Provider>
  );
}

export function ColorLabel({ hex, role, position = "top-right" }: {
  hex: string;
  role: string;
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
}) {
  const show = useContext(ColorLabelContext);
  if (!show) return null;

  const posClass = {
    "top-right": "top-1 right-1",
    "top-left": "top-1 left-1",
    "bottom-right": "bottom-1 right-1",
    "bottom-left": "bottom-1 left-1",
  }[position];

  return (
    <div
      className={`absolute ${posClass} z-50 flex items-center gap-1 rounded px-1.5 py-0.5`}
      style={{ backgroundColor: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-2.5 h-2.5 rounded-sm shrink-0"
        style={{ backgroundColor: hex, border: "1px solid rgba(255,255,255,0.3)" }}
      />
      <span style={{ fontFamily: "monospace", fontSize: "9px", color: "#fff", whiteSpace: "nowrap" }}>
        {hex} · {role}
      </span>
    </div>
  );
}

import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

export default function BarcodeDisplay({
  value,
  format = "CODE128",
  width = 2,
  height = 55,
  displayValue = true,
  fontSize = 14,
  className = "",
}) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, String(value).trim(), {
          format: format,
          lineColor: "#000000",
          width: width,
          height: height,
          displayValue: displayValue,
          font: "monospace",
          fontSize: fontSize,
          fontOptions: "bold",
          margin: 6,
          background: "#ffffff",
        });
      } catch (err) {
        console.warn("JsBarcode render error:", err);
      }
    }
  }, [value, format, width, height, displayValue, fontSize]);

  if (!value) return null;

  return (
    <div className={`inline-block bg-white rounded-xl p-2 shadow-sm ${className}`}>
      <svg ref={svgRef} className="max-w-full h-auto mx-auto"></svg>
    </div>
  );
}

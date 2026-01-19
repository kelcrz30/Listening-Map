import L from "leaflet";

/**
 * Priority: 1. Listening (Orange) > 2. Visited (Purple) > 3. New (Green)
 * Anchor is bottom-center to feel stable on mobile.
 */
export const getMemoryIcon = (isListening, isVisited, weight = 20, isDark = true) => {
  const size = isListening ? 22 : 20;

  let color;
  let boxShadow;
  let border = "none";

  if (isListening) {
    color = "#f59e0b";
    boxShadow = "0 0 20px #f59e0b";
  } else if (isVisited) {
    color = "#8b5cf6";
    boxShadow = "none";
  } else {
    color = "#32CD32"; // New / unheard
    if (isDark) {
      boxShadow = "0 0 12px rgba(50, 205, 50, 0.75)";
    } else {
      boxShadow = "0 4px 15px rgba(0, 0, 0, 0.35)";
      border = "1px solid rgba(0, 0, 0, 0.15)";
    }
  }

  return L.divIcon({
    className: `custom-marker ${isListening ? "listening-pulse" : ""}`,
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 9999px;
        border: ${border};
        opacity: ${isVisited && !isListening ? 0.55 : 1};
        transition: transform 0.25s ease, opacity 0.25s ease;
        box-shadow: ${boxShadow};
        pointer-events: auto;
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size], // ✅ bottom-center anchor (mobile stable)
  });
};

export const MAP_TILES = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
};

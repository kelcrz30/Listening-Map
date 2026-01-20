import L from "leaflet";

/**
 * Memory Icons for Secrets
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
    color = "#32CD32";
    boxShadow = isDark ? "0 0 12px rgba(50, 205, 50, 0.75)" : "0 4px 15px rgba(0, 0, 0, 0.35)";
    border = isDark ? "none" : "1px solid rgba(0, 0, 0, 0.15)";
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
    iconAnchor: [size / 2, size],
  });
};

/**
 * Ghost label for background text
 */
export const getWorldLabelIcon = (text, isDark) => {
  return L.divIcon({
    className: "world-label-icon",
    html: `
      <div style="pointer-events: none; user-select: none; white-space: nowrap; display: flex; flex-direction: column; align-items: center;">
        <h1 style="
          font-family: serif;
          font-style: italic;
          font-size: 42px;
          letter-spacing: 0.7em;
          color: ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'};
          text-transform: uppercase;
          margin: 0;
          pointer-events: none;
        ">
          ${text}
        </h1>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [300, 21],
  });
};

export const MAP_TILES = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
};
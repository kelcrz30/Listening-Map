import L from 'leaflet';

export const getMemoryIcon = (isListening, isVisited, weight = 20, isDark = true) => {
  const size = isListening ? 18 : 20;
  
  // Color palette based on theme
  let color;
  if (isListening) {
    color = '#f59e0b'; // Orange for listening (same in both themes)
  } else if (isVisited) {
    color = isDark ? '#78350f' : '#d97706'; // Dimmed orange
  } else {
    color = isDark ? '#ffffff' : '#1f2937'; // White for dark, dark gray for light
  }

  // Shadow/glow based on theme
  const boxShadow = isListening 
    ? '0 0 20px #f59e0b' 
    : (isVisited 
      ? 'none' 
      : (isDark 
        ? '0 0 12px rgba(255, 255, 255, 0.8)' 
        : '0 4px 12px rgba(0, 0, 0, 0.3)'));

  const border = isVisited 
    ? 'none' 
    : (isDark 
      ? '1.5px solid rgba(255,255,255,0.2)' 
      : '1.5px solid rgba(0,0,0,0.15)');

  return L.divIcon({
    className: `custom-marker ${isListening ? 'listening-pulse' : ''}`,
    html: `<div style="
      background-color: ${color}; 
      width: ${size}px; 
      height: ${size}px; 
      border-radius: 50%; 
      opacity: ${isVisited ? 0.4 : 1}; 
      transition: all 0.5s ease;
      box-shadow: ${boxShadow};
      border: ${border};
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  });
};

// Map tiles - use different tiles for light/dark mode
export const MAP_TILES = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
};
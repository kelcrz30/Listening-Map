import L from 'leaflet';

/**
 * Generates a custom Leaflet icon based on the state of the secret.
 * Priority: 1. Listening (Orange) > 2. Visited (Purple) > 3. New (White)
 */
export const getMemoryIcon = (isListening, isVisited, weight = 20, isDark = true) => {
  // Grow the size slightly if live, but keep consistent base
  const size = isListening ? 22 : 20;
  
  let color;
  let boxShadow;
  let border = 'none';
  
  // 1. REAL-TIME PRESENCE: If someone is listening, ALWAYS show Orange Pulse
  if (isListening) {
    color = '#f59e0b'; // Vibrant Orange
    boxShadow = '0 0 20px #f59e0b'; // Strong glow
  } 
  // 2. VISITED: If YOU have read it, show Purple
  else if (isVisited) {
    color = '#8b5cf6'; // Soft Purple
    boxShadow = 'none'; 
  } 
  // 3. NEW: Keep white for BOTH modes, but add contrast for Light Mode
  else {
    color = '#32CD32'; // Force white as requested
    
    if (isDark) {
      // Dark Mode: Soft white glow
      boxShadow = '0 0 12px rgba(255, 255, 255, 0.8)';
    } else {
      // LIGHT MODE FIX: Stronger shadow + Dark border to make white visible
      boxShadow = '0 4px 15px rgba(0, 0, 0, 0.4)'; // Darker shadow for depth
      border = '1px solid rgba(0, 0, 0, 0.15)'; // Thin dark ring to define the circle
    }
  }

  return L.divIcon({
    className: `custom-marker ${isListening ? 'listening-pulse' : ''}`,
    html: `
      <div style="
        background-color: ${color}; 
        width: ${size}px; 
        height: ${size}px; 
        border-radius: 50%; 
        border: ${border};
        opacity: ${isVisited && !isListening ? 0.5 : 1}; 
        transition: all 0.5s ease;
        box-shadow: ${boxShadow};
        pointer-events: none;
      "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

export const MAP_TILES = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
};
import L from 'leaflet';

/**
 * Generates a custom Leaflet icon based on the state of the secret.
 * Priority: 1. Listening (Orange) > 2. Visited (Purple) > 3. New (White)
 */
export const getMemoryIcon = (isListening, isVisited, weight = 20, isDark = true) => {
  // Size remains consistent unless someone is listening
  const size = isListening ? 18 : 20;
  
  let color;
  let boxShadow;
  
  // 1. REAL-TIME PRESENCE: If someone is listening, ALWAYS show Orange Pulse
  if (isListening) {
    color = '#f59e0b'; // Vibrant Orange
    boxShadow = '0 0 20px #f59e0b'; // Strong glow for active hearts
  } 
  // 2. VISITED: If YOU have read it, show Purple
  else if (isVisited) {
    color = '#8b5cf6'; // Soft Purple
    boxShadow = 'none'; // No glow for memories that are resting
  } 
  // 3. NEW: Otherwise, it's a New Secret (White)
  else {
    color = isDark ? '#ffffff' : '#1f2937'; // White for dark mode
    boxShadow = isDark ? '0 0 12px rgba(255, 255, 255, 0.8)' : '0 4px 12px rgba(0, 0, 0, 0.3)';
  }

  // Create the Leaflet DivIcon
  return L.divIcon({
    // 'listening-pulse' class triggers the CSS animation you have in your styles
    className: `custom-marker ${isListening ? 'listening-pulse' : ''}`,
    html: `
      <div style="
        background-color: ${color}; 
        width: ${size}px; 
        height: ${size}px; 
        border-radius: 50%; 
        opacity: ${isVisited && !isListening ? 0.5 : 1}; 
        transition: all 0.5s ease;
        box-shadow: ${boxShadow};
        pointer-events: none;
      "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

// Map tiles configuration for light and dark themes
export const MAP_TILES = {
  dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  light: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
};
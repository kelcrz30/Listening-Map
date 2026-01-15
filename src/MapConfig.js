import L from 'leaflet';

export const getMemoryIcon = (isListening, isVisited) => {
  // CONFIGURATION: Slightly larger dots for better visibility
  const size = isListening ? 18 : (isVisited ? 20 : 20);
  
  // NEW COLOR PALETTE:
  // Listening = Solid Orange
  // Unvisited = Pure White (Highest contrast against black)
  // Visited = Deep Orange (Dimmed)
  const color = isListening 
    ? '#f59e0b' 
    : (isVisited ? '#78350f' : '#ffffff'); 

  return L.divIcon({
    className: `custom-marker ${isListening ? 'listening-pulse' : ''}`,
    html: `<div style="
      background-color: ${color}; 
      width: ${size}px; 
      height: ${size}px; 
      border-radius: 50%; 
      opacity: ${isVisited ? 0.3 : 1}; 
      transition: all 0.5s ease;
      /* Visibility Hack: A glow makes it visible on ANY dark background */
      box-shadow: ${isListening 
        ? '0 0 20px #f59e0b' 
        : (isVisited ? 'none' : '0 0 12px rgba(255, 255, 255, 0.8)')};
      border: ${isVisited ? 'none' : '1.5px solid rgba(255,255,255,0.2)'};
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
  });
};

export const MAP_TILES = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
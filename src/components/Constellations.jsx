import { Polyline } from "react-leaflet";
import { useMemo } from "react";

export default function Constellations({ secrets, zoomLevel }) {
  const lines = useMemo(() => {
    // Only show connections when zoomed out to see the "big picture"
    if (zoomLevel > 6) return [];

    const connections = [];
    const recentSecrets = secrets.slice(0, 40); // Limit for performance

    for (let i = 0; i < recentSecrets.length; i++) {
      for (let j = i + 1; j < recentSecrets.length; j++) {
        const wordsA = recentSecrets[i].text.toLowerCase().split(/\s+/);
        const wordsB = recentSecrets[j].text.toLowerCase().split(/\s+/);
        
        // Connect if they share a meaningful word (> 4 letters)
        const commonWord = wordsA.find(word => word.length > 4 && wordsB.includes(word));
        
        if (commonWord) {
          connections.push({
            id: `${recentSecrets[i].id}-${recentSecrets[j].id}`,
            coords: [
              [recentSecrets[i].lat, recentSecrets[i].lng],
              [recentSecrets[j].lat, recentSecrets[j].lng]
            ]
          });
        }
      }
    }
    return connections;
  }, [secrets, zoomLevel]);

  return (
    <>
      {lines.map((line) => (
        <Polyline 
          key={line.id} 
          positions={line.coords} 
          pathOptions={{ 
            color: '#f97316', 
            weight: 0.5, 
            opacity: 0.15,
            dashArray: '5, 10' 
          }} 
        />
      ))}
    </>
  );
}
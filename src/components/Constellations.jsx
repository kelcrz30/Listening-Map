import { Polyline } from "react-leaflet";
import { useMemo } from "react";

export default function Constellations({ secrets, zoomLevel }) {
  const lines = useMemo(() => {
    // Only show connections when zoomed out to see the "big picture"
    if (zoomLevel > 6) return [];

    const connections = [];
    const recentSecrets = secrets.slice(0, 30); // Reduced for better performance

    // Helper: Calculate distance between two points (simplified)
    const getDistance = (lat1, lng1, lat2, lng2) => {
      const dLat = lat2 - lat1;
      const dLng = lng2 - lng1;
      return Math.sqrt(dLat * dLat + dLng * dLng);
    };

    // Pre-process: Extract meaningful words from each secret
    const secretWords = recentSecrets.map(secret => ({
      ...secret,
      words: new Set(
        secret.text
          .toLowerCase()
          .split(/\s+/)
          .filter(word => word.length > 4) // Only meaningful words
      )
    }));

    for (let i = 0; i < secretWords.length; i++) {
      for (let j = i + 1; j < secretWords.length; j++) {
        const secretA = secretWords[i];
        const secretB = secretWords[j];

        // Check distance first (avoid connecting distant secrets)
        const distance = getDistance(
          secretA.lat, secretA.lng,
          secretB.lat, secretB.lng
        );

        // Only connect if within ~2000km equivalent (adjust as needed)
        if (distance > 30) continue;

        // Find common words using Set intersection
        const commonWords = [...secretA.words].filter(word => 
          secretB.words.has(word)
        );
        
        if (commonWords.length > 0) {
          // Calculate opacity based on number of common words and distance
          const opacity = Math.min(0.25, 0.1 + (commonWords.length * 0.05));
          const weight = Math.min(1.5, 0.5 + (commonWords.length * 0.2));

          connections.push({
            id: `${secretA.id}-${secretB.id}`,
            coords: [
              [secretA.lat, secretA.lng],
              [secretB.lat, secretB.lng]
            ],
            opacity,
            weight,
            commonWords // For debugging/future features
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
            weight: line.weight,
            opacity: line.opacity,
            dashArray: '3, 8',
            className: 'constellation-line' // For CSS animations if needed
          }} 
        />
      ))}
    </>
  );
}
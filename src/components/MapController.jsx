import { useEffect } from "react";
import { useMap } from "react-leaflet";

export default function MapController({ secrets, targetPos, setZoomLevel }) {
  const map = useMap();

  // Handle Zoom Tracking
  useEffect(() => {
    const handleZoom = () => {
      setZoomLevel(map.getZoom());
    };

    map.on("zoomend", handleZoom);
    // Initial set
    setZoomLevel(map.getZoom());

    return () => {
      map.off("zoomend", handleZoom);
    };
  }, [map, setZoomLevel]);

  // Initial flyTo when first secrets load
  useEffect(() => {
    if (secrets.length > 0 && !targetPos) {
      map.flyTo([secrets[0].lat, secrets[0].lng], 12, {
        duration: 4,
        easeLinearity: 0.25
      });
    }
  }, [secrets.length === 0]); // Runs once when secrets first arrive

  // FlyTo specific target (when clicking from sidebar)
  useEffect(() => {
    if (targetPos) {
      map.flyTo(targetPos, 16, { duration: 2.5 });
    }
  }, [targetPos, map]);

  return null;
}
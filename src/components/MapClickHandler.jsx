import { useMapEvents } from 'react-leaflet';

export default function MapClickHandler({ isPlacementMode, onLocationSelect }) {
  useMapEvents({
    click(e) {
      if (isPlacementMode) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });

  return null;
}
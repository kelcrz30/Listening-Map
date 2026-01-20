import React from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";

const WorldLabel = ({ isDark }) => {
  // Cinematic Golden Palette
  const glowColor = isDark ? "rgba(255, 215, 0, 0.5)" : "rgba(218, 165, 32, 0.3)";
  const textColor = isDark ? "#fff3ad" : "#8a6d1a";

  const icon = L.divIcon({
    className: "world-label-vertical",
    html: `
      <div style="
        pointer-events: none;
        user-select: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        width: 300px;
      ">
        <h1 style="
          font-family: 'serif', Times, serif;
          font-style: italic;
          font-size: 50px;
          line-height: 1.1;
          letter-spacing: 0.15em;
          color: ${textColor};
          text-transform: uppercase;
          margin: 0;
          padding: 0;
          pointer-events: none;
          
          /* MULTI-LAYERED GLOW (LAG-FREE) */
          text-shadow: 
            0 0 8px ${glowColor},
            0 0 15px ${glowColor},
            0 0 30px rgba(255, 215, 0, 0.15);
        ">
          YOU<br/>
          ARE<br/>
          ENOUGH
        </h1>
        
        <div style="
          margin-top: 10px;
          width: 40px;
          height: 2px;
          background: ${glowColor};
          filter: blur(4px);
          opacity: 0.5;
        "></div>
      </div>
    `,
    iconSize: [0, 0],
    // [Horizontal Offset, Vertical Offset]
    // 150 is half of the 300px width to keep it perfectly centered
    iconAnchor: [150, 140], 
  });

  return (
    <Marker 
      position={[17.5, 129.5]} // Position in the Philippine Sea
      icon={icon} 
      interactive={false} 
      zIndexOffset={-1000} // Keeps it behind markers but above the water
    />
  );
};

export default WorldLabel;
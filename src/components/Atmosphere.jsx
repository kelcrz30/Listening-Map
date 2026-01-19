import React from 'react';

export default function Atmosphere({ isNodding }) {
  const hour = new Date().getHours();
  const isNight = hour >= 19 || hour <= 6;

  return (
    <>
      {/* Dynamic Night Overlay */}


      {/* Heartbeat Pulse (Nod Feedback) */}
<div className={`fixed inset-0 pointer-events-none z-[5000] transition-opacity duration-1000 
  ${isNodding ? 'opacity-100' : 'opacity-0'} 
  bg-[radial-gradient(circle,rgba(249,115,22,0.15)_0%,transparent_70%)]`} 
/>

      {/* Global Vignette */}
      
    </>
  );
}
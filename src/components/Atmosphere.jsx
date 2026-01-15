import React from 'react';

export default function Atmosphere({ isNodding }) {
  const hour = new Date().getHours();
  const isNight = hour >= 19 || hour <= 6;

  return (
    <>
      {/* Dynamic Night Overlay */}
      <div 
        className={`fixed inset-0 pointer-events-none z-[400] transition-opacity duration-[3000ms] 
        ${isNight ? 'bg-black/40' : 'bg-transparent'}`} 
      />

      {/* Heartbeat Pulse (Nod Feedback) */}
      <div className={`fixed inset-0 pointer-events-none z-[5000] transition-all duration-1000 border-orange-500/0 
        ${isNodding ? 'border-[20px] border-orange-500/20 shadow-[inset_0_0_100px_rgba(249,115,22,0.3)]' : 'border-[0px]'}`} 
      />

      {/* Global Vignette */}
      <div className="fixed inset-0 pointer-events-none z-[501] shadow-[inset_0_0_200px_rgba(0,0,0,1)]" />
    </>
  );
}
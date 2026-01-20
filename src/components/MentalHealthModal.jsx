import React from 'react';
import { mentalHealthResources } from '../utils/mentalHealthDetector';

export default function MentalHealthModal({ isOpen, onClose, isDark }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md">
      <div 
        className="absolute inset-0 bg-black/60" 
        onClick={onClose}
      />
      
      <div className={`relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-3xl border shadow-2xl p-8 ${
        isDark ? 'bg-zinc-950 border-white/10' : 'bg-white border-gray-200'
      }`}>
        
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-4xl">🫂</span>
              <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                You Are Not Alone
              </h2>
            </div>
            <button 
              onClick={onClose}
              className={`text-2xl ${isDark ? 'text-white/40 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
            >
              ×
            </button>
          </div>
          
          <p className={`text-sm leading-relaxed ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
            If you're going through a difficult time, please know that help is available. 
            Reaching out is a sign of strength, not weakness.
          </p>
        </div>

        {/* Crisis Hotlines */}
        <div className="space-y-4 mb-6">
          <h3 className={`text-lg font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            📞 Philippines Crisis Hotlines (24/7)
          </h3>
          
          {mentalHealthResources.hotlines.map((hotline, index) => (
            <div 
              key={index}
              className={`p-4 rounded-xl border ${
                isDark ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {hotline.name}
                </h4>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                }`}>
                  {hotline.available}
                </span>
              </div>
              <a 
                href={`tel:${hotline.number.replace(/[^0-9+]/g, '')}`}
                className={`text-lg font-mono font-bold ${
                  isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                {hotline.number}
              </a>
            </div>
          ))}
        </div>

        {/* International Resources */}
        <div className={`p-4 rounded-xl border mb-6 ${
          isDark ? 'bg-purple-500/10 border-purple-500/20' : 'bg-purple-50 border-purple-200'
        }`}>
          <h4 className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            🌍 Outside Philippines?
          </h4>
          <a 
            href={mentalHealthResources.international.link}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-sm ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
          >
            Find crisis centers worldwide →
          </a>
        </div>

        {/* Immediate Safety Tips */}
        <div className={`p-4 rounded-xl border ${
          isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'
        }`}>
          <h4 className={`font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            ⚠️ If You're in Immediate Danger
          </h4>
          <ul className={`text-sm space-y-2 ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
            <li>• Call emergency services: <strong>911</strong> or <strong>117</strong></li>
            <li>• Go to the nearest hospital emergency room</li>
            <li>• Don't stay alone - reach out to a trusted friend or family member</li>
            <li>• Remove any means of self-harm from your immediate surroundings</li>
          </ul>
        </div>

        {/* Supportive Message */}
        <div className="mt-6 text-center">
          <p className={`text-sm italic ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
            "Even the darkest night will end and the sun will rise." — Victor Hugo
          </p>
          <button
            onClick={onClose}
            className={`mt-4 px-6 py-3 rounded-xl font-bold transition-all ${
              isDark 
                ? 'bg-white/10 hover:bg-white/20 text-white' 
                : 'bg-gray-900 hover:bg-gray-800 text-white'
            }`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from 'react';

export default function MapSearch({ isDark, onLocationFound, isVisible }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    
    try {
      // Using Nominatim (OpenStreetMap) geocoding API
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      
      setSearchResults(data);
      setShowResults(data.length > 0);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (result) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    
    onLocationFound(lat, lng, result.display_name);
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-20 sm:top-24 left-1/2 -translate-x-1/2 z-[1001] w-[calc(100%-2rem)] sm:w-[500px] max-w-2xl">
      <div className={`backdrop-blur-md border rounded-2xl shadow-2xl ${
        isDark 
          ? 'bg-zinc-900/90 border-white/10' 
          : 'bg-white/95 border-gray-200'
      }`}>
        {/* Search Input */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              handleSearch(e.target.value);
            }}
            placeholder="Search for a place..."
            className={`w-full px-4 py-3 pr-10 rounded-2xl outline-none text-sm font-light ${
              isDark 
                ? 'bg-transparent text-white placeholder:text-zinc-600' 
                : 'bg-transparent text-gray-900 placeholder:text-gray-400'
            }`}
          />
          
          {/* Search Icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isSearching ? (
              <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className={`w-5 h-5 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
        </div>

        {/* Search Results */}
        {showResults && searchResults.length > 0 && (
          <div className={`mt-2 max-h-64 overflow-y-auto rounded-b-2xl border-t ${
            isDark ? 'border-white/5' : 'border-gray-200'
          }`}>
            {searchResults.map((result, index) => (
              <button
                key={index}
                onClick={() => handleSelectLocation(result)}
                className={`w-full text-left px-4 py-3 text-sm transition-colors border-b last:border-b-0 ${
                  isDark 
                    ? 'hover:bg-white/5 border-white/5 text-zinc-300' 
                    : 'hover:bg-gray-50 border-gray-100 text-gray-700'
                }`}>
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="line-clamp-2">{result.display_name}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* No Results */}
        {showResults && searchResults.length === 0 && searchQuery.trim() && !isSearching && (
          <div className={`px-4 py-3 text-sm text-center border-t rounded-b-2xl ${
            isDark 
              ? 'text-zinc-500 border-white/5' 
              : 'text-gray-500 border-gray-200'
          }`}>
            No places found. Try a different search.
          </div>
        )}
      </div>
    </div>
  );
}
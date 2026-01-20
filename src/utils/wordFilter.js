const FORBIDDEN_WORDS = [
  'tangina', 'putangina', 'gago', 'bobo', 'tarantado', 'puta', 'hayup', 'pota', 'tanga', "kantutan", "subo",
  'pakyu', 'pokpok', 'kupal', 'ulol', 'pakyut', 'shunga', 'lintek', 'punyeta', 'kantot', 'iyot',
  'hindot', 'pakshet', 'tangengot', 'buwisit', 'leche', 'pisti', 'giatay', 'kayat', "patayin", "burat",
  'bitch', 'nigga', 'nigger', 'fuck', 'shit', 'asshole', 'cunt', 'dick', 'pussy', 
  'faggot', 'bastard', 'slut', 'whore', 'motherfucker', "fubu", "cock", "sex"
];

const LEET_MAP = {
  '@': 'a', '4': 'a', '0': 'o', '3': 'e', '1': 'i', '!': 'i', '$': 's', '5': 's', '7': 't'
};

export const checkText = (text) => {
  if (!text) return { isProfane: false, count: 0 };
  
  // 1. Basic Cleaning
  let normalizedText = text.toLowerCase();

  // 2. Handle Leet Speak
  Object.keys(LEET_MAP).forEach(symbol => {
    normalizedText = normalizedText.replaceAll(symbol, LEET_MAP[symbol]);
  });

  // 3. Create Clean Text (Remove all spaces/symbols for bypass protection)
  // This turns "f u c k" or "f.u.c.k" into "fuck"
  const scrubbedText = normalizedText.replace(/[^a-z]/g, '');

  let totalCount = 0;
  const foundWords = [];

  FORBIDDEN_WORDS.forEach(word => {
    // This Regex handles repeating letters: "fuuuuuck" -> "fuck"
    const pattern = word.split('').map(char => `${char}+`).join('');
    const regex = new RegExp(pattern, 'gi');
    
    // Check both the original (with spaces) and the scrubbed text
    const matchesOriginal = normalizedText.match(regex);
    const matchesScrubbed = scrubbedText.match(regex);

    if (matchesOriginal || matchesScrubbed) {
      // Use a Set to avoid double-counting if it matches both
      const uniqueMatches = new Set([
        ...(matchesOriginal || []), 
        ...(matchesScrubbed || [])
      ]);
      totalCount += uniqueMatches.size;
    }
  });

  return {
    isProfane: totalCount > 0,
    count: totalCount
  };
};
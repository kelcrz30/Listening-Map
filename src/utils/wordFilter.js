const FORBIDDEN_WORDS = [
  'tangina', 'putangina', 'gago', 'bobo', 'tarantado', 'puta', 'hayup', 'pota', 'tanga', "kantutan", "subo",

  'pakyu', 'pokpok', 'kupal', 'ulol', 'pakyut', 'shunga', 'lintek', 'punyeta', 'kantot', 'iyot',
  'hindot', 'pakshet', 'tangengot', 'buwisit', 'leche', 'pisti', 'giatay', 'kayat', "patayin", "burat",

  'bitch', 'nigga', 'nigger', 'fuck', 'shit', 'asshole', 'cunt', 'dick', 'pussy', 
  'faggot', 'bastard', 'slut', 'whore', 'motherfucker', "fubu", "fuck", "kill", "dick", "pussy", "cock", "sex"
];

const LEET_MAP = {
  '@': 'a', '4': 'a', '0': 'o', '3': 'e', '1': 'i', '!': 'i', '$': 's', '5': 's', '7': 't'
};

export const checkText = (text) => {
  if (!text) return { isProfane: false, count: 0 };
  
  let normalizedText = text.toLowerCase();
  Object.keys(LEET_MAP).forEach(symbol => {
    normalizedText = normalizedText.replaceAll(symbol, LEET_MAP[symbol]);
  });

  const cleanText = normalizedText.replace(/[\s\W_]/g, '');

  let totalCount = 0;

  FORBIDDEN_WORDS.forEach(word => {
    const pattern = word.split('').map(char => `${char}+`).join('');
    const regex = new RegExp(pattern, 'gi');
    
    const matches = cleanText.match(regex);
    if (matches) {
      totalCount += matches.length;
    }
  });

  return {
    isProfane: totalCount > 0,
    count: totalCount
  };
};
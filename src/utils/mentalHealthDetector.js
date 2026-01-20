// utils/mentalHealthDetector.js

const crisisKeywords = [
  // --- Suicide-related (English) ---
  'suicide', 'kill myself', 'end my life', 'want to die', 'better off dead',
  'no reason to live', 'cant go on', 'cant take it anymore', 'ready to jump',
  'end it all', 'goodbye world', 'suicide plan', 'kill me', 'take my life',
  'hanging myself', 'overdose', 'i want to end it', 'dont want to wake up',
  'planning to die', 'death wish', 'final goodbye',

  // --- Self-harm (English) ---
  'cut myself', 'hurt myself', 'self harm', 'self-harm', 'cutting myself',
  'burning myself', 'want to bleed', 'hit myself', 'end the pain',

  // --- Filipino/Tagalog (Direct Crisis) ---
  'mamatay', 'mamatay na ako', 'mamatay na lang', 'papatayin ko sarili ko', 
  'magpapakamatay', 'magpakamatay', 'tapusin ang buhay', 'kitilin ang buhay',
  'bigti', 'magbigti', 'laslas', 'maglaslas', 'itigil na ang lahat',

  // --- Filipino/Tagalog (Emotional Despair) ---
  'ayaw ko na', 'ayaw ko na mabuhay', 'pagod na ko sa buhay', 'pagod na ko mabuhay',
  'wala ng dahilan', 'wala nang dahilan para mabuhay', 'gusto ko nang mawala', 
  'gusto ko na mawala', 'suko na ko', 'sumusuko na ako', 'di ko na kaya',
  'hindi ko na kaya', 'hirap na hirap na ako', 'lunod na lunod na ako',
  'wala nang pag-asa', 'sana mawala na lang ako', 'sana hindi na ako nagising',

  // --- Slang & Variations (Taglish) ---
  'kms', 'suicidal', 'unalive', 'i wanna unalive', 'done with life',
  'gusto ko na ma-dedbol', 'pagod na ko lord', 'kunin mo na ko', 
  'ayoko na dito', 'exit na ko', 'wala na kong kwenta', 'pabigat lang ako'
];

/**
 * Normalizes text to catch bypass attempts.
 * Example: "s-u.i c_i d e" -> "suicide"
 */
const normalizeText = (text) => {
  return text
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/[^a-z]/g, ''); // Remove everything except letters
};

export const checkForCrisisLanguage = (text) => {
  if (!text) return { isCrisis: false };
  
  const lowerText = text.toLowerCase();
  const cleanText = normalizeText(text);
  
  // Check for crisis keywords using both standard and normalized text
  const foundKeywords = crisisKeywords.filter(keyword => {
    const lowerKeyword = keyword.toLowerCase();
    const cleanKeyword = lowerKeyword.replace(/[^a-z]/g, '');

    // Check 1: Direct match
    if (lowerText.includes(lowerKeyword)) return true;

    // Check 2: Scrubbed match (catches bypass like s.u.i.c.i.d.e)
    // We only do this for keywords longer than 3 chars to avoid false positives
    if (cleanKeyword.length > 3 && cleanText.includes(cleanKeyword)) return true;

    return false;
  });
  
  if (foundKeywords.length > 0) {
    return {
      isCrisis: true,
      keywords: foundKeywords
    };
  }
  
  return { isCrisis: false };
};

// Philippines Mental Health Resources
export const mentalHealthResources = {
  hotlines: [
    {
      name: "NCMH Crisis Hotline",
      number: "0966-351-4518 / 0917-899-8727",
      available: "24/7"
    },
    {
      name: "DOH Mental Health Hotline",
      number: "1553 (PLDT Landline)",
      available: "24/7"
    },
    {
      name: "In Touch Crisis Line",
      number: "(02) 8893-7603 / 0917-800-1123",
      available: "24/7"
    },
    {
      name: "Hopeline Philippines",
      number: "0917-558-4673 / (02) 8804-4673",
      available: "24/7"
    }
  ],
  international: {
    name: "International Association for Suicide Prevention",
    link: "https://www.iasp.info/resources/Crisis_Centres/"
  }
};
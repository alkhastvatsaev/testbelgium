export const capitalizeName = (name: string): string => {
  if (!name) return "";
  return name
    .trim()
    .toLowerCase()
    .replace(/(^|[\s-])\S/g, (match) => match.toUpperCase());
};

export const formatAddress = (address: string): string => {
  if (!address) return "";
  
  const stopWords = [
    "de", "du", "des", "le", "la", "les", "à", "au", "aux", "et", "en", "sur", "sous", "dans",
    "rue", "avenue", "boulevard", "chaussée", "place", "chemin", "route", "allée", "impasse"
  ];
  
  let formatted = address.trim().toLowerCase().split(/\s+/).map((word, index) => {
    if (index === 0) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    if (stopWords.includes(word)) {
      return word;
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(" ");

  if (!/(belgique|belgium|bruxelles|brussels|\d{4})/i.test(formatted)) {
    formatted = formatted.replace(/,+$/, "");
    formatted += ", 1000 Bruxelles, Belgique";
  } else if (!/(belgique|belgium)/i.test(formatted)) {
    formatted = formatted.replace(/,+$/, "");
    formatted += ", Belgique";
  }

  return formatted;
};

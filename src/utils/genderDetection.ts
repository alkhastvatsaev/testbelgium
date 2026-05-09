export function guessGenderPrefixFromName(firstName?: string | null): "M." | "Mme" | "" {
  if (!firstName) return "";
  const name = firstName.trim().toLowerCase();
  
  // Noms masculins courants qui pourraient prêter à confusion ou très populaires
  const maleNames = new Set([
    "jean", "pierre", "guillaume", "claude", "maxime", "antoine", "alexandre", 
    "stephane", "stéphane", "christophe", "philippe", "laurent", "patrice", 
    "dominique", "rene", "rené", "baptiste", "emile", "émile", "jules", "charles", 
    "lucas", "thomas", "nicolas", "mathieu", "matthieu", "hugo", "leo", "léo", 
    "louis", "gabriel", "arthur", "theodore", "théodore", "gregoire", "grégoire",
    "jerome", "jérôme", "gilles", "yves", "michel", "jacques", "georges", 
    "luc", "marc", "paul", "jean-baptiste", "jean-claude", "jean-pierre", 
    "jean-marie", "jean-luc", "jean-marc", "jean-paul", "jean-francois",
    "francois", "françois", "martin", "simon", "vincent", "victor", "felix", "félix",
    "clement", "clément", "adrien", "julien", "florent", "romain",
    "arnaud", "sylvain", "fabien", "damien", "bastien", "sebastien", "sébastien",
    "cyril", "cyrille", "cedric", "cédric", "lionel", "martial", "pascal",
    "olivier", "xavier", "didier", "thierry", "denis", "remy", "rémy", "remi", "rémi",
    "jeremie", "jérémie", "jeremy", "jérémy", "benoit", "benoît", "bruno", "aldo",
    "enzo", "mario", "gino", "paolo", "marco", "antonio", "carlos", "luis", "jose",
    "mohamed", "ali", "ahmed", "hassan", "youssef", "omar", "karim", "mehdi",
    "amine", "brahim", "samir", "mikael", "mickaël", "mickael", "michael", "michaël",
    "yannick", "patrick", "cedrick", "eric", "éric", "loic", "loïc", "stephan",
    "alain", "bernard", "christian", "daniel", "david", "franck", "gerard", "gérard",
    "guy", "herve", "hervé", "joel", "joël", "marcel", "maurice", "raymond",
    "richard", "robert", "roland", "serge", "sylvestre", "yvan", "william", "kevin", "kévin"
  ]);

  // Noms féminins courants qui pourraient prêter à confusion
  const femaleNames = new Set([
    "carmen", "manon", "marion", "sharon", "chloe", "chloé", "zoe", "zoé", 
    "cleo", "cléo", "inès", "ines", "agnes", "agnès", "iris", "anais", "anaïs", 
    "maud", "astrid", "ingrid", "edith", "judith", "ruth", "elisabeth", "élisabeth", 
    "margot", "alice", "beatrice", "béatrice", "florence", "laurence", "clemence", 
    "clémence", "berengere", "bérengère", "solange", "nadege", "nadège", "edwige",
    "myriam", "miriam", "sarah", "leah", "deborah", "déborah", "rachel", "muriel", 
    "christel", "karen", "helen", "aude", "jeanne", "anne", "marie",
    "sophie", "isabelle", "nathalie", "valerie", "valérie", "sylvie", "catherine",
    "martine", "christine", "brigitte", "chantal", "monique", "nicole", "suzanne",
    "veronique", "véronique", "sandrine", "celine", "céline", "stephanie", "stéphanie",
    "caroline", "virginie", "severine", "séverine", "emilie", "émilie", "aurelie", "aurélie",
    "laura", "camilla", "julia", "clara", "emma", "lea", "léa", "mia", "nina", "lola"
  ]);

  // Prénoms mixtes
  const mixed = new Set(["claude", "dominique", "camille", "sacha", "ange", "eden", "lou", "alix"]);

  if (mixed.has(name)) return "";

  if (maleNames.has(name)) return "M.";
  if (femaleNames.has(name)) return "Mme";

  // Heuristiques basées sur les terminaisons
  if (name.endsWith("a") || 
      name.endsWith("ie") || 
      name.endsWith("ee") || 
      name.endsWith("ée") ||
      name.endsWith("elle") || 
      name.endsWith("ette") || 
      name.endsWith("ine") ||
      name.endsWith("anne") ||
      name.endsWith("enne") ||
      name.endsWith("onne") ||
      name.endsWith("ise")) {
    return "Mme";
  }

  if (name.endsWith("o") || 
      name.endsWith("u") || 
      name.endsWith("ien") || 
      name.endsWith("ian") ||
      name.endsWith("in") ||
      name.endsWith("on") ||
      name.endsWith("an") ||
      name.endsWith("er") ||
      name.endsWith("el") ||
      name.endsWith("ic") ||
      name.endsWith("is") ||
      name.endsWith("us") ||
      name.endsWith("os") ||
      name.endsWith("ard") ||
      name.endsWith("aud") ||
      name.endsWith("aut") ||
      name.endsWith("ald") ||
      name.endsWith("alt")) {
    return "M.";
  }

  // Par défaut, s'il se termine par 'e', beaucoup de prénoms féminins (hors exceptions ci-dessus)
  if (name.endsWith("e")) {
    return "Mme";
  }

  // Par défaut, la plupart des consonnes à la fin indiquent un prénom masculin en français
  return "M.";
}

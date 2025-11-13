// Racing-themed words for username generation
const racingWords = [
  'piloto',
  'master',
  'drift',
  'pro',
  'player',
  'mestre',
  'dono',
  'zeroum',
  'jogador',
  'profissional',
  'corredor',
  'veloz',
  'rapido',
  'turbo',
  'nitro',
  'racer',
  'speed',
  'super',
  'mega',
  'ultra',
  'extreme',
  'radical',
  'lendario',
  'campeao',
  'rei',
  'ace',
  'sonic',
  'flash',
  'bolt',
  'rocket',
  'thunder',
  'storm',
  'blaze',
  'fury',
  'savage',
  'wild',
  'crazy',
  'insane',
  'mad',
  'beast',
  'titan',
  'viper',
  'cobra',
  'falcon',
  'hawk',
  'eagle',
  'phoenix',
  'dragon',
  'demon',
  'ghost',
  'shadow',
  'ninja',
  'samurai',
  'warrior',
  'gladiador',
  'heroi',
  'lenda',
  'mito',
  'deus',
  'estrela',
  'astro',
  'fenix',
  'lobo',
  'tigre',
  'leao',
  'pantera',
  'jaguar',
  'mustang',
  'ferrari',
  'lambo',
  'porsche',
  'bugatti',
  'mclaren',
  'koenigsegg',
  'pagani',
  'apex',
  'vertex',
  'zenith',
  'alpha',
  'omega',
  'sigma',
  'delta',
  'gamma',
  'beta',
  'prime',
  'elite',
  'supreme',
  'ultimate',
  'legendary',
  'immortal',
  'eternal',
  'infinito',
  'divino',
  'supremo',
  'imperial',
  'real',
  'nobre',
  'majestoso'
];

/**
 * Generates a random racing-themed username by combining two words
 * @returns A randomly generated username
 */
export const generateRacingUsername = (): string => {
  const word1 = racingWords[Math.floor(Math.random() * racingWords.length)];
  const word2 = racingWords[Math.floor(Math.random() * racingWords.length)];

  // Randomly decide the order and add a number sometimes
  const addNumber = Math.random() > 0.5;
  const number = addNumber ? Math.floor(Math.random() * 999) : '';

  // Randomly capitalize
  const capitalize = (str: string) => {
    return Math.random() > 0.5
      ? str.charAt(0).toUpperCase() + str.slice(1)
      : str;
  };

  const username = Math.random() > 0.5
    ? `${capitalize(word1)}${capitalize(word2)}${number}`
    : `${capitalize(word2)}${capitalize(word1)}${number}`;

  return username;
};

/**
 * Generates an email address using the provided username or generates a new one
 * @param existingUsername Optional username to use, otherwise generates a new one
 * @returns An email address with format username@tuamaeaquelaursa.com
 */
export const generateRacingEmail = (existingUsername?: string): string => {
  const username = existingUsername || generateRacingUsername();
  return `${username.toLowerCase()}@tuamaeaquelaursa.com`;
};

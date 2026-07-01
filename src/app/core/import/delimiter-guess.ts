const CANDIDATE_DELIMITERS = [';', ',', '\t'];

/** Picks whichever candidate delimiter appears most often in the sample's first line. */
export const guessDelimiter = (sampleText: string): string => {
  const firstLine = sampleText.split(/\r?\n/, 1)[0] ?? '';
  let best = CANDIDATE_DELIMITERS[0];
  let bestCount = -1;
  for (const delimiter of CANDIDATE_DELIMITERS) {
    const count = firstLine.split(delimiter).length - 1;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
};

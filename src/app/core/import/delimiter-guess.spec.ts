import { guessDelimiter } from './delimiter-guess';

describe('guessDelimiter: candidate selection', () => {
  it('picks semicolon when it is the dominant separator', () => {
    expect(guessDelimiter('Boekingsdatum;Bedrag;Omschrijving\n01/07/2026;-12,34;Carrefour')).toBe(
      ';',
    );
  });

  it('picks comma when it is the dominant separator', () => {
    expect(guessDelimiter('Date,Amount,Description\n2026-07-01,-12.34,Carrefour')).toBe(',');
  });

  it('picks tab when it is the dominant separator', () => {
    expect(guessDelimiter('Date\tAmount\tDescription')).toBe('\t');
  });
});

import { REPLACEMENT_CHAR as BAD, guessReadingOptions } from './reading-guess';

const lines = (...rows: string[]): string => rows.join('\n');

describe('guessReadingOptions: separator (TICKET-IMP-16)', () => {
  it('reads a semicolon file even though its amounts carry commas', () => {
    const guess = guessReadingOptions(
      lines(
        'Datum;Omschrijving;Bedrag;Saldo',
        '30/09/2026;COLRUYT GENT;-84,12;1203,55',
        '29/09/2026;CAFE;-23,50;1287,67',
      ),
      true,
    );
    expect(guess.delimiter).toEqual({ value: ';', confidence: 'sure' });
  });

  it('reads a comma file, quoted values with commas inside included', () => {
    const guess = guessReadingOptions(
      lines(
        'Date,Description,Amount',
        '2026-07-01,"Carrefour, Gent",-12.34',
        '2026-07-02,Salary,"3,120.00"',
      ),
      true,
    );
    expect(guess.delimiter).toEqual({ value: ',', confidence: 'sure' });
  });

  it('reads a tab file', () => {
    const guess = guessReadingOptions(
      lines('Date\tDescription\tAmount', '2026-07-01\tCarrefour\t-12.34', '2026-07-02\tBol\t-9.99'),
      true,
    );
    expect(guess.delimiter).toEqual({ value: '\t', confidence: 'sure' });
  });

  it('is sure of the semicolon even when the comma splits as many lines by accident', () => {
    // Found live: a comma-laden preamble plus two comma amounts per line gives the comma three
    // columns on five lines — as many as the semicolon's block — but broken by the header.
    const guess = guessReadingOptions(
      lines(
        'Export of account BE12 9730 1234 5678, created 01/10/2026, all rights reserved',
        'Datum;Omschrijving;Bedrag;Saldo',
        '01/09/2026;CAFE;-23,50;1.203,55',
        '02/09/2026;COLRUYT GENT;-84,12;1.119,43',
        '03/09/2026;ACME NV LOON;3.120,00;4.239,43',
        '04/09/2026;BOL.COM;-19,99;4.219,44',
      ),
      true,
    );
    expect(guess.delimiter).toEqual({ value: ';', confidence: 'sure' });
    expect(guess.headerRows).toEqual({ value: 2, confidence: 'sure' });
    expect(guess.decimalSeparator).toEqual({ value: ',', confidence: 'sure' });
  });

  it('is unsure when no separator splits anything', () => {
    const guess = guessReadingOptions(lines('just some text', 'and more text'), true);
    expect(guess.delimiter.confidence).toBe('unsure');
  });
});

describe('guessReadingOptions: header line', () => {
  it('finds line 1 when the file starts with its header', () => {
    const guess = guessReadingOptions(lines('Date;Desc;Amount', '14/07/2026;Coffee;-3,50'), true);
    expect(guess.headerRows).toEqual({ value: 1, confidence: 'sure' });
  });

  it('skips a preamble line before the header, and still gets the separator', () => {
    // The preamble has more commas than semicolons — exactly what defeated the first-line guess.
    const guess = guessReadingOptions(
      lines(
        'Export of account BE12 9730 1234 5678, created 01/10/2026, all rights reserved',
        'Datum;Omschrijving;Bedrag',
        '30/09/2026;COLRUYT GENT;-84,12',
        '29/09/2026;CAFE;-23,50',
      ),
      true,
    );
    expect(guess.delimiter).toEqual({ value: ';', confidence: 'sure' });
    expect(guess.headerRows).toEqual({ value: 2, confidence: 'sure' });
  });

  it('is unsure when the line after the header has no date', () => {
    const guess = guessReadingOptions(lines('A;B;C', 'x;y;z', 'p;q;r'), true);
    expect(guess.headerRows).toEqual({ value: 1, confidence: 'unsure' });
  });
});

describe('guessReadingOptions: date format', () => {
  const withDates = (...dates: string[]): string =>
    lines('Date;Desc;Amount', ...dates.map((date) => `${date};Coffee;-3,50`));

  it('settles on day/month/year once a day above 12 shows up first', () => {
    expect(guessReadingOptions(withDates('01/02/2026', '30/09/2026'), true).dateFormat).toEqual({
      value: 'DD/MM/YYYY',
      confidence: 'sure',
    });
  });

  it('settles on month/day/year once a day above 12 shows up second', () => {
    expect(guessReadingOptions(withDates('01/02/2026', '09/30/2026'), true).dateFormat).toEqual({
      value: 'MM/DD/YYYY',
      confidence: 'sure',
    });
  });

  it('settles on ISO dates', () => {
    expect(guessReadingOptions(withDates('2026-09-30', '2026-09-01'), true).dateFormat).toEqual({
      value: 'YYYY-MM-DD',
      confidence: 'sure',
    });
  });

  it('is unsure when every date fits both orders', () => {
    expect(guessReadingOptions(withDates('01/02/2026', '03/04/2026'), true).dateFormat).toEqual({
      value: 'DD/MM/YYYY',
      confidence: 'unsure',
    });
  });

  it('is unsure when the dates contradict each other', () => {
    expect(
      guessReadingOptions(withDates('30/09/2026', '09/30/2026'), true).dateFormat.confidence,
    ).toBe('unsure');
  });
});

describe('guessReadingOptions: decimal mark', () => {
  const withAmounts = (...amounts: string[]): string =>
    lines('Date;Desc;Amount', ...amounts.map((amount) => `30/09/2026;Coffee;${amount}`));

  it('reads a comma followed by two digits as the decimal mark', () => {
    expect(guessReadingOptions(withAmounts('-84,12', '3120,00'), true).decimalSeparator).toEqual({
      value: ',',
      confidence: 'sure',
    });
  });

  it('reads a dot followed by two digits as the decimal mark', () => {
    expect(guessReadingOptions(withAmounts('-84.12', '3120.00'), true).decimalSeparator).toEqual({
      value: '.',
      confidence: 'sure',
    });
  });

  it('takes the last of two different marks, with dots grouping thousands', () => {
    expect(
      guessReadingOptions(withAmounts('1.234,56', '-12.000,00'), true).decimalSeparator,
    ).toEqual({ value: ',', confidence: 'sure' });
  });

  it('takes the last of two different marks, with commas grouping thousands', () => {
    expect(
      guessReadingOptions(withAmounts('1,234.56', '€ 12,000.00'), true).decimalSeparator,
    ).toEqual({ value: '.', confidence: 'sure' });
  });

  it('reads a repeated mark as thousands, so the other mark is the decimal one', () => {
    expect(guessReadingOptions(withAmounts('1.234.567', '-5,5'), true).decimalSeparator).toEqual({
      value: ',',
      confidence: 'sure',
    });
  });

  it('is unsure when three digits follow the only mark', () => {
    expect(guessReadingOptions(withAmounts('1.234', '-2.500'), true).decimalSeparator).toEqual({
      value: ',',
      confidence: 'unsure',
    });
  });

  it('is unsure when the amounts disagree', () => {
    const guess = guessReadingOptions(withAmounts('-84,12', '-3,50', '12.50'), true);
    expect(guess.decimalSeparator).toEqual({ value: ',', confidence: 'unsure' });
  });
});

describe('guessReadingOptions: encoding', () => {
  const file = lines('Date;Desc;Amount', '30/09/2026;CAFÉ RÉSISTANCE;-23,50');

  it('reads valid UTF-8 as UTF-8', () => {
    expect(guessReadingOptions(file, true).encoding).toEqual({
      value: 'utf-8',
      confidence: 'sure',
    });
  });

  it('reads invalid UTF-8 as Windows-1252', () => {
    // What a lenient UTF-8 decode of a Windows-1252 "CAFÉ" looks like.
    const decoded = lines('Date;Desc;Amount', `30/09/2026;CAF${BAD} R${BAD}SISTANCE;-23,50`);
    expect(guessReadingOptions(decoded, false).encoding).toEqual({
      value: 'windows-1252',
      confidence: 'sure',
    });
  });

  it('is unsure when broken bytes sit next to well-formed UTF-8 letters', () => {
    const decoded = lines('Date;Desc;Amount', `30/09/2026;CAF${BAD} RÉSISTANCE;-23,50`);
    expect(guessReadingOptions(decoded, false).encoding).toEqual({
      value: 'windows-1252',
      confidence: 'unsure',
    });
  });
});

describe('guessReadingOptions: an empty file', () => {
  it('returns the defaults, every one unsure', () => {
    expect(guessReadingOptions('  \n\n', true)).toEqual({
      encoding: { value: 'utf-8', confidence: 'unsure' },
      delimiter: { value: ';', confidence: 'unsure' },
      headerRows: { value: 1, confidence: 'unsure' },
      dateFormat: { value: 'DD/MM/YYYY', confidence: 'unsure' },
      decimalSeparator: { value: ',', confidence: 'unsure' },
    });
  });
});

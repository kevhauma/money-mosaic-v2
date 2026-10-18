import { describe, expect, it } from 'vitest';
import { COLUMN_KEYS, guessColumns, type ColumnGuess, type ColumnKey } from './column-guess';

const COMMA = { decimalSeparator: ',' };
const DOT = { decimalSeparator: '.' };

const columnsOf = (guess: ColumnGuess): Partial<Record<ColumnKey, string>> =>
  Object.fromEntries(
    COLUMN_KEYS.flatMap((key) => {
      const column = guess.fields[key].column;
      return column ? [[key, column]] : [];
    }),
  );

const expectNoColumnTwice = (guess: ColumnGuess): void => {
  const used = Object.values(columnsOf(guess));
  expect(new Set(used).size).toBe(used.length);
};

// A KBC export as the bank writes it: the preset's columns plus the ones it ignores — a value date,
// a separate credit/debet pair, the holder's own name, a BIC, an address, two communications.
const KBC_HEADERS = [
  'Rekeningnummer',
  'Rubrieknaam',
  'Naam',
  'Munt',
  'Afschriftnummer',
  'Boekingsdatum',
  'Omschrijving',
  'Valutadatum',
  'Bedrag',
  'Saldo',
  'credit',
  'debet',
  'Rekeningnummer tegenpartij',
  'BIC tegenpartij',
  'Naam tegenpartij',
  'Adres tegenpartij',
  'gestructureerde mededeling',
  'Vrije mededeling',
];
const KBC_OWN = 'BE12 3456 7890 1234';
const kbcRow = (cells: {
  date: string;
  description: string;
  amount: string;
  balance: string;
  iban: string;
  name: string;
}): string[] => {
  const negative = cells.amount.startsWith('-');
  return [
    KBC_OWN,
    'Zichtrekening',
    'JAN JANSSENS',
    'EUR',
    '2026001',
    cells.date,
    cells.description,
    cells.date,
    cells.amount,
    cells.balance,
    negative ? '' : cells.amount,
    negative ? cells.amount.slice(1) : '',
    cells.iban,
    'GKCCBEBB',
    cells.name,
    'Kerkstraat 1 9000 Gent',
    '+++090/9337/55493+++',
    negative ? '' : 'LOON SEPT',
  ];
};
const KBC_ROWS = [
  kbcRow({
    date: '30/09/2026',
    description: 'BETALING MET KAART 29/09 COLRUYT GENT 1234 XXXX',
    amount: '-84,12',
    balance: '1.215,88',
    iban: 'BE40 0910 0002 3456',
    name: 'COLRUYT GENT',
  }),
  kbcRow({
    date: '01/10/2026',
    description: 'OVERSCHRIJVING VAN WERKGEVER NV LOON SEPTEMBER 2026',
    amount: '3.120,00',
    balance: '4.335,88',
    iban: 'BE71 0961 2345 6769',
    name: 'WERKGEVER NV',
  }),
  kbcRow({
    date: '02/10/2026',
    description: 'DOMICILIERING PROXIMUS FACTUUR 2026-123456',
    amount: '-45,00',
    balance: '4.290,88',
    iban: 'BE55 0000 1111 2222',
    name: 'PROXIMUS',
  }),
];

const BELFIUS_HEADERS = [
  'Rekening',
  'Boekingsdatum',
  'Rekeninguittrekselnummer',
  'Transactienummer',
  'Rekening tegenpartij',
  'Naam tegenpartij',
  'Straat en nummer',
  'Postcode en plaats',
  'Omschrijving',
  'Valutadatum',
  'Bedrag',
  'Munt',
  'BIC',
  'Landcode',
  'Saldo',
];
const belfiusRow = (date: string, iban: string, name: string, text: string, amount: string) => [
  'BE68 0634 1234 5678',
  date,
  '00123',
  '0045',
  iban,
  name,
  'Kerkstraat 1',
  '9000 Gent',
  text,
  date,
  amount,
  'EUR',
  'GKCCBEBB',
  'BE',
  '1.000,00',
];
const BELFIUS_ROWS = [
  belfiusRow(
    '30/09/2026',
    'BE40 0910 0002 3456',
    'COLRUYT',
    'AANKOOP BANCONTACT COLRUYT GENT',
    '-84,12',
  ),
  belfiusRow(
    '01/10/2026',
    'BE71 0961 2345 6769',
    'WERKGEVER NV',
    'STORTING LOON SEPTEMBER WERKGEVER',
    '3.120,00',
  ),
];

describe('guessColumns', () => {
  describe('Dutch headers', () => {
    it('maps a KBC-shaped export to the KBC preset’s columns without the preset', () => {
      const guess = guessColumns(KBC_HEADERS, KBC_ROWS, COMMA);

      expect(guess.amountMode).toBe('single');
      expect(columnsOf(guess)).toEqual({
        date: 'Boekingsdatum',
        amount: 'Bedrag',
        description: 'Omschrijving',
        counterpartyName: 'Naam tegenpartij',
        counterpartyIban: 'Rekeningnummer tegenpartij',
        ownIban: 'Rekeningnummer',
        balance: 'Saldo',
      });
      expect(guess.fields.date.confidence).toBe('sure');
      expect(guess.fields.amount.confidence).toBe('sure');
      expectNoColumnTwice(guess);
    });

    it('maps a Belfius-shaped export to the Belfius preset’s columns without the preset', () => {
      const guess = guessColumns(BELFIUS_HEADERS, BELFIUS_ROWS, COMMA);

      expect(columnsOf(guess)).toEqual({
        date: 'Boekingsdatum',
        amount: 'Bedrag',
        description: 'Omschrijving',
        counterpartyName: 'Naam tegenpartij',
        counterpartyIban: 'Rekening tegenpartij',
        ownIban: 'Rekening',
        balance: 'Saldo',
      });
      expectNoColumnTwice(guess);
    });

    it('reads the headers alone when the file has no data lines yet', () => {
      const guess = guessColumns(KBC_HEADERS, [], COMMA);

      expect(guess.fields.date.column).toBe('Boekingsdatum');
      expect(guess.fields.amount.column).toBe('Bedrag');
      expect(guess.fields.description.column).toBe('Omschrijving');
      expectNoColumnTwice(guess);
    });
  });

  it('maps English headers', () => {
    const guess = guessColumns(
      [
        'Date',
        'Description',
        'Counterparty',
        'Counterparty account',
        'Account',
        'Amount',
        'Balance',
      ],
      [
        [
          '2026-09-30',
          'Card payment Tesco Metro',
          'Tesco',
          'GB33BUKB20201555555555',
          'GB29NWBK60161331926819',
          '-12.40',
          '512.60',
        ],
        [
          '2026-10-01',
          'Salary September Acme Ltd',
          'Acme Ltd',
          'GB94BARC10201530093459',
          'GB29NWBK60161331926819',
          '2500.00',
          '3012.60',
        ],
      ],
      DOT,
    );

    expect(columnsOf(guess)).toEqual({
      date: 'Date',
      description: 'Description',
      counterpartyName: 'Counterparty',
      counterpartyIban: 'Counterparty account',
      ownIban: 'Account',
      amount: 'Amount',
      balance: 'Balance',
    });
    expect(guess.fields.amount.confidence).toBe('sure');
  });

  it('maps French headers, accents and all', () => {
    const guess = guessColumns(
      [
        'Date de comptabilisation',
        'Date valeur',
        'Libellé',
        'Montant',
        'Devise',
        'Nom de la contrepartie',
        'Compte de la contrepartie',
        'Numéro de compte',
        'Solde',
      ],
      [
        [
          '30/09/2026',
          '29/09/2026',
          'PAIEMENT CARTE DELHAIZE BRUXELLES',
          '-84,12',
          'EUR',
          'DELHAIZE',
          'BE40 0910 0002 3456',
          'BE12 3456 7890 1234',
          '1.215,88',
        ],
        [
          '01/10/2026',
          '01/10/2026',
          'VIREMENT SALAIRE SEPTEMBRE EMPLOYEUR',
          '3.120,00',
          'EUR',
          'EMPLOYEUR SA',
          'BE71 0961 2345 6769',
          'BE12 3456 7890 1234',
          '4.335,88',
        ],
      ],
      COMMA,
    );

    expect(columnsOf(guess)).toEqual({
      date: 'Date de comptabilisation',
      description: 'Libellé',
      amount: 'Montant',
      counterpartyName: 'Nom de la contrepartie',
      counterpartyIban: 'Compte de la contrepartie',
      ownIban: 'Numéro de compte',
      balance: 'Solde',
    });
  });

  describe('values alone, under meaningless headers', () => {
    const headers = ['Col1', 'Col2', 'Col3', 'Col4', 'Col5'];
    const rows = [
      [
        'BE12 3456 7890 1234',
        '30/09/2026',
        'BETALING MET KAART COLRUYT GENT',
        '-84,12',
        'BE40 0910 0002 3456',
      ],
      [
        'BE12 3456 7890 1234',
        '01/10/2026',
        'OVERSCHRIJVING LOON SEPTEMBER WERKGEVER',
        '3.120,00',
        'BE71 0961 2345 6769',
      ],
      [
        'BE12 3456 7890 1234',
        '02/10/2026',
        'DOMICILIERING PROXIMUS',
        '-45,00',
        'BE55 0000 1111 2222',
      ],
    ];

    it('finds every column from the shape of its values', () => {
      const guess = guessColumns(headers, rows, COMMA);
      expect(columnsOf(guess)).toEqual({
        ownIban: 'Col1',
        date: 'Col2',
        description: 'Col3',
        amount: 'Col4',
        counterpartyIban: 'Col5',
      });
      expectNoColumnTwice(guess);
    });

    it('is sure of dates, signed amounts and IBANs, and asks about text', () => {
      const { fields } = guessColumns(headers, rows, COMMA);
      expect(fields.date.confidence).toBe('sure');
      expect(fields.amount.confidence).toBe('sure');
      expect(fields.ownIban.confidence).toBe('sure');
      expect(fields.counterpartyIban.confidence).toBe('sure');
      expect(fields.description.confidence).toBe('check');
    });
  });

  it('prefers the booking date over the value date, whichever comes first', () => {
    const guess = guessColumns(
      ['Valutadatum', 'Boekingsdatum', 'Omschrijving', 'Bedrag'],
      [
        ['29/09/2026', '30/09/2026', 'BETALING COLRUYT', '-84,12'],
        ['01/10/2026', '02/10/2026', 'LOON SEPTEMBER', '3.120,00'],
      ],
      COMMA,
    );

    expect(guess.fields.date).toEqual({ column: 'Boekingsdatum', confidence: 'sure' });
  });

  it('takes the IBAN that is the same on every line as yours and the varying one as theirs', () => {
    const guess = guessColumns(
      ['Datum', 'Iban 1', 'Iban 2', 'Bedrag'],
      [
        ['30/09/2026', 'BE40 0910 0002 3456', 'BE12 3456 7890 1234', '-84,12'],
        ['01/10/2026', 'BE71 0961 2345 6769', 'BE12 3456 7890 1234', '3.120,00'],
        ['02/10/2026', 'BE55 0000 1111 2222', 'BE12 3456 7890 1234', '-45,00'],
      ],
      COMMA,
    );

    expect(guess.fields.ownIban.column).toBe('Iban 2');
    expect(guess.fields.counterpartyIban.column).toBe('Iban 1');
  });

  describe('split amounts', () => {
    const rows = [
      ['30/09/2026', 'Card payment', '84.12', '', '1215.88'],
      ['01/10/2026', 'Salary', '', '3120.00', '4335.88'],
      ['02/10/2026', 'Phone bill', '45.00', '', '4290.88'],
    ];

    it('maps money out and money in to two columns, and no single amount', () => {
      const guess = guessColumns(
        ['Date', 'Description', 'Money out', 'Money in', 'Balance'],
        rows,
        DOT,
      );

      expect(guess.amountMode).toBe('split');
      expect(guess.fields.debit).toEqual({ column: 'Money out', confidence: 'sure' });
      expect(guess.fields.credit).toEqual({ column: 'Money in', confidence: 'sure' });
      expect(guess.fields.amount.confidence).toBe('missing');
      expect(guess.fields.balance.column).toBe('Balance');
    });

    it('reads Dutch "Bedrag af" / "Bedrag bij" as a pair even though both say "bedrag"', () => {
      const guess = guessColumns(
        ['Datum', 'Omschrijving', 'Bedrag af', 'Bedrag bij', 'Saldo'],
        rows,
        DOT,
      );

      expect(guess.amountMode).toBe('split');
      expect(guess.fields.debit.column).toBe('Bedrag af');
      expect(guess.fields.credit.column).toBe('Bedrag bij');
    });

    it('keeps one signed amount when the export also carries a credit/debet pair', () => {
      expect(guessColumns(KBC_HEADERS, KBC_ROWS, COMMA).amountMode).toBe('single');
    });
  });

  it('marks a doubtful field "check" and names its runner-up', () => {
    const guess = guessColumns(
      ['Datum', 'Omschrijving', 'Mededeling', 'Bedrag'],
      [
        ['30/09/2026', 'Betaling', 'BETALING MET KAART 29/09 COLRUYT GENT', '-84,12'],
        ['01/10/2026', 'Overschrijving', 'OVERSCHRIJVING LOON SEPTEMBER', '3.120,00'],
      ],
      COMMA,
    );

    expect(guess.fields.description).toEqual({
      column: 'Mededeling',
      confidence: 'check',
      runnerUp: 'Omschrijving',
    });
  });

  it('says "missing" for a field no column fits', () => {
    const guess = guessColumns(
      ['Omschrijving', 'Bedrag'],
      [
        ['BETALING COLRUYT', '-84,12'],
        ['LOON SEPTEMBER', '3.120,00'],
      ],
      COMMA,
    );

    expect(guess.fields.date).toEqual({ column: null, confidence: 'missing' });
    expect(guess.fields.ownIban).toEqual({ column: null, confidence: 'missing' });
    expect(guess.fields.balance).toEqual({ column: null, confidence: 'missing' });
  });

  it('never gives a header its name if the values under it contradict it', () => {
    const guess = guessColumns(
      ['Datum', 'Bedrag', 'Omschrijving'],
      [
        ['BETALING COLRUYT', '30/09/2026', '-84,12'],
        ['LOON SEPTEMBER', '01/10/2026', '3.120,00'],
      ],
      COMMA,
    );

    expect(guess.fields.date.column).toBe('Bedrag');
    expect(guess.fields.amount.column).toBe('Omschrijving');
  });
});

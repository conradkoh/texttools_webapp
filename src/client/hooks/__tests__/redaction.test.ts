import { describe, it, expect } from 'vitest';
import { redactEntities, redactPatterns, Entity } from '../usePipeline';

const NAME: Entity = { entity_group: 'PER', score: 0.99, word: 'John Smith', start: 0, end: 10 };
const ORG: Entity = { entity_group: 'ORG', score: 0.98, word: 'Bank of America', start: 0, end: 15 };
const LOC: Entity = { entity_group: 'LOC', score: 0.97, word: 'New York', start: 0, end: 8 };
const MISC: Entity = { entity_group: 'MISC', score: 0.95, word: 'Tesla', start: 0, end: 5 };
const NAME_FIRST: Entity = { entity_group: 'PER', score: 0.99, word: 'John', start: 0, end: 4 };
const NAME_LAST: Entity = { entity_group: 'PER', score: 0.97, word: 'Smith', start: 5, end: 10 };

describe('redactEntities', () => {
  it('redacts a person name in a bank statement header', () => {
    const input = 'Account Holder: John Smith';
    const entities: Entity[] = [{ ...NAME, start: 16, end: 26 }];
    const { output, redactions } = redactEntities(input, entities);
    expect(output).toBe('Account Holder: [PERSON]');
    expect(redactions).toHaveLength(1);
    expect(redactions[0]).toEqual({ original: 'John Smith', replacement: '[PERSON]' });
  });

  it('redacts a bank name in a transaction line', () => {
    const input = 'Payment to Bank of America - $500.00';
    const entities: Entity[] = [{ ...ORG, start: 11, end: 26 }];
    const { output } = redactEntities(input, entities);
    expect(output).toBe('Payment to [ORGANIZATION] - $500.00');
  });

  it('redacts a location in a branch address', () => {
    const input = 'Branch: New York, NY 10001';
    const entities: Entity[] = [{ ...LOC, start: 8, end: 16 }];
    const { output } = redactEntities(input, entities);
    expect(output).toBe('Branch: [LOCATION], NY 10001');
  });

  it('redacts a company name in a direct debit', () => {
    const input = 'Direct Debit: Tesla Inc - $199.99';
    const entities: Entity[] = [
      { ...MISC, entity_group: 'ORG', word: 'Tesla Inc', start: 14, end: 23 },
    ];
    const { output } = redactEntities(input, entities);
    expect(output).toBe('Direct Debit: [ORGANIZATION] - $199.99');
  });

  it('handles multiple redactions in a single statement', () => {
    const input = 'John Smith paid $1,200.00 to Bank of America in New York';
    const entities: Entity[] = [
      { ...NAME_FIRST, word: 'John', start: 0, end: 4 },
      { ...NAME_LAST, word: 'Smith', start: 5, end: 10 },
      { ...ORG, word: 'Bank of America', start: 29, end: 44 },
      { ...LOC, word: 'New York', start: 48, end: 56 },
    ];
    const { output, redactions } = redactEntities(input, entities);
    expect(output).toContain('[PERSON]');
    expect(output).toContain('[ORGANIZATION]');
    expect(output).toContain('[LOCATION]');
    expect(redactions).toHaveLength(4);
  });

  it('handles overlapping entity spans (first+last name)', () => {
    const input = 'Signed: John Smith';
    const entities: Entity[] = [
      { ...NAME_FIRST, start: 8, end: 12 },
      { ...NAME_LAST, start: 13, end: 18 },
    ];
    const { output, redactions } = redactEntities(input, entities);
    expect(output).toBe('Signed: [PERSON] [PERSON]');
    expect(redactions).toHaveLength(2);
  });

  it('returns input unchanged when no entities found', () => {
    const input = 'Statement Date: 2024-03-15\nTotal: $5,432.10';
    const { output, redactions } = redactEntities(input, []);
    expect(output).toBe(input);
    expect(redactions).toHaveLength(0);
  });

  it('deduplicates repeated entity spans', () => {
    const input = 'Jane Doe, Jane Doe';
    const entities: Entity[] = [
      { entity_group: 'PER', score: 0.99, word: 'Jane Doe', start: 0, end: 8 },
      { entity_group: 'PER', score: 0.99, word: 'Jane Doe', start: 10, end: 18 },
    ];
    const { output, redactions } = redactEntities(input, entities);
    expect(output).toBe('[PERSON], [PERSON]');
    expect(redactions).toHaveLength(2);
  });
});

describe('Singaporean / pinyin name redaction', () => {
  it('redacts a full Chinese pinyin name "Lee Kuan Yew"', () => {
    const input = 'Account Holder: Lee Kuan Yew';
    const entities: Entity[] = [
      { entity_group: 'PER', score: 0.99, word: 'Lee Kuan Yew', start: 16, end: 29 },
    ];
    const { output } = redactEntities(input, entities);
    expect(output).toBe('Account Holder: [PERSON]');
  });

  it('redacts individual pinyin tokens when model splits "Tan Hock Seng"', () => {
    const input = 'Signed: Tan Hock Seng';
    const entities: Entity[] = [
      { entity_group: 'PER', score: 0.99, word: 'Tan', start: 8, end: 11 },
      { entity_group: 'PER', score: 0.97, word: 'Hock', start: 12, end: 16 },
      { entity_group: 'PER', score: 0.98, word: 'Seng', start: 17, end: 21 },
    ];
    const { output } = redactEntities(input, entities);
    expect(output).toBe('Signed: [PERSON] [PERSON] [PERSON]');
  });

  it('redacts dialect-origin name "Lim Ah Seng"', () => {
    const input = 'Account Holder: Lim Ah Seng';
    const entities: Entity[] = [
      { entity_group: 'PER', score: 0.98, word: 'Lim Ah Seng', start: 16, end: 27 },
    ];
    const { output } = redactEntities(input, entities);
    expect(output).toBe('Account Holder: [PERSON]');
  });

  it('redacts short surname "Ong" in a bank statement', () => {
    const input = 'Account Holder: Ong Bee Leng';
    const entities: Entity[] = [
      { entity_group: 'PER', score: 0.98, word: 'Ong Bee Leng', start: 16, end: 28 },
    ];
    const { output } = redactEntities(input, entities);
    expect(output).toBe('Account Holder: [PERSON]');
  });

  it('redacts short two-letter surname "Ng"', () => {
    const input = 'Account Holder: Ng Wei Ming';
    const entities: Entity[] = [
      { entity_group: 'PER', score: 0.99, word: 'Ng', start: 16, end: 18 },
      { entity_group: 'PER', score: 0.97, word: 'Wei Ming', start: 19, end: 27 },
    ];
    const { output } = redactEntities(input, entities);
    expect(output).toBe('Account Holder: [PERSON] [PERSON]');
  });

  it('redacts Malay name "Muhammad bin Abdullah" as full entity', () => {
    const input = 'Account Holder: Muhammad bin Abdullah';
    const entities: Entity[] = [
      { entity_group: 'PER', score: 0.98, word: 'Muhammad bin Abdullah', start: 16, end: 38 },
    ];
    const { output } = redactEntities(input, entities);
    expect(output).toBe('Account Holder: [PERSON]');
  });

  it('redacts Malay name with "binti"', () => {
    const input = 'Account Holder: Siti binti Hassan';
    const entities: Entity[] = [
      { entity_group: 'PER', score: 0.98, word: 'Siti', start: 16, end: 20 },
      { entity_group: 'PER', score: 0.95, word: 'binti Hassan', start: 21, end: 33 },
    ];
    const { output } = redactEntities(input, entities);
    expect(output).toBe('Account Holder: [PERSON] [PERSON]');
  });

  it('redacts Indian name with "s/o" pattern', () => {
    const input = 'Account Holder: Rajesh s/o Kumar';
    const entities: Entity[] = [
      { entity_group: 'PER', score: 0.98, word: 'Rajesh', start: 16, end: 22 },
      { entity_group: 'PER', score: 0.96, word: 's/o Kumar', start: 23, end: 32 },
    ];
    const { output } = redactEntities(input, entities);
    expect(output).toBe('Account Holder: [PERSON] [PERSON]');
  });

  it('redacts Indian name with "d/o" pattern', () => {
    const input = 'Account Holder: Priya d/o Muthu';
    const entities: Entity[] = [
      { entity_group: 'PER', score: 0.99, word: 'Priya', start: 16, end: 21 },
      { entity_group: 'PER', score: 0.97, word: 'd/o Muthu', start: 22, end: 31 },
    ];
    const { output } = redactEntities(input, entities);
    expect(output).toBe('Account Holder: [PERSON] [PERSON]');
  });

  it('handles a mixed Singapore name set in a realistic statement', () => {
    const input = [
      'Bank Statement - DBS Bank',
      'Account Holder: Tan Hock Seng',
      'Account #: 9876543210',
      'Branch: Raffles Place, Singapore',
      '',
      'Transactions:',
      '01/03/2024 Salary - Ong Construction Pte Ltd $4,500.00',
      '01/05/2024 Transfer to Lim Mei Ling $500.00',
      '01/07/2024 GIRO - Singtel $89.90',
    ].join('\n');

    const entities: Entity[] = [
      { entity_group: 'ORG', score: 0.98, word: 'DBS Bank', start: 20, end: 28 },
      { entity_group: 'PER', score: 0.99, word: 'Tan', start: 48, end: 51 },
      { entity_group: 'PER', score: 0.97, word: 'Hock', start: 52, end: 56 },
      { entity_group: 'PER', score: 0.98, word: 'Seng', start: 57, end: 61 },
      { entity_group: 'LOC', score: 0.96, word: 'Raffles Place', start: 80, end: 93 },
      { entity_group: 'LOC', score: 0.98, word: 'Singapore', start: 95, end: 104 },
      { entity_group: 'ORG', score: 0.97, word: 'Ong Construction Pte Ltd', start: 173, end: 197 },
      { entity_group: 'PER', score: 0.99, word: 'Lim Mei Ling', start: 223, end: 235 },
      { entity_group: 'ORG', score: 0.95, word: 'Singtel', start: 252, end: 259 },
    ];

    const { output } = redactEntities(input, entities);

    expect(output).not.toContain('Tan Hock Seng');
    expect(output).not.toContain('Lim Mei Ling');
    expect(output).not.toContain('Raffles Place');
    expect(output).not.toContain('DBS Bank');
    expect(output).not.toContain('Singtel');
    expect(output).not.toContain('Ong Construction Pte Ltd');

    expect(output).toContain('9876543210');
    expect(output).toContain('$4,500.00');
    expect(output).toContain('$500.00');
    expect(output).toContain('$89.90');
    expect(output).not.toContain('Singapore');

    expect(output).toMatch(/\[PERSON\]/g);
    expect(output).toMatch(/\[ORGANIZATION\]/g);
    expect(output).toMatch(/\[LOCATION\]/g);
  });

  it('does NOT redact Singapore NRIC', () => {
    const text = 'NRIC: S9812345A';
    const { output, redactions } = redactEntities(text, []);
    expect(output).toBe(text);
    expect(redactions).toHaveLength(0);
  });

  it('does NOT redact Singapore FIN', () => {
    const text = 'FIN: G1234567L';
    const { output, redactions } = redactEntities(text, []);
    expect(output).toBe(text);
    expect(redactions).toHaveLength(0);
  });

  it('does NOT redact postal code', () => {
    const text = 'Postal: 048581';
    const { output, redactions } = redactEntities(text, []);
    expect(output).toBe(text);
    expect(redactions).toHaveLength(0);
  });

  it('does NOT redact unit number', () => {
    const text = 'Address: 10 Anson Road #25-08';
    const { output, redactions } = redactEntities(text, []);
    expect(output).toBe(text);
    expect(redactions).toHaveLength(0);
  });
});

describe('Citibank Singapore credit card statement', () => {
  it('redacts the bank name, account holder name, and branch location from a real statement extract', () => {
    const input = [
      'Citibank Singapore Ltd',
      'Robinson Road P. O. Box 355 S(900705)',
      'Page 1 of 6',
      '',
      'Statement Date          April 15, 2026',
      '(5889375W)        000320J/AA    Credit Limit            $38,700.00',
      'WEE SIEW KAW JASON, CHO            Current Balance         $317.83',
      '116 Hougang Ave 1, #11-227',
      'SG 889375                      Total Minimum Payment   $50.00',
      'Payment Due Date        May 11, 2026',
    ].join('\n');

    const entities: Entity[] = [
      { entity_group: 'ORG', score: 0.98, word: 'Citibank Singapore Ltd', start: 0, end: 22 },
      { entity_group: 'LOC', score: 0.97, word: 'Robinson Road', start: 23, end: 36 },
      { entity_group: 'PER', score: 0.99, word: 'WEE SIEW KAW JASON', start: 181, end: 199 },
    ];

    const { output, redactions } = redactEntities(input, entities);

    expect(redactions).toHaveLength(3);
    expect(output).not.toContain('Citibank Singapore Ltd');
    expect(output).not.toContain('Robinson Road');
    expect(output).not.toContain('WEE SIEW KAW JASON');

    expect(output).toContain('CHO');
    expect(output).toContain('(5889375W)');
    expect(output).toContain('000320J/AA');
    expect(output).toContain('$38,700.00');
    expect(output).toContain('$317.83');
    expect(output).toContain('$50.00');
    expect(output).toContain('116 Hougang Ave 1, #11-227');
    expect(output).toContain('SG 889375');
    expect(output).toContain('April 15, 2026');
    expect(output).toContain('May 11, 2026');

    expect(output).toMatch(/\[ORGANIZATION\]/);
    expect(output).toMatch(/\[LOCATION\]/);
    expect(output).toMatch(/\[PERSON\]/);
  });
});

describe('bank statement NER gaps (what bert-base-NER misses)', () => {
  const gapCases = [
    { label: 'account number', text: 'Account #: 1234567890' },
    { label: 'routing number', text: 'Routing: 021000021' },
    { label: 'SSN', text: 'SSN: 123-45-6789' },
    { label: 'credit card', text: 'Card: 4111-1111-1111-1111' },
    { label: 'dollar amount', text: 'Deposit: $1,500.00' },
    { label: 'date', text: 'Statement Period: 01/15/2024 - 02/15/2024' },
    { label: 'phone number', text: 'Contact: (555) 123-4567' },
    { label: 'email', text: 'Email: jane.doe@bank.com' },
    { label: 'street address', text: '123 Main St, Apt 4B' },
    { label: 'ZIP code', text: 'ZIP: 10001-2345' },
  ];

  for (const c of gapCases) {
    it(`does NOT redact ${c.label}: "${c.text}"`, () => {
      const { output, redactions } = redactEntities(c.text, []);
      expect(output).toBe(c.text);
      expect(redactions).toHaveLength(0);
    });
  }

  it('documents all gaps in a realistic bank statement extract', () => {
    const statement = [
      'Bank Statement',
      'Account Holder: Jane Doe',
      'Account #: 9876543210',
      'Routing: 021000021',
      'SSN: 123-45-6789',
      'Branch: New York, NY',
      '',
      'Transactions:',
      '01/15/2024 Direct Deposit - Bank of America $2,500.00',
      '01/16/2024 ATM Withdrawal - Chase $200.00',
      '01/17/2024 Payment to Tesla Inc $599.99',
      '01/18/2024 Transfer to John Smith $150.00',
      '',
      'Contact: (555) 123-4567 or support@bank.com',
      '123 Business Ave, Suite 500',
    ].join('\n');

    const entities: Entity[] = [
      { entity_group: 'PER', score: 0.99, word: 'Jane Doe', start: 16, end: 24 },
      { entity_group: 'PER', score: 0.99, word: 'John Smith', start: 275, end: 285 },
      { entity_group: 'LOC', score: 0.97, word: 'New York', start: 92, end: 100 },
      { entity_group: 'ORG', score: 0.98, word: 'Bank of America', start: 201, end: 216 },
      { entity_group: 'ORG', score: 0.97, word: 'Chase', start: 244, end: 249 },
      { entity_group: 'MISC', score: 0.95, word: 'Tesla Inc', start: 274, end: 283 },
    ];

    const { output, redactions } = redactEntities(statement, entities);

    expect(redactions.length).toBeGreaterThanOrEqual(5);

    expect(output).not.toContain('Jane Doe');
    expect(output).not.toContain('John Smith');
    expect(output).not.toContain('New York');
    expect(output).not.toContain('Bank of America');
    expect(output).not.toContain('Chase');
    expect(output).not.toContain('Tesla Inc');

    expect(output).toContain('9876543210');
    expect(output).toContain('021000021');
    expect(output).toContain('123-45-6789');
    expect(output).toContain('$2,500.00');
    expect(output).toContain('(555) 123-4567');
    expect(output).toContain('support@bank.com');
    expect(output).toContain('123 Business Ave');

    expect(output).toMatch(/\[PERSON\]/);
    expect(output).toMatch(/\[ORGANIZATION\]/);
    expect(output).toMatch(/\[LOCATION\]/);
  });
});

describe('redactPatterns', () => {
  it('redacts NRIC: S9812345A', () => {
    const { output, matches } = redactPatterns('NRIC: S9812345A');
    expect(output).toBe('NRIC: [NRIC]');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toEqual({ label: 'NRIC', value: 'S9812345A' });
  });

  it('redacts FIN: G1234567L', () => {
    const { output, matches } = redactPatterns('FIN: G1234567L');
    expect(output).toBe('FIN: [NRIC]');
    expect(matches).toHaveLength(1);
  });

  it('redacts SSN: 123-45-6789', () => {
    const { output } = redactPatterns('SSN: 123-45-6789');
    expect(output).toBe('SSN: [SSN]');
  });

  it('redacts credit card: 4111-1111-1111-1111', () => {
    const { output } = redactPatterns('Card: 4111-1111-1111-1111');
    expect(output).toBe('Card: [CREDIT_CARD]');
  });

  it('redacts credit card with spaces: 4111 1111 1111 1111', () => {
    const { output } = redactPatterns('Card: 4111 1111 1111 1111');
    expect(output).toBe('Card: [CREDIT_CARD]');
  });

  it('redacts account number: 1234567890', () => {
    const { output } = redactPatterns('Account: 1234567890');
    expect(output).toBe('Account: [ACCOUNT]');
  });

  it('redacts phone: (555) 123-4567', () => {
    const { output } = redactPatterns('Phone: (555) 123-4567');
    expect(output).toContain('[PHONE]');
  });

  it('redacts phone: 555-123-4567', () => {
    const { output } = redactPatterns('Phone: 555-123-4567');
    expect(output).toBe('Phone: [PHONE]');
  });

  it('redacts phone: 555.123.4567', () => {
    const { output } = redactPatterns('Phone: 555.123.4567');
    expect(output).toBe('Phone: [PHONE]');
  });

  it('redacts email: jane.doe@bank.com', () => {
    const { output } = redactPatterns('Email: jane.doe@bank.com');
    expect(output).toBe('Email: [EMAIL]');
  });

  it('redacts URL', () => {
    const { output } = redactPatterns('Visit https://example.com/page for details');
    expect(output).toBe('Visit [URL] for details');
  });

  it('redacts multiple patterns in one line', () => {
    const input = 'User S9812345A email jane@test.com phone 555-123-4567';
    const { output, matches } = redactPatterns(input);
    expect(output).toContain('[NRIC]');
    expect(output).toContain('[EMAIL]');
    expect(output).toContain('[PHONE]');
    expect(matches).toHaveLength(3);
  });

  it('leaves non-sensitive text unchanged', () => {
    const input = 'Hello world, this is a normal sentence.';
    const { output, matches } = redactPatterns(input);
    expect(output).toBe(input);
    expect(matches).toHaveLength(0);
  });

  it('does NOT redact short numbers like 12345', () => {
    const input = 'Reference: 12345';
    const { output, matches } = redactPatterns(input);
    expect(output).toBe(input);
    expect(matches).toHaveLength(0);
  });
});

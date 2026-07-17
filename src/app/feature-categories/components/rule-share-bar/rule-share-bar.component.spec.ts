import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CategoriesRepository, RulesRepository } from '@/core/data-access';
import { RuleShareBarComponent } from './rule-share-bar.component';

describe('RuleShareBarComponent', () => {
  let fixture: ComponentFixture<RuleShareBarComponent>;
  const rulesRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(1),
  };
  const categoriesRepository = {
    getAll: vi.fn().mockResolvedValue([]),
    add: vi.fn().mockResolvedValue(99),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    rulesRepository.getAll.mockResolvedValue([]);
    rulesRepository.add.mockResolvedValue(1);
    categoriesRepository.getAll.mockResolvedValue([]);
    categoriesRepository.add.mockResolvedValue(99);

    await TestBed.configureTestingModule({
      imports: [RuleShareBarComponent],
      providers: [
        { provide: RulesRepository, useValue: rulesRepository },
        { provide: CategoriesRepository, useValue: categoriesRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RuleShareBarComponent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('surfaces a readable error for a file that is not valid JSON', async () => {
    const file = new File(['not json'], 'rules.json', { type: 'application/json' });
    const input = { files: [file], value: 'rules.json' } as unknown as HTMLInputElement;

    await fixture.componentInstance['onFileSelected']({ target: input } as unknown as Event);

    expect(fixture.componentInstance['shareError']()).toMatch(/not a valid Money Mosaic/);
    expect(fixture.componentInstance['importSummary']()).toBeNull();
  });

  it('imports a well-formed rules file and reports the added count', async () => {
    const file = new File(
      [
        JSON.stringify({
          schemaVersion: 1,
          exportedAt: '2026-07-16T00:00:00.000Z',
          rules: [
            {
              name: 'Shared rule',
              priority: 10,
              enabled: true,
              continueOnMatch: false,
              conditionMatch: 'all',
              conditions: [{ field: 'description', operator: 'contains', value: 'carrefour' }],
              action: { setCategoryName: 'Groceries' },
            },
          ],
        }),
      ],
      'rules.json',
      { type: 'application/json' },
    );
    const input = { files: [file], value: 'rules.json' } as unknown as HTMLInputElement;

    await fixture.componentInstance['onFileSelected']({ target: input } as unknown as Event);

    expect(fixture.componentInstance['importSummary']()).toMatchObject({ added: 1, skipped: [] });
    expect(fixture.componentInstance['shareError']()).toBeNull();
  });
});

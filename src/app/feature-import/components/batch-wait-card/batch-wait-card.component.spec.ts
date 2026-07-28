import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { BatchWaitCardComponent } from './batch-wait-card.component';

describe('BatchWaitCardComponent', () => {
  let fixture: ComponentFixture<BatchWaitCardComponent>;

  const setup = async (fileName: string, mismatchMessage: string | null = null): Promise<void> => {
    await TestBed.configureTestingModule({ imports: [BatchWaitCardComponent] }).compileComponents();
    fixture = TestBed.createComponent(BatchWaitCardComponent);
    fixture.componentRef.setInput('fileName', fileName);
    fixture.componentRef.setInput('mismatchMessage', mismatchMessage);
    fixture.detectChanges();
  };

  it('shows the waiting copy and the file name when there is no mismatch message', async () => {
    await setup('a.csv');

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Using the batch mapping');
    expect(text).toContain('a.csv');
  });

  it('shows the mismatch message instead of the waiting copy when one is set', async () => {
    await setup('b.csv', 'Expected column "Bedrag" not found in b.csv.');

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Expected column "Bedrag" not found in b.csv.');
    expect(text).not.toContain('Using the batch mapping');
    expect(text).toContain('b.csv');
  });

  it('emits mapIndividually when the button is clicked', async () => {
    await setup('a.csv');
    const emitted = vi.fn();
    fixture.componentInstance.mapIndividually.subscribe(emitted);

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(emitted).toHaveBeenCalledTimes(1);
  });
});

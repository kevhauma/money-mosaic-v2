import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AccountBalanceBlockComponent,
  type AccountBalanceBlockSize,
} from './account-balance-block.component';

describe('AccountBalanceBlockComponent', () => {
  let fixture: ComponentFixture<AccountBalanceBlockComponent>;

  const setup = async (
    inputs: Partial<{
      dataReady: boolean;
      balance: number;
      hasShare: boolean;
      shareDisplay: number;
      size: AccountBalanceBlockSize;
    }> = {},
  ): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [AccountBalanceBlockComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(AccountBalanceBlockComponent);
    fixture.componentRef.setInput('balance', inputs.balance ?? 100);
    fixture.componentRef.setInput('dataReady', inputs.dataReady ?? true);
    fixture.componentRef.setInput('hasShare', inputs.hasShare ?? false);
    fixture.componentRef.setInput('shareDisplay', inputs.shareDisplay ?? 0);
    fixture.componentRef.setInput('size', inputs.size ?? 'md');
    fixture.detectChanges();
  };

  it('shows a skeleton placeholder instead of the balance while data is not ready', async () => {
    await setup({ dataReady: false });

    expect(fixture.nativeElement.querySelector('.skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('p')).toBeNull();
  });

  it('renders the balance once data is ready', async () => {
    await setup({ balance: 1234.5 });

    expect(fixture.nativeElement.querySelector('.skeleton')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('1');
  });

  it("colors a negative balance with money's own loss token, not the alert palette", async () => {
    await setup({ balance: -50 });

    // Was `p.text-error` (TICKET-UI-27): in both default themes `--color-error` sat five hue degrees
    // from the brand `--color-primary`, so the alert palette was not a safe place for money to read
    // its colours from. `.mm-money-negative` resolves this theme's own `--mm-money-negative`.
    expect(fixture.nativeElement.querySelector('p.mm-money-negative')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('p.text-error')).toBeNull();
  });

  it('leaves a non-negative balance uncolored', async () => {
    await setup({ balance: 50 });

    expect(fixture.nativeElement.querySelector('p.mm-money-negative')).toBeNull();
  });

  it('hides the "Your share" line when hasShare is false', async () => {
    await setup({ hasShare: false });

    expect(fixture.nativeElement.textContent).not.toContain('Your share');
  });

  it('shows the "Your share" line when hasShare is true', async () => {
    await setup({ hasShare: true, shareDisplay: 250 });

    expect(fixture.nativeElement.textContent).toContain('Your share');
  });

  it('renders the card-sized (md) skeleton by default', async () => {
    await setup({ dataReady: false });

    expect(fixture.nativeElement.querySelector('.skeleton.h-8.w-24')).not.toBeNull();
  });

  it('renders the detail-sized (lg) skeleton', async () => {
    await setup({ dataReady: false, size: 'lg' });

    expect(fixture.nativeElement.querySelector('.skeleton.h-10.w-32')).not.toBeNull();
  });

  it('renders the detail-sized (lg) balance typography', async () => {
    await setup({ size: 'lg' });

    expect(fixture.nativeElement.querySelector('p.text-4xl.font-semibold')).not.toBeNull();
  });
});

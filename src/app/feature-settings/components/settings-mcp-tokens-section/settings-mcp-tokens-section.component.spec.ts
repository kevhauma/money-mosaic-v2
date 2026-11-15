import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { vi } from 'vitest';
import { AuthApiService, type ApiToken } from '@/core/auth';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { SettingsMcpTokensSectionComponent } from './settings-mcp-tokens-section.component';

const LAPTOP: ApiToken = { id: 1, name: 'Laptop', createdAt: '2026-11-01T10:00:00.000Z' };

describe('SettingsMcpTokensSectionComponent: own MCP tokens', () => {
  withCleanFormatSettings();

  const api = { listTokens: vi.fn(), createToken: vi.fn(), revokeToken: vi.fn() };
  let fixture: ComponentFixture<SettingsMcpTokensSectionComponent>;

  const page = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const settle = async (): Promise<void> => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  const rowNames = (): string[] =>
    Array.from(page().querySelectorAll('tbody tr td:first-child')).map((td) =>
      td.textContent!.trim(),
    );
  const buttonNamed = (label: string): HTMLButtonElement =>
    Array.from(page().querySelectorAll('button')).find((button) =>
      button.textContent!.includes(label),
    )!;

  beforeEach(async () => {
    vi.clearAllMocks();
    api.listTokens.mockResolvedValue([LAPTOP]);
    await TestBed.configureTestingModule({
      imports: [SettingsMcpTokensSectionComponent],
      providers: [{ provide: AuthApiService, useValue: api }],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsMcpTokensSectionComponent);
    fixture.detectChanges();
    await settle();
  });

  it('lists the caller’s tokens with their creation date', () => {
    expect(rowNames()).toEqual(['Laptop']);
    expect(page().textContent).toContain('01/11/2026');
  });

  it('shows the token only after creating it, with the connect command, and lists it', async () => {
    expect(page().textContent).not.toContain('mm_secret');
    api.createToken.mockResolvedValue({
      id: 2,
      name: 'Desktop',
      createdAt: '2026-11-15T10:00:00.000Z',
      token: 'mm_secret',
    });

    const input = page().querySelector<HTMLInputElement>('input[type="text"]')!;
    input.value = 'Desktop';
    input.dispatchEvent(new Event('input'));
    page().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();

    expect(api.createToken).toHaveBeenCalledExactlyOnceWith('Desktop');
    expect(page().textContent).toContain('mm_secret');
    expect(page().textContent).toContain('/mcp --header "Authorization: Bearer mm_secret"');
    expect(rowNames()).toEqual(['Laptop', 'Desktop']);
  });

  it('does not create a token without a name', async () => {
    page().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();

    expect(api.createToken).not.toHaveBeenCalled();
  });

  it('revokes only after the confirmation, then drops the row', async () => {
    api.revokeToken.mockResolvedValue(undefined);

    buttonNamed('Revoke').click();
    await settle();
    expect(api.revokeToken).not.toHaveBeenCalled();

    buttonNamed('Revoke token').click();
    await settle();

    expect(api.revokeToken).toHaveBeenCalledExactlyOnceWith(1);
    expect(rowNames()).toEqual([]);
    expect(page().textContent).toContain('You have no tokens yet.');
  });
});

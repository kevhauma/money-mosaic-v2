import { TestBed } from '@angular/core/testing';
import { callApi, withApiTesting } from './api-client.testing';
import { DEFAULT_TRANSFER_SETTINGS } from './seed-data';
import { TransferSettingsRepository } from './transfer-settings.repository';

describe('TransferSettingsRepository', () => {
  withApiTesting();

  const repository = (): TransferSettingsRepository => TestBed.inject(TransferSettingsRepository);

  /**
   * A singleton nobody has written answers `{}` — keys *absent*, not present-and-`undefined`. The
   * stores here derive their signal members from the seed object's keys, so the response is spread
   * over the `DEFAULT_*` rather than handed through.
   */
  it('get falls back to the defaults for a row nobody has written', async () => {
    expect(
      await callApi(
        () => repository().get(),
        { method: 'GET', url: '/api/settings/transferSettings' },
        {},
      ),
    ).toEqual(DEFAULT_TRANSFER_SETTINGS);
  });

  it('get layers the stored row over the defaults', async () => {
    const settings = await callApi(
      () => repository().get(),
      { method: 'GET', url: '/api/settings/transferSettings' },
      { autoLinkMediumConfidence: false },
    );

    expect(settings).toEqual({ ...DEFAULT_TRANSFER_SETTINGS, autoLinkMediumConfidence: false });
  });

  it('update patches the singleton and resolves to the number of rows changed', async () => {
    expect(
      await callApi(
        () => repository().update({ autoLinkMediumConfidence: true }),
        {
          method: 'PATCH',
          url: '/api/settings/transferSettings',
          body: { autoLinkMediumConfidence: true },
        },
        DEFAULT_TRANSFER_SETTINGS,
      ),
    ).toBe(1);
  });
});

import { TestBed } from '@angular/core/testing';
import { callApi, withApiTesting } from './api-client.testing';
import { DashboardLayoutSettingsRepository } from './dashboard-layout-settings.repository';
import { DEFAULT_DASHBOARD_LAYOUT_SETTINGS } from './seed-data';

const PATH = '/api/settings/dashboardLayoutSettings';

describe('DashboardLayoutSettingsRepository', () => {
  withApiTesting();

  const repository = (): DashboardLayoutSettingsRepository =>
    TestBed.inject(DashboardLayoutSettingsRepository);

  it('get falls back to the defaults for a row nobody has written', async () => {
    expect(await callApi(() => repository().get(), { method: 'GET', url: PATH }, {})).toEqual(
      DEFAULT_DASHBOARD_LAYOUT_SETTINGS,
    );
  });

  it('get layers the stored row over the defaults', async () => {
    expect(
      await callApi(
        () => repository().get(),
        { method: 'GET', url: PATH },
        { hiddenRowIds: ['stats'] },
      ),
    ).toEqual({ ...DEFAULT_DASHBOARD_LAYOUT_SETTINGS, hiddenRowIds: ['stats'] });
  });

  // One field per request: the merge that used to happen here (read, spread, put) is the server's
  // now, so writing one of the row's two independent fields cannot clobber the other.
  it('setRowOrder patches only the order', async () => {
    expect(
      await callApi(
        () => repository().setRowOrder(['stats']),
        { method: 'PATCH', url: PATH, body: { rowOrder: ['stats'] } },
        DEFAULT_DASHBOARD_LAYOUT_SETTINGS,
      ),
    ).toBe(1);
  });

  it('setHiddenRowIds patches only the hidden rows', async () => {
    expect(
      await callApi(
        () => repository().setHiddenRowIds(['stats']),
        { method: 'PATCH', url: PATH, body: { hiddenRowIds: ['stats'] } },
        DEFAULT_DASHBOARD_LAYOUT_SETTINGS,
      ),
    ).toBe(1);
  });
});

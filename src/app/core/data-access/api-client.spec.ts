import { HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiClient } from './api-client';
import { withApiTesting } from './api-client.testing';

describe('ApiClient', () => {
  withApiTesting();

  const client = (): ApiClient => TestBed.inject(ApiClient);
  const http = (): HttpTestingController => TestBed.inject(HttpTestingController);

  it('puts every call under the /api prefix the interceptor recognises', async () => {
    const settled = client().get<number[]>('/accounts');
    http().expectOne('/api/accounts').flush([1]);

    expect(await settled).toEqual([1]);
  });

  /**
   * The whole reason this class exists rather than seventeen copies of `firstValueFrom`: a failure
   * response is a **rejection carrying the server's own sentence**, never a resolved `undefined`
   * that a store would then patch into its state.
   */
  it.each([400, 404, 409, 500])(
    'rejects a %s with the message the server chose',
    async (status) => {
      const settled = client().get('/accounts');
      http()
        .expectOne('/api/accounts')
        .flush({ error: 'Something the user can act on' }, { status, statusText: 'Error' });

      await expect(settled).rejects.toThrow('Something the user can act on');
    },
  );

  it('falls back to a message of its own when the failure carries no body', async () => {
    const settled = client().get('/accounts');
    http().expectOne('/api/accounts').error(new ProgressEvent('network error'));

    await expect(settled).rejects.toThrow(Error);
  });

  it('getOptional reads a coded 404 as "no such row" rather than a failure', async () => {
    const settled = client().getOptional('/importBatches/9');
    http()
      .expectOne('/api/importBatches/9')
      .flush(
        { error: 'Not found', code: 'row_not_found' },
        { status: 404, statusText: 'Not Found' },
      );

    expect(await settled).toBeUndefined();
  });

  it('getOptional still rejects on a 404 that is a missing *route*, not a missing row', async () => {
    // Same status and same JSON shape as the case above — `notFoundHandler` answers it for a path
    // matching no route. Read as absence, a mistyped URL would mean "there is no such batch" for as
    // long as it took somebody to wonder why a saved thing never came back.
    const settled = client().getOptional('/importBatches/9');
    http()
      .expectOne('/api/importBatches/9')
      .flush(
        { error: 'No route for GET /api/importBatches/9' },
        { status: 404, statusText: 'Not Found' },
      );

    await expect(settled).rejects.toThrow('No route for GET /api/importBatches/9');
  });

  it('getOptional still rejects on any other status', async () => {
    const settled = client().getOptional('/importBatches/9');
    http()
      .expectOne('/api/importBatches/9')
      .flush({ error: 'Internal server error' }, { status: 500, statusText: 'Error' });

    await expect(settled).rejects.toThrow('Internal server error');
  });

  /**
   * `table.update(id, { field: undefined })` deleted the property in Dexie, and several callers rely
   * on it to *clear* a setting. `JSON.stringify` drops an `undefined` value instead, so the patch
   * would name no field and change nothing — hence the conversion, one level or many deep.
   */
  it('sends a field set to undefined as null, at any depth', async () => {
    void client().patch('/transactions/bulk', [
      { id: 1, changes: { categoryId: undefined, categoryManual: false } },
    ]);

    const request = http().expectOne('/api/transactions/bulk');
    expect(request.request.body).toEqual([
      { id: 1, changes: { categoryId: null, categoryManual: false } },
    ]);
    request.flush({ updated: 1 });
  });

  it('resolves a 204 as undefined rather than null', async () => {
    const settled = client().delete('/accounts/1');
    http().expectOne('/api/accounts/1').flush(null, { status: 204, statusText: 'No Content' });

    expect(await settled).toBeUndefined();
  });
});

import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { serverStatusInterceptor } from './server-status.interceptor';
import { ServerStatusService } from './server-status.service';

/**
 * The two rules this interceptor exists for (TICKET-SRV-06): what counts as an outage, and how
 * many times a request may be sent without anyone asking.
 */
describe('serverStatusInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let status: ServerStatusService;

  /** The shape `HttpClient` reports a connection that never opened as: no status, no body. */
  const TRANSPORT_FAILURE = { status: 0, statusText: 'Unknown Error' };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([serverStatusInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    status = TestBed.inject(ServerStatusService);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('starts out having asked nothing', () => {
    expect(status.reachability()).toBe('checking');
    expect(status.isUnreachable()).toBe(false);
  });

  it('counts any answer as the server being reachable', async () => {
    const settled = firstValueFrom(http.get('/api/accounts'));
    httpMock.expectOne('/api/accounts').flush([]);
    await settled;

    expect(status.reachability()).toBe('reachable');
  });

  it('does not flip to unreachable on a 4xx or a 5xx — those are answers', async () => {
    for (const [index, httpStatus] of [404, 409, 500].entries()) {
      const url = `/api/accounts/${index}`;
      const settled = firstValueFrom(http.get(url)).catch(() => undefined);
      httpMock.expectOne(url).flush({ error: 'no' }, { status: httpStatus, statusText: 'Error' });
      await settled;

      expect(status.reachability()).toBe('reachable');
      expect(status.isUnreachable()).toBe(false);
    }
  });

  it('flips to unreachable when nothing answers at all', async () => {
    const settled = firstValueFrom(http.get('/api/accounts')).catch(() => undefined);

    // Twice, because the automatic retry below is part of this one failure rather than a second.
    httpMock.expectOne('/api/accounts').flush(null, TRANSPORT_FAILURE);
    await Promise.resolve();
    httpMock.expectOne('/api/accounts').flush(null, TRANSPORT_FAILURE);
    await settled;

    expect(status.reachability()).toBe('unreachable');
    expect(status.isUnreachable()).toBe(true);
  });

  it('retries a failed read exactly once, and no more', async () => {
    const settled = firstValueFrom(http.get('/api/transactions')).catch(() => undefined);

    httpMock.expectOne('/api/transactions').flush(null, TRANSPORT_FAILURE);
    await Promise.resolve();
    httpMock.expectOne('/api/transactions').flush(null, TRANSPORT_FAILURE);
    await settled;

    // `verify()` in `afterEach` is what proves there is no third: an extra attempt would be an
    // outstanding request the test never accounted for.
    httpMock.verify();
  });

  it('gives up after one retry rather than looping against a stopped server', async () => {
    const settled = firstValueFrom(http.get('/api/transactions')).catch((error: unknown) => error);

    httpMock.expectOne('/api/transactions').flush(null, TRANSPORT_FAILURE);
    await Promise.resolve();
    httpMock.expectOne('/api/transactions').flush(null, TRANSPORT_FAILURE);

    expect(await settled).toBeDefined();
  });

  it('recovers when the retry succeeds, without the caller ever seeing a failure', async () => {
    const settled = firstValueFrom(http.get<number[]>('/api/transactions'));

    httpMock.expectOne('/api/transactions').flush(null, TRANSPORT_FAILURE);
    await Promise.resolve();
    httpMock.expectOne('/api/transactions').flush([1, 2]);

    expect(await settled).toEqual([1, 2]);
    expect(status.reachability()).toBe('reachable');
  });

  it('does not retry a write: a transport failure is no evidence the write did not land', async () => {
    const settled = firstValueFrom(http.post('/api/transactions', { amount: 1 })).catch(
      () => undefined,
    );

    httpMock.expectOne('/api/transactions').flush(null, TRANSPORT_FAILURE);
    await settled;

    expect(status.reachability()).toBe('unreachable');
  });

  it('leaves a non-API request alone', async () => {
    const settled = firstValueFrom(http.get('/assets/guide.json')).catch(() => undefined);
    httpMock.expectOne('/assets/guide.json').flush(null, TRANSPORT_FAILURE);
    await settled;

    expect(status.reachability()).toBe('checking');
  });
});

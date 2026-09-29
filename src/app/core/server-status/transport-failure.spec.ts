import { HttpErrorResponse } from '@angular/common/http';
import {
  isTransportFailure,
  SERVER_UNREACHABLE_MESSAGE,
  ServerUnreachableError,
} from './transport-failure';

describe('isTransportFailure: an outage is not an answer (TICKET-SRV-06)', () => {
  it('recognises a connection that never opened, whichever tier reports it', () => {
    expect(isTransportFailure(new HttpErrorResponse({ status: 0 }))).toBe(true);
    expect(isTransportFailure(new ServerUnreachableError())).toBe(true);
  });

  it('treats every real status as an answer, including the ones that look catastrophic', () => {
    for (const status of [400, 401, 403, 404, 409, 500, 503]) {
      expect(isTransportFailure(new HttpErrorResponse({ status }))).toBe(false);
    }
  });

  it('is false for anything that is not an HTTP failure at all', () => {
    expect(isTransportFailure(new Error('boom'))).toBe(false);
    expect(isTransportFailure(undefined)).toBe(false);
    expect(isTransportFailure('0')).toBe(false);
  });

  it('carries a sentence a user can read, not the status-0 noise HttpClient produces', () => {
    expect(new ServerUnreachableError().message).toBe(SERVER_UNREACHABLE_MESSAGE);
  });
});

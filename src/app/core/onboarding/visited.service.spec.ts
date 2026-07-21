import { VisitedService } from './visited.service';

const HAS_VISITED_KEY = 'mm-has-visited';

describe('VisitedService', () => {
  afterEach(() => {
    localStorage.removeItem(HAS_VISITED_KEY);
  });

  it('reports not visited when nothing is stored', () => {
    const service = new VisitedService();

    expect(service.hasVisited()).toBe(false);
  });

  it('markVisited() persists the flag', () => {
    const service = new VisitedService();

    service.markVisited();

    expect(service.hasVisited()).toBe(true);
    expect(localStorage.getItem(HAS_VISITED_KEY)).toBe('true');
  });

  it('a fresh instance still reads the persisted flag', () => {
    new VisitedService().markVisited();

    expect(new VisitedService().hasVisited()).toBe(true);
  });
});

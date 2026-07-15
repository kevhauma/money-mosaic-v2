import { createConfirmState } from './confirm-state';

type Widget = { id: number; name: string };

describe('createConfirmState', () => {
  it('starts closed with nothing pending', () => {
    const state = createConfirmState<Widget>();

    expect(state.open()).toBe(false);
    expect(state.pending()).toBeNull();
  });

  it('request sets the pending entity and opens', () => {
    const state = createConfirmState<Widget>();
    const widget: Widget = { id: 1, name: 'Gadget' };

    state.request(widget);

    expect(state.pending()).toBe(widget);
    expect(state.open()).toBe(true);
  });

  it('confirm returns the pending entity and closes', () => {
    const state = createConfirmState<Widget>();
    const widget: Widget = { id: 1, name: 'Gadget' };
    state.request(widget);

    const result = state.confirm();

    expect(result).toBe(widget);
    expect(state.open()).toBe(false);
  });

  it('cancel closes without returning the entity', () => {
    const state = createConfirmState<Widget>();
    state.request({ id: 1, name: 'Gadget' });

    state.cancel();

    expect(state.open()).toBe(false);
  });
});

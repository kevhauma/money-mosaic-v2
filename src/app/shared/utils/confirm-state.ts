import { signal, type Signal, type WritableSignal } from '@angular/core';

export type ConfirmState<T> = {
  pending: Signal<T | null>;
  open: WritableSignal<boolean>;
  request: (entity: T) => void;
  confirm: () => T | null;
  cancel: () => void;
};

/**
 * Signal-based "which entity is pending deletion + confirm-dialog open state" scaffolding,
 * generic over the entity type. Pair `open` with `[(open)]` on `mm-confirm-dialog`.
 */
export function createConfirmState<T>(): ConfirmState<T> {
  const pending = signal<T | null>(null);
  const open = signal(false);

  const request = (entity: T): void => {
    pending.set(entity);
    open.set(true);
  };

  const confirm = (): T | null => {
    const target = pending();
    open.set(false);
    return target;
  };

  const cancel = (): void => {
    open.set(false);
  };

  return { pending, open, request, confirm, cancel };
}

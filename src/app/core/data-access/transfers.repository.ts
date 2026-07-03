import { Injectable } from '@angular/core';
import { appDb, type Transfer } from './app-db';

@Injectable({ providedIn: 'root' })
export class TransfersRepository {
  getAll = (): Promise<Transfer[]> => appDb.transfers.toArray();

  getByIds = async (ids: number[]): Promise<Transfer[]> =>
    (await appDb.transfers.bulkGet(ids)).filter(
      (transfer): transfer is Transfer => transfer != null,
    );

  add = (transfer: Transfer): Promise<number> => appDb.transfers.add(transfer);

  remove = (id: number): Promise<void> => appDb.transfers.delete(id);
}

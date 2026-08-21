import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { LoansRepository } from '@/core/data-access';
import { LOANS_ROUTES } from './loans.routes';

describe('LOANS_ROUTES (TICKET-LOAN-02)', () => {
  it('resolves the overview at /loans via lazy loadChildren', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'loans', children: LOANS_ROUTES }]),
        { provide: LoansRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      ],
    });

    expect(await TestBed.inject(Router).navigateByUrl('/loans')).toBe(true);
  });
});

describe('LOANS_ROUTES: detail route (TICKET-LOAN-06)', () => {
  it('resolves the detail page at /loans/:id via lazy loadComponent', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'loans', children: LOANS_ROUTES }]),
        { provide: LoansRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      ],
    });

    expect(await TestBed.inject(Router).navigateByUrl('/loans/1')).toBe(true);
  });
});

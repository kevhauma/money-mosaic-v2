import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router, TitleStrategy, type Routes } from '@angular/router';
import { AppTitleStrategy } from './app-title.strategy';

@Component({
  selector: 'app-title-strategy-host',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class HostComponent {}

/**
 * A local route table rather than the shipped one: this spec is about what the strategy does with a
 * title, and the real table's routes each pull a lazy feature chunk in to answer it (see
 * `app.routes.spec.ts`, which navigates the real URLs and carries a 30s timeout for exactly that).
 */
const ROUTES: Routes = [
  { path: 'titled', title: 'Transactions', component: HostComponent },
  { path: 'untitled', component: HostComponent },
  {
    path: 'resolved/:name',
    // Mirrors `HELP_ROUTES`' `guideTitle`: it resolves the name it finds, and resolves to nothing
    // when there is no such page.
    title: (route) => {
      const name = route.paramMap.get('name');
      return name === 'unknown' ? '' : (name ?? '');
    },
    component: HostComponent,
  },
  {
    path: 'parent',
    title: 'Income',
    children: [{ path: 'child', title: 'Salary details', component: HostComponent }],
  },
];

describe('AppTitleStrategy: document title', () => {
  const navigate = async (url: string): Promise<string> => {
    TestBed.configureTestingModule({
      providers: [provideRouter(ROUTES), { provide: TitleStrategy, useClass: AppTitleStrategy }],
    });
    await TestBed.inject(Router).navigateByUrl(url);
    return TestBed.inject(Title).getTitle();
  };

  it('names the page first and keeps the brand after it', async () => {
    await expect(navigate('/titled')).resolves.toBe('Transactions · Money Mosaic');
  });

  it('falls back to the bare brand on a route that names no page, with no dangling separator', async () => {
    // The public landing page is the real instance of this: it is the app's front door rather than
    // a page inside it, so "Home · Money Mosaic" would be naming something the user never sees
    // called that.
    await expect(navigate('/untitled')).resolves.toBe('Money Mosaic');
  });

  it('uses a resolved title where the page name is not a constant', async () => {
    await expect(navigate('/resolved/Linking%20transfers')).resolves.toBe(
      'Linking transfers · Money Mosaic',
    );
  });

  it('drops back to the brand when a resolver finds nothing to name', async () => {
    // `/help/:slug` with an unknown slug: the page renders its "guide not found" empty state, so a
    // title would be claiming a page that isn't there.
    await expect(navigate('/resolved/unknown')).resolves.toBe('Money Mosaic');
  });

  it('takes the deepest route that names itself, not the section above it', async () => {
    await expect(navigate('/parent/child')).resolves.toBe('Salary details · Money Mosaic');
  });
});

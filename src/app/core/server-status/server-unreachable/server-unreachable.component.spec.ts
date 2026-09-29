import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { ServerUnreachableComponent } from './server-unreachable.component';

describe('ServerUnreachableComponent', () => {
  let fixture: ComponentFixture<ServerUnreachableComponent>;

  const text = (): string => (fixture.nativeElement as HTMLElement).textContent ?? '';

  const retryButton = (): HTMLButtonElement =>
    (fixture.nativeElement as HTMLElement).querySelector('button')!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServerUnreachableComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ServerUnreachableComponent);
    fixture.detectChanges();
  });

  it('names both things that are actually wrong, and the address it is asking for', () => {
    expect(text()).toContain("Can't reach the server");
    expect(text()).toContain('may not be running');
    expect(text()).toContain('address may have changed');
    // Absolute, so it can be compared against the server somebody thinks they are running.
    expect(text()).toContain(new URL('/api', document.baseURI).href);
  });

  it('says nothing about previous tries on the first one', () => {
    expect(text()).not.toContain('Still no answer');
  });

  it('reports that Retry did not help, rather than looking like it did nothing', () => {
    fixture.componentRef.setInput('attempt', 3);
    fixture.detectChanges();

    expect(text()).toContain('Still no answer after 3 tries');
  });

  it('asks its host to retry, and shows the attempt as pending until it is torn down', () => {
    const asked: number[] = [];
    fixture.componentInstance.retry.subscribe(() => asked.push(1));

    retryButton().click();
    fixture.detectChanges();

    expect(asked).toHaveLength(1);
    expect(retryButton().disabled).toBe(true);
    expect(text()).toContain('Retrying');
  });
});

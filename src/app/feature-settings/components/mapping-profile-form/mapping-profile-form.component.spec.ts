import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DEFAULT_MAPPING_PROFILE_TEMPLATES, type MappingProfile } from '@/core/data-access';
import { provideFakeApi } from '@/core/data-access/fake-api.testing';
import { MappingProfileFormComponent } from './mapping-profile-form.component';

const KBC: MappingProfile = { ...DEFAULT_MAPPING_PROFILE_TEMPLATES[0], id: 1 };

describe('MappingProfileFormComponent', () => {
  let component: MappingProfileFormComponent;
  let fixture: ComponentFixture<MappingProfileFormComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [MappingProfileFormComponent],
      providers: [...provideFakeApi()],
    });
    fixture = TestBed.createComponent(MappingProfileFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('profile', KBC);
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  /** The form is `protected`; a spec reaching in is the established way to drive it here. */
  const form = (): MappingProfileFormComponent['form'] =>
    (component as unknown as { form: MappingProfileFormComponent['form'] }).form;

  const submit = (): Partial<MappingProfile> | undefined => {
    let emitted: Partial<MappingProfile> | undefined;
    component.saved.subscribe((value) => (emitted = value));
    (component as unknown as { submit: () => void }).submit();
    fixture.detectChanges();
    return emitted;
  };

  const errors = (): string[] =>
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('mm-label')).map(
      (label) => label.textContent?.trim() ?? '',
    );

  it('loads the profile and saves it back unchanged', () => {
    expect(submit()).toEqual({
      name: KBC.name,
      bankPreset: KBC.bankPreset,
      delimiter: KBC.delimiter,
      decimalSeparator: KBC.decimalSeparator,
      dateFormat: KBC.dateFormat,
      encoding: KBC.encoding,
      headerRows: KBC.headerRows,
      signConvention: KBC.signConvention,
      columns: KBC.columns,
      defaultAccountId: undefined,
      headerSignature: KBC.headerSignature,
    });
  });

  it('sends cleared optional fields as undefined, so the server clears them', () => {
    form().patchValue({ bankPreset: ' ', headerSignature: '\n ', defaultAccountId: '' });

    expect(submit()).toMatchObject({
      bankPreset: undefined,
      headerSignature: undefined,
      defaultAccountId: undefined,
    });
  });

  it('reads one header per line and the default account as a number', () => {
    form().patchValue({ headerSignature: ' Datum \n\nBedrag', defaultAccountId: '4' });

    expect(submit()).toMatchObject({ headerSignature: ['Datum', 'Bedrag'], defaultAccountId: 4 });
  });

  it('blocks saving without a name, and says so next to the field', () => {
    form().patchValue({ name: '   ' });

    expect(submit()).toBeUndefined();
    expect(errors()).toContain('Give the mapping a name.');
  });

  it('blocks saving without a date or description column', () => {
    form().controls.columns.patchValue({ date: '', description: ' ' });

    expect(submit()).toBeUndefined();
    expect(errors().filter((error) => error === 'Name the column this comes from.')).toHaveLength(
      2,
    );
  });

  it('blocks saving with neither an amount nor a debit/credit column', () => {
    form().controls.columns.patchValue({ amount: '', debit: '', credit: '' });

    expect(submit()).toBeUndefined();
    expect(errors()).toContain('Name an amount column, or a money out and/or money in column.');
  });

  it('accepts a debit column alone in place of an amount column', () => {
    form().controls.columns.patchValue({ amount: '', debit: 'Uit' });

    expect(submit()?.columns).toMatchObject({ debit: 'Uit' });
  });

  it.each([-1, 1.5, null])('blocks saving with %s header rows', (headerRows) => {
    form().patchValue({ headerRows });

    expect(submit()).toBeUndefined();
    expect(errors()).toContain('Enter a whole number, 0 or more.');
  });

  it('accepts 0 header rows', () => {
    form().patchValue({ headerRows: 0 });

    expect(submit()?.headerRows).toBe(0);
  });

  it('warns that the header signature decides what auto-detects', () => {
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Changing the header signature changes which files this mapping auto-detects.',
    );
  });
});

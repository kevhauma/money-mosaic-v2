import { COLUMN_FIELD_DEFS, type ColumnMappingFormValue } from './column-mapping';
import { MAPPER_STEPS, stepStatus, type MapperStepDef } from './mapper-steps';

const emptyValue = (): ColumnMappingFormValue => {
  const value = { headerRows: 1 } as ColumnMappingFormValue;
  for (const field of COLUMN_FIELD_DEFS) value[field.key] = '';
  return value;
};

const stepById = (id: MapperStepDef['id']): MapperStepDef =>
  MAPPER_STEPS.find((step) => step.id === id)!;

describe('stepStatus', () => {
  it('marks a required step incomplete while its control is empty', () => {
    expect(stepStatus(stepById('date'), emptyValue())).toBe('incomplete');
  });

  it('marks a required step complete once its control is mapped', () => {
    const value = { ...emptyValue(), date: 'Date' };
    expect(stepStatus(stepById('date'), value)).toBe('complete');
  });

  it('marks an all-optional step empty while nothing is mapped', () => {
    expect(stepStatus(stepById('balance'), emptyValue())).toBe('empty');
  });

  it('marks an all-optional step complete once anything is mapped', () => {
    const value = { ...emptyValue(), balance: 'Amount' };
    expect(stepStatus(stepById('balance'), value)).toBe('complete');
  });

  it('marks a multi-control step complete only once every required control in it is mapped', () => {
    const description = stepById('description');
    expect(stepStatus(description, emptyValue())).toBe('incomplete');
    expect(stepStatus(description, { ...emptyValue(), description: 'Desc' })).toBe('complete');
  });

  it('mirrors invalidFieldLabels for the summary step', () => {
    expect(stepStatus(stepById('summary'), emptyValue())).toBe('incomplete');
    const value = { ...emptyValue(), date: 'Date', description: 'Desc' };
    expect(stepStatus(stepById('summary'), value)).toBe('complete');
  });
});

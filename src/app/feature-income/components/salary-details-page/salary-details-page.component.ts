import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ButtonComponent,
  PageHeaderComponent,
  PaperComponent,
  TypographyComponent,
} from '@/shared/ui';
import { SalaryMetadataTableComponent } from '../salary-metadata-table/salary-metadata-table.component';

/**
 * The salary-metadata editor as its own route (`/income/salary`, TICKET-INC-18) rather than the
 * modal it used to open in — with room above the table for the explanation the modal's one-paragraph
 * blurb had to compress, and reachable by link, reload and the back button like anything else.
 *
 * This page answers "let me fill in the last three years". The *other* salary surface — the
 * one-month modal a click on the trend chart opens — answers "what was June?", which is a question
 * best answered without leaving the chart. Two shapes, two surfaces, one write path.
 */
@Component({
  selector: 'app-salary-details-page',
  imports: [
    ButtonComponent,
    PageHeaderComponent,
    PaperComponent,
    SalaryMetadataTableComponent,
    TypographyComponent,
  ],
  templateUrl: './salary-details-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalaryDetailsPageComponent {}

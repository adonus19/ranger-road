import { Component } from '@angular/core';
import { getChapterOneWeekContent } from '../../../core/program/chapter-one-daily.seed';

@Component({
  imports: [],
  selector: 'app-field-manual-page',
  styleUrl: './field-manual-page.css',
  templateUrl: './field-manual-page.html',
})
export class FieldManualPage {
  protected readonly weekOneReading = getChapterOneWeekContent(1).reading;
}

import { Component, OnInit, signal, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { StatsService } from '../../../core/services/api.services';
import { YearlyRecapResponse } from '../../../core/models';

@Component({
  selector: 'app-recap',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './recap.component.html',
  styleUrl: './recap.component.scss'
})
export class RecapComponent implements OnInit {
  private statsSvc = inject(StatsService);

  loading      = signal(true);
  recap        = signal<YearlyRecapResponse | null>(null);
  currentYear  = new Date().getFullYear();
  selectedYear = signal(new Date().getFullYear());

  Math = Math;

  ngOnInit() { this.loadRecap(); }

  changeYear(delta: number) {
    const newYear = this.selectedYear() + delta;
    if (newYear > this.currentYear) return;
    this.selectedYear.set(newYear);
    this.loadRecap();
  }

  loadRecap() {
    this.loading.set(true);
    this.recap.set(null);
    this.statsSvc.getRecap(this.selectedYear()).subscribe({
      next: (r: any) => { this.recap.set(r.data); this.loading.set(false); },
      error: ()      => this.loading.set(false)
    });
  }
}

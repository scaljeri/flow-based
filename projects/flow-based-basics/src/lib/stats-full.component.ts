import { Component, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FbNoDragDirective, FbSliderComponent } from '@scaljeri/flow-based';
import { GoogleCharts } from 'google-charts';
import { StatsDistribution } from './stats.worker';
import { GoogleChart } from './google-charts.types';
import { StatsView } from './stats-view';

/**
 * The whole surface: the numbers, and the distribution with room to read it.
 *
 * The chart redraws per update to whatever size the container has, so it fills
 * a phone and a desktop alike without a fixed 500px anywhere.
 */
@Component({
  standalone: true,
  imports: [FbNoDragDirective, FbSliderComponent, FormsModule],
  selector: 'fb-stats-full',
  template: `
    <header>
      <span class="stat"><span class="label">min</span> {{min}}</span>
      <span class="stat"><span class="label">max</span> {{max}}</span>
      <span class="stat"><span class="label">avg</span> {{avg}}</span>
      <button fbNoDrag (click)="onReset()">Reset</button>
    </header>

    <div #distribution class="chart"></div>

    <fb-slider label="Column width" class="column-width"
               [min]="0" [max]="10" step="0.1"
               [(ngModel)]="worker.columnWidth"></fb-slider>
  `,
  styles: [`
    :host {
      box-sizing: border-box;
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 13px system-ui, sans-serif;
      gap: 8px;
      height: 100%;
      padding: 10px 12px;
      width: 100%;
    }

    header {
      align-items: center;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .stat .label {
      opacity: 0.6;
    }

    button {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      margin-left: auto;
      padding: 4px 12px;
    }

    .chart {
      background: #fff;
      border-radius: 8px;
      flex: 1;
      min-height: 0;
    }

    .column-width {
      grid-template-columns: 90px 1fr 4ch;
    }
  `]
})
export class StatsFullComponent extends StatsView {
  private chart: GoogleChart | null = null;

  // Removed while the panel re-renders, so undefined is a real state here.
  private placeholder?: ElementRef;

  @ViewChild('distribution')
  set graph(element: ElementRef | undefined) {
    this.placeholder = element;
    this.chart = null;
  }

  protected override onData(data: StatsDistribution): void {
    if (!this.placeholder) {
      return;
    }

    /*
     * The library, when this node needs it — bootstrap no longer waits for
     * Google on behalf of every page load. `load` is idempotent and calls back
     * immediately once the script is there, so the common case is one extra
     * function call and the first case is one round trip paid by the node that
     * wants it.
     */
    if (!GoogleCharts.api) {
      GoogleCharts.load(() => this.onData(data));

      return;
    }

    const dataTable = new GoogleCharts.api.visualization.DataTable();

    dataTable.addColumn('number', 'Value');
    dataTable.addColumn('number', 'Count');
    dataTable.addColumn('number', 'Gauss');

    const width = this.worker.columnWidth;
    let count = 0;

    while ((count - 1) * width < data.end) {
      dataTable.addRow([data.start + count++ * width + width / 2, data.values[count], data.gauss ? data.gauss[count] : null]);
    }

    const view = new GoogleCharts.api.visualization.DataView(dataTable);

    const chart = this.chart ?? new GoogleCharts.api.visualization.ColumnChart(this.placeholder.nativeElement);

    this.chart = chart;
    chart.draw(view, { legend: 'top', series: { 1: { type: 'line' } } });
  }
}

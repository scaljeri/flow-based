import { Directive, ElementRef, ViewChild } from '@angular/core';
import { GoogleCharts } from 'google-charts';
import { GoogleChart, GoogleChartDataTable } from '../../app.models';
import { BasicGraphView } from './basic-graph-view';

const GRAPH_OPTIONS = {
  legend: 'bottom',
  title: 'Data',
  curveType: 'function',
};

/**
 * The line chart, drawn to whatever size the hosting view gives it.
 *
 * Normal and full share every line of this and differ only in host CSS, which
 * is exactly the difference between those two views.
 */
@Directive()
export abstract class BasicGraphChart extends BasicGraphView {
  @ViewChild('graph') graph!: ElementRef;

  private chart: GoogleChart | null = null;
  private dataTable: GoogleChartDataTable | null = null;
  private startIndex = 0;

  protected override onValues(values?: number[]): void {
    if (values) {
      if (this.dataTable && values.length === this.dataTable.getNumberOfRows()) {
        this.startIndex++;
      }

      const dataTable: GoogleChartDataTable = new GoogleCharts.api.visualization.DataTable();

      this.dataTable = dataTable;
      dataTable.addColumn('number', 'Count');
      dataTable.addColumn('number', 'Values');
      values.forEach((value, index) => {
        dataTable.addRow([index + this.startIndex, value]);
      });
    }

    // The chart exists once GoogleCharts.load() resolves, which can be after
    // the first value; without the guard this dereferenced null.
    if (this.dataTable && this.chart) {
      this.chart.draw(this.dataTable, GRAPH_OPTIONS);
    }
  }

  override ngOnInit(): void {
    GoogleCharts.load(() => {
      this.chart = new GoogleCharts.api.visualization.LineChart(this.graph.nativeElement);
      this.onValues(this.worker?.values);
    });

    super.ngOnInit();
  }
}

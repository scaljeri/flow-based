import { Component, Host, OnInit } from '@angular/core';
import { NodeService } from '../../../../projects/flow-based/src/lib/node/node-service';
import { FbNodeState } from '../../../../projects/flow-based/src/lib/flow-based';
import { FractalsWorker } from '../../workers/fractals';

@Component({
  selector: 'fb-fractal',
  templateUrl: './fractal.component.html',
  styleUrls: ['./fractal.component.scss']
})
export class FractalComponent implements OnInit {
  private state: FbNodeState;
  private worker: FractalsWorker;
  fractals = [
    {name: 'Mandelbrot', id: 'mandelbrot'},
    {name: 'Koch Snowflake', id: 'snowflake'},
    {name: 'Julia set', id: 'julia'}
  ];

  constructor(@Host() private service: NodeService) {
    this.state = service.state;
    //
    // webWorkerService.run(input => {
    //   const square = num => num * num;
    //   return square(input);
    // }, 10).then(r => {
    //   console.log('done', r);
    // });
  }

  ngOnInit() {
    this.worker = this.service.worker as FractalsWorker;
  }

  isSelected(options: string): boolean {
    return options === this.state.config.selected;
  }

  setSelected(option: string): void {
  }

  get selected(): string {
    return this.state.config.selected;
  }

  set selected(option: string) {
    this.state.config.selected = option;
  }

  onFractalChange(fractal): void {
    this.worker.setFractal(fractal);
  }

  onReset(): void {
    this.worker.reset();
  }
}

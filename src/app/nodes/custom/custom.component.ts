import { AfterViewInit, Component, ElementRef, Host, OnInit, ViewChild } from '@angular/core';
import { NodeService } from '../../../../projects/flow-based/src/lib/node/node-service';
import { CustomWorker } from '../../workers/custom';
import { FbNodeState } from '../../../../projects/flow-based/src/lib/flow-based';

@Component({
  selector: 'fb-custom',
  templateUrl: './custom.component.html',
  styleUrls: ['./custom.component.scss']
})
export class CustomComponent implements OnInit, AfterViewInit {
  private worker: CustomWorker;
  private state: FbNodeState;
  public error: boolean;

  @ViewChild('code') code: ElementRef;

  constructor(@Host() private service: NodeService) {
    this.state = service.state;
  }

  ngOnInit() {
    this.worker = this.service.worker as CustomWorker;
  }

  ngAfterViewInit(): void {
  }

  get func(): string {
    return this.state.config.func;
  }

  set func(str: string) {
    this.state.config.func = str;
    this.error = false;

    try {
      this.worker.compileFunction(str);
    } catch (err) {
      this.error = true;
    }
  }

  get title(): string {
    return this.state.title!;
  }

  get hasRuntimeError(): boolean {
    return !!this.worker.runtimeError;
  }

  get hasCompileError(): boolean {
    return !!this.worker.compileError;
  }

  onKeyDown(): void {
    console.log(this.func);
  }
}

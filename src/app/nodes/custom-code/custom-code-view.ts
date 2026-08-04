import { ChangeDetectorRef, Directive, OnInit, inject } from '@angular/core';
import { FbNodeState, NodeService } from '@scaljeri/flow-based';
import { CustomCodeWorker } from '../../workers/custom-code';

/** The worker, the state, and the compile status every drawing reads. */
@Directive()
export abstract class CustomCodeView implements OnInit {
  protected readonly service = inject(NodeService);
  protected readonly cdr = inject(ChangeDetectorRef);

  protected state: FbNodeState = this.service.state;
  protected worker!: CustomCodeWorker;

  ngOnInit(): void {
    this.worker = this.service.worker as CustomCodeWorker;
  }

  get hasCompileError(): boolean {
    return !!this.worker?.compileError;
  }

  get hasRuntimeError(): boolean {
    return !!this.worker?.runtimeError;
  }
}

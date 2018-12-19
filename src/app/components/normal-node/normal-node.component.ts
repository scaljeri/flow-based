import { ChangeDetectorRef, Component, EventEmitter, HostBinding, OnInit, Output } from '@angular/core';
import { NodeService } from '../../../../projects/flow-based/src/lib/node/node-service';
import { XxlFlowUnitState } from '../../../../projects/flow-based/src/lib/flow-based';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'fb-normal-node',
  templateUrl: './normal-node.component.html',
  styleUrls: ['./normal-node.component.scss']
})
export class NormalNodeComponent implements OnInit {
  private state: XxlFlowUnitState;
  private lastClicked;


  @Output() edit = new EventEmitter<boolean>();

  @HostBinding('class.is-fullscreen') isFullscreen = false;
  @HostBinding('class.is-active') isActive = false;

  constructor(private cdr: ChangeDetectorRef,
              private service: NodeService) {
    this.state = service.state;
  }

  ngOnInit() {
    this.service.closeOnDoubleClick(() => this.onClose());

    this.service.closeOnBlur(() => this.onClose());

    this.service.nodeClicked$.pipe(
      filter(e => !(e.target as HTMLElement).closest('button'))
    ).subscribe((e) => {
      if (this.isActive) {
        this.isActive = Date.now() - (this.lastClicked || 0) < 300 ? false : true;
        this.lastClicked = Date.now();
      } else {
        this.isActive = true;
        this.service.hideLabel();
      }

      this.service.state.config.expanded = this.isActive;
      this.service.calibrate();
    });

    this.isActive = this.service.state.config.expanded;
    if (this.isActive) {
      this.service.hideLabel();
    }
  }

  onDelete(): void {
    this.service.deleteSelf();
  }

  onEdit(): void {
    console.log('gotof');
    this.isFullscreen = true;
    this.service.setMaxSize(true);
    this.edit.emit(true);
  }

  onClose(): void {
    if (this.isFullscreen) {
      this.isFullscreen = false;
      this.service.setMaxSize(false);
      this.edit.emit(true);
    } else {
      this.isActive = false;
      this.service.showLabel();
    }

    this.service.calibrate();
  }

  get title(): string {
    return this.state.title || '';
  }
}

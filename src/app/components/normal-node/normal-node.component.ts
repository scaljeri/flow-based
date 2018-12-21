import { ChangeDetectorRef, Component, EventEmitter, HostBinding, Input, OnInit, Output, SimpleChanges } from '@angular/core';
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

  isEditing = false;

  @Input() fullscreen = false;
  @Input() deleteSocket = false;
  @Output() edit = new EventEmitter<boolean>();
  @Output() maxSize = new EventEmitter<boolean>();
  @Output() active = new EventEmitter<boolean>();

  @HostBinding('class.is-fullscreen') isFullscreen = false;
  @Input() @HostBinding('class.is-active') isActive = false;

  constructor(private cdr: ChangeDetectorRef,
              private service: NodeService) {
    this.state = service.state;
  }

  ngOnInit() {
    this.service.closeOnDoubleClick(() => this.onClose());

    this.service.nodeClicked$.pipe(
      filter(e => !(e.target as HTMLElement).closest('button'))
    ).subscribe((e) => {
      if (this.isActive) {
        this.isActive = Date.now() - (this.lastClicked || 0) < 300 ? false : true;
        this.lastClicked = Date.now();
      } else {
        this.isActive = true;
        this.isFullscreen = this.fullscreen;

        this.maxSize.emit(this.fullscreen);
        this.service.hideLabel();

        if (this.fullscreen) {
          this.service.closeOnBlur(() => this.onClose());
          this.service.setMaxSize(true);
        }

        setTimeout(() => {
          this.active.emit(this.isActive);
        });
      }

      this.service.state.config.expanded = this.isActive;
      this.service.calibrate();

    });

    if (!this.isActive) {
      this.isActive = this.service.state.config.expanded;
    }

    if (this.isActive) {
      this.isFullscreen = this.fullscreen;

      this.maxSize.emit(this.fullscreen);
      this.service.hideLabel();

      if (this.fullscreen) {
        this.service.closeOnBlur(() => this.onClose());
        this.service.setMaxSize(true);
      }

      setTimeout(() => {
        this.active.emit(this.isActive);
      });
    }
  }

  onDelete(): void {
    this.service.deleteSelf();
  }

  onEdit(): void {
    this.isEditing = true;

    this.isFullscreen = true;
    if (!this.fullscreen) {
      this.service.setMaxSize(true);
    }

    this.service.closeOnBlur(() => this.onClose());
    this.edit.emit(true);
  }

  onClose(): void {
    if (this.isEditing) {
      this.isEditing = false;
      this.edit.emit(false);

      if (!this.fullscreen) {
        this.isFullscreen = false;
        this.service.setMaxSize(false);
        this.maxSize.emit(false);
      }
    } else {
      this.service.unregisterAll();
      this.service.state.config.expanded = this.isActive = false;
      this.service.showLabel();
      this.service.setMaxSize(false);
      this.maxSize.emit(false);
    }

    this.cdr.detectChanges();
    this.service.calibrate();
  }

  get title(): string {
    return this.state.title || '';
  }
}

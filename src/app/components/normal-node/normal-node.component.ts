import { ChangeDetectorRef, Component, EventEmitter, HostBinding, Input, OnInit, Output } from '@angular/core';
import { NodeService, FbNodeState } from '@scaljeri/flow-based';
import { filter } from 'rxjs/operators';

@Component({
  standalone: false,
  selector: 'fb-normal-node',
  templateUrl: './normal-node.component.html',
  styleUrls: ['./normal-node.component.scss']
})
export class NormalNodeComponent implements OnInit {
  private state: FbNodeState;
  private lastClicked = 0;


  @Input() fullscreen = false;
  @Input() deleteSocket = false;
  @Input() label = '';
  @Input() @HostBinding('class.is-active') isActive = false;

  @Output() edit = new EventEmitter<boolean>();
  @Output() maxSize = new EventEmitter<boolean>();
  @Output() active = new EventEmitter<boolean>();

  @HostBinding('class.is-fullscreen') isFullscreen = false;

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

  onClose(): void {
    {
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
    return this.label || this.state.title || '';
  }
}

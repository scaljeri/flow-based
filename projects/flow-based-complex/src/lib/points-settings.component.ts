import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { PointsConfig, PointsWorker } from './points.worker';

/**
 * The list itself: how fast the walk goes, and which points it walks.
 *
 * Three fields per row, because a point in this plane IS three things — how
 * far across, how far up, and what to call it. The label is what makes the
 * picture explain itself: a dot at (0, 1) means little, a dot at (0, 1)
 * labelled i means everything.
 */
@Component({
  standalone: true,
  selector: 'fb-math-points-settings',
  template: `
    <div class="field">
      <span class="label">Step every (ms)</span>

      <div class="stepper">
        <button type="button" aria-label="Slower" (click)="nudgeInterval(-1)">−</button>
        <input type="text" inputmode="numeric" autocomplete="off"
               [value]="interval" (change)="typedInterval($event)">
        <button type="button" aria-label="Faster" (click)="nudgeInterval(1)">+</button>
      </div>
    </div>

    <div class="points">
      <div class="heads">
        <span>re</span>
        <span>im</span>
        <span>label</span>
        <span></span>
      </div>

      @for (point of points; track $index) {
        <div class="row" [class.current]="$index === currentIndex">
          <input type="text" inputmode="decimal" autocomplete="off" aria-label="Real part"
                 [value]="point.re" (change)="write($index, 're', $event)">
          <input type="text" inputmode="decimal" autocomplete="off" aria-label="Imaginary part"
                 [value]="point.im" (change)="write($index, 'im', $event)">
          <input type="text" autocomplete="off" aria-label="Label"
                 [value]="point.label ?? ''" (change)="write($index, 'label', $event)">
          <button type="button" class="remove" aria-label="Remove this point"
                  (click)="remove($index)">×</button>
        </div>
      }
    </div>

    <button type="button" class="add" (click)="add()">Add a point</button>
  `,
  styles: [`
    :host {
      color: #fff;
      display: flex;
      flex-direction: column;
      font: 12px system-ui, sans-serif;
      gap: 10px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .label {
      opacity: 0.8;
    }

    .stepper {
      display: flex;
      gap: 6px;
    }

    .stepper button {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      flex: 0 0 38px;
      font-size: 16px;
      min-height: 34px;
    }

    .stepper input {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      flex: 1;
      min-width: 0;
      padding: 6px 8px;
      text-align: center;
    }

    .points {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .heads,
    .row {
      display: grid;
      gap: 4px;
      grid-template-columns: 1fr 1fr 1.4fr 30px;
    }

    .heads {
      opacity: 0.6;
      padding: 0 4px;
    }

    .row input {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      min-width: 0;
      padding: 6px 4px;
      text-align: center;
    }

    /* Which row the walk is on right now, so the panel and the plot agree. */
    .row.current input {
      border-color: rgba(186, 218, 85, 0.8);
    }

    .remove {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      font-size: 14px;
    }

    .add {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      color: #fff;
      cursor: pointer;
      min-height: 32px;
    }
  `]
})
export class PointsSettingsComponent {
  private readonly service = inject(NodeService);
  private readonly cdr = inject(ChangeDetectorRef);

  get worker(): PointsWorker | undefined {
    return this.service.worker as PointsWorker | undefined;
  }

  /*
   * Read through the worker when there is one, straight from config otherwise:
   * a node whose module arrived after the flow briefly has none, and a panel
   * that dereferenced it anyway rendered as nothing at all.
   */
  get points(): { re: number; im: number; label?: string }[] {
    return this.worker?.points ?? (this.service.state.config as PointsConfig)?.points ?? [];
  }

  get interval(): number {
    return this.worker?.interval ?? (this.service.state.config as PointsConfig)?.interval ?? 900;
  }

  get currentIndex(): number {
    const current = this.worker?.current;

    return current ? this.points.indexOf(current) : -1;
  }

  nudgeInterval(direction: 1 | -1): void {
    // Plus makes it FASTER, which is why the step is subtracted: the field
    // holds a delay, and a button labelled + that slows things down lies.
    this.worker?.setInterval(Math.max(30, this.interval - direction * 100));
    this.cdr.detectChanges();
  }

  typedInterval(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value.replace(',', '.'));

    if (Number.isFinite(value)) {
      this.worker?.setInterval(Math.max(30, value));
    }

    this.cdr.detectChanges();
  }

  write(index: number, key: 're' | 'im' | 'label', event: Event): void {
    const raw = (event.target as HTMLInputElement).value;

    if (key === 'label') {
      this.worker?.setPoint(index, { label: raw });
    } else {
      const value = Number(raw.replace(',', '.'));

      if (Number.isFinite(value)) {
        this.worker?.setPoint(index, { [key]: value });
      }
    }

    this.cdr.detectChanges();
  }

  add(): void {
    this.worker?.addPoint();
    this.cdr.detectChanges();
  }

  remove(index: number): void {
    this.worker?.removePoint(index);
    this.cdr.detectChanges();
  }
}

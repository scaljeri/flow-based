import { Component, Input, OnInit } from '@angular/core';
import { FbNodeState } from '@scaljeri/flow-based';

@Component({
  standalone: false,
  selector: 'fb-flow',
  templateUrl: './flow.component.html',
  styleUrls: ['./flow.component.scss'],
  providers: []
})
export class FlowComponent implements OnInit {
  /*
   * FbNodeState, not FbNodeState. FbNodeState extends Partial<FbNodeState>, so its
   * `type` is optional and it is not assignable to FlowBasedComponent's `state`.
   * FbNodeState is the canonical recursive node/flow shape; FbNodeState is a legacy
   * near-duplicate slated for removal (docs/AUDIT.md 3.9).
   */
  @Input() flow!: FbNodeState;

  constructor() { }

  ngOnInit() {}
}

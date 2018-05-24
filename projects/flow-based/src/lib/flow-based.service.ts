import { Injectable } from '@angular/core';

export interface XxlBlock {
  x: number;
  y: number;
  type: string;
  inputs: any[];
  outputs: any[];
  config: any;
}

@Injectable()
export class FlowBasedService {

  constructor() { }

}

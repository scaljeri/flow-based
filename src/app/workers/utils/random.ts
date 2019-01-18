export class Random {
  private m = 0x80000000; // 2**31;
  private a = 1103515245;
  private c = 12345;
  private state: number;

  constructor(private seed) {
    this.reset();
  }

  reset() {
    this.state = this.seed ? this.seed : Math.floor(Math.random() * (this.m - 1));
  }

  nextInt(): number {
    this.state = (this.a * this.state + this.c) % this.m;
    return this.state;
  }

  nextFloat(): number {
    // returns in range [0,1]
    return this.nextInt() / (this.m - 1);
  }

  nextRange(start, end) {
    // returns in range [start, end): including start, excluding end
    // can't modulu nextInt because of weak randomness in lower bits
    const rangeSize = end - start;
    const randomUnder1 = this.nextInt() / this.m;

    return start + Math.floor(randomUnder1 * rangeSize);
  }

  choice(array): number[] {
    return array[this.nextRange(0, array.length)];
  }
}

/* Usage:
var rng = new RNG(20);
for (var i = 0; i < 10; i++)
  console.log(rng.nextRange(10, 50));

var digits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
for (var i = 0; i < 10; i++)
  console.log(rng.choice(digits));
*/

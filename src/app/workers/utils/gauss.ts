/*
   Gaussian distribution: http://mathworld.wolfram.com/NormalDistribution.html

   u: mean
   a: standard deviation
   a^2: variance
 */

export function calcMean(values: number[]): number {
  let count = 0;

  const weighted = values.reduce((sum, val, i) => {
    count += val;
    return sum + i * val;
  }, 0);

  // An empty histogram has no mean; 0 beats NaN spreading into the curve.
  return count === 0 ? 0 : Math.round(weighted / count);
}

export function calcMax(values: number[], mean: number): number {
  let hits = 0,
    index = 0,
    total = 0;

  while (hits < 4 && index < 20) {
    if (values[mean - index]) {
      total += values[mean - index];
      hits++;
    }

    if (values[mean + index]) {
      total += values[mean + index];
      hits++;
    }

    index++;
  }

  return hits === 0 ? 0 : total / hits;
}

export function calcStandardDeviation(mean: number, values: number[]): number {
  let count = 0;

  const weighted = values.reduce((sum, val, i) => {
    count += val;

    return sum + Math.pow(i - mean, 2) * val;
  }, 0);

  return count === 0 ? 0 : Math.sqrt(weighted / count);
}

export function getGaussian(mean: number, sd: number, maxAmpl: number, length: number): number[] {
  /*
   * No 1/(σ√2π) front factor: the curve is rescaled to maxAmpl below, so a
   * constant factor cancels out entirely. Computing it anyway — and from
   * `mean` rather than the σ the formula calls for — meant a mean of zero
   * divided by zero and turned the whole curve into NaN.
   */
  const denominator = 2 * Math.pow(sd, 2);
  const output: number[] = [];
  let max = 0;

  for (let x = 0; x < length; x++) {
    // A zero deviation is a spike: everything at the mean, nothing elsewhere.
    const val = denominator === 0
      ? (x === Math.round(mean) ? 1 : 0)
      : Math.exp(-Math.pow(x - mean, 2) / denominator);

    output.push(val);
    max = Math.max(val, max);
  }

  // A mean far outside the range can leave every bucket at zero; scaling that
  // by 0/0 would be NaN, and a flat zero curve is the honest answer.
  return output.map(val => (max > 0 ? (val / max) * maxAmpl : 0));
}

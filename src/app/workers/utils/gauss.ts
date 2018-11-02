/*
   Gaussian distribution: http://mathworld.wolfram.com/NormalDistribution.html

   u: mean
   a: standard deviation
   a^2: variance
 */

export function calcMean(values: number[]): number {
  let count = 0;

  const index = Math.round(values.reduce((sum, val, i) => {
    count += val;
    return sum + i * val;
  }, 0) / count);

  return index;
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

  return total / hits;
}

export function calcStandardDeviation(mean: number, values: number[]): number {
  let count = 0;

  return Math.sqrt(values.reduce((sum, val, i) => {
    count += val;

    return sum + Math.pow(i - mean, 2) * val;
  }, 0) / count);
}

export function getGaussian(mean: number, sd: number, maxAmpl: number, length: number): number[] {
  const frac = 1 / (mean * Math.sqrt(2 * Math.PI));
  const denominator = 2 * Math.pow(sd, 2);

  let output: number[] = [];
  let max = 0;
  let index = 0;

  for (let x = 0; x < length; x++) {
    const numerator = -Math.pow(x - mean, 2);
    max = Math.max(output[index++] = frac * Math.pow(Math.E, numerator / denominator), max);
  }

  output = output.map(val => val / max * maxAmpl);

  return output;
}

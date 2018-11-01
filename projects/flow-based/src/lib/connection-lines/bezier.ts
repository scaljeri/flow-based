import { XxlPosition } from '../flow-based';

function factorial(n): number {
  return !(n > 1) ? 1 : factorial(n - 1) * n;
}

function round(num: number): number {
  return Math.round(num * 100) / 100;
}

function bezierValue(n: number, u: number, i: number, v: number) {
  return Math.pow(u, i) * Math.pow(1 - u, n - i) * v;
}

function binomialCoefficient(n, i): number {
  return factorial(n) / (factorial(i) * factorial(n - i));
}

export function gradient(point: XxlPosition): number {
  return point.y / point.x;
}

export function normal(u: number, cp: XxlPosition[]): XxlPosition {
  const n = cp.length - 1;
  let x = 0, y = 0;

  cp.forEach((p: XxlPosition, i: number) => {
    const binC = binomialCoefficient(n, i);

    x += binC * bezierValue(n, u, i, p.x);
    y += binC * bezierValue(n, u, i, p.y);
  });

  return { x: round(x), y: round(y) } as XxlPosition;
}

export function derivative(u: number, cp: XxlPosition[]): XxlPosition {
  const n = cp.length - 2;
  let x = 0, y = 0;

  for (let i = 0; i <= n; i++) {
    const QiX = (cp.length - 1) * (cp[i + 1].x - cp[i].x),
      QiY = (cp.length - 1) * (cp[i + 1].y - cp[i].y),
      binC = binomialCoefficient(n, i);

    x += binC * bezierValue(n, u, i, QiX);
    y += binC * bezierValue(n, u, i, QiY);
  }

  return { x: round(x), y: round(y) } as XxlPosition;
}

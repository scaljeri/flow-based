// tslint:disable
export interface Data {
  isAbsolute: boolean;
  points: Point[];
}

export interface Point {
  x: number;
  y: number;
}

export interface Curve {
  points: Point[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export function controlPoints(points: Point[], isAbsolute = true): Data {
  return {
    isAbsolute,
    points: isAbsolute ? points : absolute(points)
  };
}

export function* range(start: number, step = .01, end = start): Iterator<number> {
  if (end < start) {
    for (let i = start; i > end; i -= step) {
      yield i;
    }
  } else {
    for (let i = start; i < end + step; i += step) {
      yield i;
    }
  }
}

// export function curve(impl: (u: number, cp: Point[]) => Point, range: Iterator<number>, controlPoints: Data): Curve {
//   const points: Curve = [];
//   let next, value;
//   let maxX, minX, maxY, minY;
//
//   while ((next = range.next()).done === false) {
//     value = impl(next.value, controlPoints.points);
//
//     maxX = maxX === undefined ? value.x : Math.max(maxX, value.x);
//     minX = minX === undefined ? value.x : Math.min(minX, value.x);
//     maxY = maxY === undefined ? value.y : Math.max(maxY, value.y);
//     minY = minY === undefined ? value.y : Math.min(minY, value.y);
//
//     points.push(value);
//   }
//
//   return {points, minX, maxX, minY, maxY} as Curve;
// }

export function normal(u: number, cp: Point[]): Point {
  const n = cp.length - 1;
  let x = 0, y = 0;

  cp.forEach((p: Point, i: number) => {
    const binC = binomialCoefficient(n, i);

    x += binC * bezierValue(n, u, i, p.x);
    y += binC * bezierValue(n, u, i, p.y);
  });

  return {x: round(x), y: round(y)} as Point;
}

export function gradient(point: Point): number {
  //console.log(point.y + ' ' + point.x + ' --> ' + point.y / point.x);
  return point.y / point.x;
}

export function derivative(u: number, cp: Point[]): Point {
  const n = cp.length - 2;
  let x = 0, y = 0;

  for (let i = 0; i <= n; i++) {
    const QiX = (cp.length - 1) * (cp[i + 1].x - cp[i].x),
      QiY = (cp.length - 1) * (cp[i + 1].y - cp[i].y),
      binC = binomialCoefficient(n, i);

    x += binC * bezierValue(n, u, i, QiX);
    y += binC * bezierValue(n, u, i, QiY);
  }

  return {x: round(x), y: round(y)} as Point;
}

export function svgPath(curve: Point[]): string {
  let d = `M${curve[0].x} ${curve[0].y}`;

  for (let i = 1; i < curve.length; i++) {
    d += ` L${curve[i].x} ${curve[i].y}`;
  }

  return d;
}

export function svgCurve(cps: Data): string {
  let d = cps.points.length === 3 ? 'Q' : 'C';

  if (cps.points.length > 4) {
    throw Error('Svg doesn\t support that many control points');
  }

  for (let i = 1; i < cps.points.length; i++) {
    d += ` ${cps.points[i].x} ${cps.points[i].y}`;
  }

  return `M ${cps.points[0].x} ${cps.points[0].y} ${cps.isAbsolute ? d : d.toLowerCase()}`;
}

export function absolute(cps: Point[]): Point[] {
  const output: Point[] = [];
  const origin: Point = cps[0];

  for (let i = 1; i < cps.length; i++) {
    const p = cps[i];

    output.push({
      x: p.x + origin.x,
      y: p.y + origin.y
    });
  }

  return output;
}

// Helper function ---------------------------------------------------------------------

// The Bezier curve
function binomialCoefficient(n, i): number {
  return factorial(n) / (factorial(i) * factorial(n - i));
}

function bezierValue(n: number, u: number, i: number, v: number) {
  return Math.pow(u, i) * Math.pow(1 - u, n - i) * v;
}

function factorial(n): number {
  return !(n > 1) ? 1 : factorial(n - 1) * n;
}

function round(num: number): number {
  return Math.round(num * 100) / 100;
}

// tslint:enable

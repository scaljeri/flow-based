// https://github.com/JamesRandall/Mandelbrot-Set.git

export class FractalClazz {
  maxIterations: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  width: number;
  height: number;
  pixels: number[];
  xScale: number;
  yScale: number;
  colors: [number[]?] = [];

  constructor({xMin, xMax, yMin, yMax, width, height, maxIterations}) {
    this.xMin = xMin;
    this.xMax = xMax;
    this.yMin = yMin;
    this.yMax = yMax;
    this.width = width;
    this.height = height;
    this.maxIterations = maxIterations;

    for (let i = 0; i <= maxIterations; i++) {
      this.colors[i] = this.getColorHsl(i, maxIterations);
    }

    this.pixels = Array(width * height * 4);
  }

  updatePixel(offset, red, green, blue, alpha = 255): void {
    this.pixels[offset] = red;
    this.pixels[offset + 1] = green;
    this.pixels[offset + 2] = blue;
    this.pixels[offset + 3] = alpha;
  }

  coord2Index(x: number, y: number): number {
    return (y * this.width + x) * 4;
  }

  iterate(zR, zI, cR, cI, iterMax) {
    let iter = 0;
    while (true) {
      iter++;

      if (iter === iterMax) {
        return iter;
      }

      const nR = zR * zR - zI * zI + cR;
      const nI = 2 * zI * zR + cI;

      if (nR > 4 || nI > 4 || nR < -4 || nI < -4) {
        return iter;
      }

      zR = nR;
      zI = nI;
    }
  }

  compute(): ImageData {
    this.xScale = (this.xMax - this.xMin) / this.width;
    this.yScale = (this.yMax - this.yMin) / this.height;

    for (let sx = 0; sx < this.width; sx++) {
      for (let sy = 0; sy < this.height; sy++) {
        const xScaled = sx * this.xScale + this.xMin;
        const yScaled = sy * this.yScale + this.yMin;

        const iteration = this.iterate(0, 0, xScaled, yScaled, this.maxIterations);

        if (iteration === this.maxIterations) {
          this.updatePixel(this.coord2Index(sx, sy), 0, 0, 0);
        } else {
          const colors = this.colors[iteration]!;

          this.updatePixel(this.coord2Index(sx, sy), colors[0], colors[1], colors[2]);
        }
      }
    }

    return new ImageData(Uint8ClampedArray.from(this.pixels), this.width, this.height);
  }

  getColorHsl(iter: number, maxIter: number): number[] {
    const h = iter / maxIter,
      s = 1,
      l = .5;

    let r, g, b, hue2rgb;

    hue2rgb = (a, c, t) => {
      if (t < 0) { t += 1; }
      if (t > 1) { t -= 1; }
      if (t < 1 / 6) { return a + (c - a) * 6 * t; }
      if (t < 1 / 2) { return c; }
      if (t < 2 / 3) { return a + (c - a) * (2 / 3 - t) * 6; }
      return a;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  getColor(iter: number, maxIterations): number[] {
    const ratio = iter / maxIterations;
    let red = 0;
    let green = 0;
    let blue = 0;

    if ((ratio >= 0) && (ratio < 0.125)) {
      red = (ratio / 0.125) * (512) + 0.5;
      green = 0;
      blue = 0;
    }

    if ((ratio >= 0.125) && (ratio < 0.250)) {
      red = 255;
      green = (((ratio - 0.125) / 0.125) * (512) + 0.5);
      blue = 0;
    }

    if ((ratio >= 0.250) && (ratio < 0.375)) {
      red = ((1.0 - ((ratio - 0.250) / 0.125)) * (512) + 0.5);
      green = 255;
      blue = 0;
    }

    if ((ratio >= 0.375) && (ratio < 0.500)) {
      red = 0;
      green = 255;
      blue = (((ratio - 0.375) / 0.125) * (512) + 0.5);
    }

    if ((ratio >= 0.500) && (ratio < 0.625)) {
      red = 0;
      green = ((1.0 - ((ratio - 0.500) / 0.125)) * (512) + 0.5);
      blue = 255;
    }

    if ((ratio >= 0.625) && (ratio < 0.750)) {
      red = (((ratio - 0.625) / 0.125) * (512) + 0.5);
      green = 0;
      blue = 255;
    }

    if ((ratio >= 0.750) && (ratio < 0.875)) {
      red = 255;
      green = (((ratio - 0.750) / 0.125) * (512) + 0.5);
      blue = 255;
    }

    if ((ratio >= 0.875) && (ratio <= 1.000)) {
      red = ((1.0 - ((ratio - 0.875) / 0.125)) * (512) + 0.5);
      green = ((1.0 - ((ratio - 0.875) / 0.125)) * (512) + 0.5);
      blue = ((1.0 - ((ratio - 0.875) / 0.125)) * (512) + 0.5);
    }

    return [this.toInteger(red), this.toInteger(green), this.toInteger(blue)];
  }

  toInteger(num: number): number {
    return Math[num < 0 ? 'ceil' : 'floor'](num);
  }
}



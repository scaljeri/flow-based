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
  cR: number;
  cI: number;

  constructor({x, y, xMin, xMax, yMin, yMax, width, height, maxIterations}) {
    this.cR = x;
    this.cI = y;
    this.xMin = xMin;
    this.xMax = xMax;
    this.yMin = yMin;
    this.yMax = yMax;
    this.width = width;
    this.height = height;
    this.maxIterations = maxIterations;

    this.pixels = Array(width * height * 4);
  }

  updatePixel(offset, red, green, blue): void {
    this.pixels[offset] = red;
    this.pixels[offset + 1] = green;
    this.pixels[offset + 2] = blue;
    this.pixels[offset + 3] = 255;
  }

  coord2Index(x: number, y: number): number {
    return (y * this.width + x) * 4;
  }

  iterate(zR, zI, cR, cI, iterMax) {
    let iter = 0;
    while (true) {
      iter++;

      if (iter > iterMax) {
        return 0;
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
    const realSpan = this.xMax - this.xMin,
      imagSpan = this.yMax - this.yMin;

    let zR, zI;
    for (let i = 0; i < this.width; i++) {
      for (let j = 0; j < this.height; j++) {
        const fx = i / this.width;
        const fy = j / this.height;

        zR = fx * realSpan + this.xMin; // i === xmax: 1 * (xmax - xmin) + xmin
        zI = fy * imagSpan + this.yMin;

        const iter = this.iterate(zR, zI, this.cR, this.cI, this.maxIterations);

        const color = this.getColor(iter, this.maxIterations);
        this.updatePixel(this.coord2Index(i, j), color[0], color[1], color[2]);
      }
    }

    return new ImageData(Uint8ClampedArray.from(this.pixels), this.width, this.height);
  }

  getColor(iter: number, maxIterations: number): number[] {
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



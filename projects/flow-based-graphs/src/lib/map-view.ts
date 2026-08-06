import { AfterViewInit, ChangeDetectorRef, Directive, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import type * as L from 'leaflet';
import { MapGrid, MapLayer, MapWorker } from './map.worker';

/** One colour per layer, matching the plots so a flow reads the same throughout. */
const LAYER_COLOURS = ['#bada55', '#ff4081', '#2aa7a0'];

/**
 * The colour ramp a raster is drawn with: cool and dim for little, hot and
 * bright for much.
 *
 * Sampled rather than interpolated in some colour space, because the stops
 * were chosen to be told apart on a dark basemap — which is a judgement about
 * this map, not a property of a formula.
 */
const RAMP: [number, number, number][] = [
  [ 40,  70, 130],
  [ 40, 150, 160],
  [120, 190, 100],
  [235, 205,  80],
  [230, 130,  50],
  [200,  50,  60],
];

/** Web Mercator's y for a latitude, and back — see drawGrid. */
function mercatorY(lat: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2));
}

function latitudeAt(y: number): number {
  return (2 * Math.atan(Math.exp(y)) - Math.PI / 2) * 180 / Math.PI;
}

/**
 * Places on a map.
 *
 * Another way of looking at a stream, the way the complex plane is another way
 * of looking at a series — and the same rule about layers: one input socket is
 * one drawn set, in the order the node declares its sockets.
 *
 * Leaflet arrives by dynamic import rather than at module load. The Graphs
 * module is already a lazy chunk, but a plot has no business paying for a
 * mapping library, and a flow with no map on it never fetches one.
 */
@Directive()
export abstract class MapView implements OnInit, AfterViewInit, OnDestroy {
  protected readonly service = inject(NodeService);
  protected readonly cdr = inject(ChangeDetectorRef);

  @ViewChild('canvas') canvas?: ElementRef<HTMLElement>;

  worker!: MapWorker;

  private subscription?: Subscription;
  private resizeObserver?: ResizeObserver;
  private leaflet?: typeof L;
  private map?: L.Map;
  private drawn: L.Layer[] = [];
  /** Set once the user moves the map by hand; following stops there. */
  private moved = false;

  /** The open views take the controls; the small one is a picture. */
  protected readonly interactive: boolean = false;

  ngOnInit(): void {
    this.worker = this.service.worker as MapWorker;
    this.subscription = this.worker?.getStream().subscribe(() => this.draw());
  }

  async ngAfterViewInit(): Promise<void> {
    const host = this.canvas?.nativeElement;

    if (!host) {
      return;
    }

    /*
     * The stylesheet travels as text beside the library (see leaflet-css.ts)
     * and is put in the document once. Both imports are dynamic, so a flow
     * with no map on it downloads neither.
     */
    const [module, styles] = await Promise.all([
      import('leaflet'),
      import('./leaflet-css'),
    ]);

    /*
     * Leaflet ships UMD, so the interop wrapper puts the whole library on
     * `default` while the namespace object carries only the types. Calling
     * through the namespace failed with "t.map is not a function", which says
     * nothing at all about why.
     */
    const leaflet = ((module as unknown as { default?: typeof L }).default ?? module) as typeof L;

    this.leaflet = leaflet;
    MapView.adoptStyles(styles.LEAFLET_CSS);

    this.map = leaflet.map(host, {
      attributionControl: true,
      dragging: this.interactive,
      keyboard: this.interactive,
      scrollWheelZoom: this.interactive,
      touchZoom: this.interactive,
      doubleClickZoom: this.interactive,
      zoomControl: this.interactive,
    });

    /*
     * CARTO's dark basemap, not OpenStreetMap's own tiles: node content is
     * drawn for a dark canvas, and a bright map in the middle of this editor
     * is a hole in it. The attribution is not decoration — both parties
     * require it.
     */
    leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.map);

    /*
     * A saved view wins over the default, and fitting the data wins over both
     * — until the reader moves the map, which is the strongest signal of all.
     */
    const saved = this.worker.view;

    this.map.setView(saved ? [saved.lat, saved.lon] : [52.1, 5.3], saved?.zoom ?? 7);
    this.map.on('movestart', () => {
      // Only a gesture counts: fitBounds moves the map too, and treating that
      // as the user taking over would stop following on the first draw.
      if (this.interactive) {
        this.moved = true;
      }
    });

    /*
     * Where the reader leaves the map is where it opens next time. Nobody
     * finds a view by typing a latitude — they find it by moving the map, and
     * having to then press something to keep it is a step that exists only
     * because it was easier to build.
     */
    this.map.on('moveend', () => {
      if (this.interactive && this.moved && this.map) {
        const centre = this.map.getCenter();

        this.worker.setView(centre.lat, centre.lng, this.map.getZoom());
      }
    });

    this.draw();

    if (typeof ResizeObserver !== 'undefined') {
      // Leaflet measures its container once; a node that grows has to say so.
      this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
      this.resizeObserver.observe(host);
    }
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  /**
   * A raster, drawn once into a canvas and laid over the map as an image.
   *
   * Not one rectangle per cell: forty thousand of those crawl, and they would
   * be forty thousand layers for Leaflet to keep. One image is one layer.
   *
   * The rows are resampled through the MERCATOR projection rather than copied
   * straight across. An image overlay is stretched linearly between its two
   * corners, and this map's projection is not linear in latitude — over three
   * degrees of the Netherlands that lands the grid visibly off its own
   * coastline, which is exactly the sort of quiet lie a picture of measured
   * air should not tell.
   */
  private drawGrid(
    leaflet: typeof L,
    map: L.Map,
    grid: MapGrid,
    bounds: [number, number][],
  ): void {
    const numbers = grid.values.filter((value): value is number => typeof value === 'number');

    if (!numbers.length) {
      return;
    }

    const low = this.worker.min ?? Math.min(...numbers);
    const high = this.worker.max ?? Math.max(...numbers);
    const span = high - low || 1;

    /*
     * The bounds published are cell CENTRES, so the drawn rectangle reaches
     * half a cell further in each direction — otherwise the raster sits half
     * a cell up and to the left of where it belongs.
     */
    const halfLat = (grid.latMax - grid.latMin) / (grid.rows - 1) / 2;
    const halfLon = (grid.lonMax - grid.lonMin) / (grid.cols - 1) / 2;
    const south = grid.latMin - halfLat;
    const north = grid.latMax + halfLat;
    const west = grid.lonMin - halfLon;
    const east = grid.lonMax + halfLon;

    const canvas = document.createElement('canvas');
    const height = Math.min(grid.rows, 512);

    canvas.width = grid.cols;
    canvas.height = height;

    const ctx = canvas.getContext('2d')!;
    const image = ctx.createImageData(grid.cols, height);
    const topY = mercatorY(north);
    const bottomY = mercatorY(south);

    for (let y = 0; y < height; y += 1) {
      // Where this image row falls in the projection, and therefore which
      // row of the data belongs on it.
      const latitude = latitudeAt(topY + (bottomY - topY) * ((y + 0.5) / height));
      const fraction = (latitude - south) / (north - south);
      const row = Math.min(grid.rows - 1, Math.max(0,
        Math.round((grid.northUp ? fraction : 1 - fraction) * (grid.rows - 1))));

      for (let x = 0; x < grid.cols; x += 1) {
        const value = grid.values[row * grid.cols + x];
        const target = (y * grid.cols + x) * 4;

        if (typeof value !== 'number') {
          image.data[target + 3] = 0;

          continue;
        }

        const [r, g, b] = this.rampAt((value - low) / span);

        image.data[target] = r;
        image.data[target + 1] = g;
        image.data[target + 2] = b;
        image.data[target + 3] = 255;
      }
    }

    ctx.putImageData(image, 0, 0);

    const overlay = leaflet.imageOverlay(canvas.toDataURL(), [[south, west], [north, east]], {
      opacity: this.worker.opacity,
      // Under the markers and the labels: the raster is the ground a station
      // stands on, not something to bury it under.
      interactive: false,
    }).addTo(map);

    this.drawn.push(overlay);
    bounds.push([south, west], [north, east]);
  }

  /** A colour from the ramp, mixed between its two nearest stops. */
  private rampAt(fraction: number): [number, number, number] {
    const at = Math.min(1, Math.max(0, fraction)) * (RAMP.length - 1);
    const index = Math.min(RAMP.length - 2, Math.floor(at));
    const mix = at - index;
    const from = RAMP[index];
    const to = RAMP[index + 1];

    return [
      Math.round(from[0] + (to[0] - from[0]) * mix),
      Math.round(from[1] + (to[1] - from[1]) * mix),
      Math.round(from[2] + (to[2] - from[2]) * mix),
    ];
  }

  /** Leaflet's stylesheet, added to the page once however many maps there are. */
  private static styleElement?: HTMLStyleElement;

  private static adoptStyles(css: string): void {
    if (MapView.styleElement) {
      return;
    }

    MapView.styleElement = document.createElement('style');
    MapView.styleElement.textContent = `${css}

      /* The node's own additions: a label on a dark map, and no white box. */
      .leaflet-container { background: #10131a; font: 11px system-ui, sans-serif; }
      .leaflet-control-attribution { background: rgba(0, 0, 0, 0.5); color: #bbb; font-size: 9px; }
      .leaflet-control-attribution a { color: #ddd; }
      .fb-map-label {
        background: rgba(0, 0, 0, 0.65);
        border: none;
        box-shadow: none;
        color: #fff;
        font: 11px system-ui, sans-serif;
        padding: 1px 5px;
      }
      .fb-map-label::before { display: none; }
      .fb-map-pickable { cursor: pointer; }
    `;
    document.head.appendChild(MapView.styleElement);
  }

  /** The input sockets' layers, in the order the node declares them. */
  private layers(): MapLayer[] {
    return (this.service.state.sockets ?? [])
      .filter(socket => socket.type === 'in')
      .map(socket => this.worker.layerFor(socket.id!))
      .filter((layer): layer is MapLayer => !!layer);
  }

  protected draw(): void {
    const leaflet = this.leaflet;
    const map = this.map;

    if (!leaflet || !map) {
      return;
    }

    for (const layer of this.drawn) {
      layer.remove();
    }

    this.drawn = [];

    const bounds: [number, number][] = [];

    this.layers().forEach((layer, index) => {
      const colour = LAYER_COLOURS[index % LAYER_COLOURS.length];
      const line: [number, number][] = [];

      if (layer.grid) {
        this.drawGrid(leaflet, map, layer.grid, bounds);

        return;
      }

      layer.places.forEach((place, place_index) => {
        const at: [number, number] = [place.lat, place.lon];

        bounds.push(at);
        line.push(at);

        const active = place_index === layer.current;
        const marker = leaflet.circleMarker(at, {
          color: colour,
          fillColor: colour,
          fillOpacity: active ? 0.95 : 0.55,
          radius: active ? 8 : 5,
          weight: 2,
        }).addTo(map);

        /*
         * A press is a question about this spot, and the node's output is
         * where the answer goes. The cursor says so, because a dot that does
         * something and a dot that does not look identical otherwise.
         */
        marker.on('click', () => this.worker.pick(place));
        marker.options.className = 'fb-map-pickable';

        if (place.label) {
          /*
           * A permanent tooltip rather than a popup: these are names on a
           * diagram, and a name you have to click for is not a label.
           */
          marker.bindTooltip(place.label, {
            className: 'fb-map-label',
            direction: 'right',
            permanent: true,
          });
        }

        this.drawn.push(marker);
      });

      if (this.worker.track && line.length > 1) {
        this.drawn.push(
          leaflet.polyline(line, { color: colour, opacity: 0.65, weight: 2 }).addTo(map),
        );
      }
    });

    if (bounds.length && this.worker.follow && !this.moved && !this.worker.view) {
      map.fitBounds(leaflet.latLngBounds(bounds), { padding: [24, 24], maxZoom: 12 });
    }

    this.cdr.detectChanges();
  }
}

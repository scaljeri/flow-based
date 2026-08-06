import { AfterViewInit, ChangeDetectorRef, Directive, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import type * as L from 'leaflet';
import { MapGrid, MapLayer, MapWorker } from './map.worker';

/**
 * How the map fits its data — used BOTH to do the fitting and to work out the
 * floor below which it may not zoom.
 *
 * One constant, because the requirement is that the two agree: the layer just
 * fills the view, and from there the only direction is closer. Two separate
 * expressions of the same intent drift, and the drift is invisible — the map
 * looks right and lets you zoom out one step anyway.
 */
const FIT = { padding: [24, 24] as [number, number], maxZoom: 12 };

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
  /** The marker drawn as chosen, and how it looked before it was. */
  private chosen?: { marker: L.CircleMarker; resting: L.CircleMarkerOptions };
  /** Every place's dot with the radius it has at rest, before zoom scales it. */
  private dots: { marker: L.CircleMarker; radius: number }[] = [];
  /** Set once the user moves the map by hand; following stops there. */
  private moved = false;
  /**
   * Whether this drawing has been torn down.
   *
   * Leaflet arrives by dynamic import, so everything below the await runs
   * later — and a node switching from small to normal destroys this component
   * synchronously in between. Without the flag the continuation builds a map,
   * a tile layer and a ResizeObserver on a host nobody holds any more, and
   * nothing ever calls remove() on it.
   */
  private destroyed = false;

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
    // Gone while the chunk was in the air, which a view change does.
    if (this.destroyed) {
      return;
    }

    const leaflet = ((module as unknown as { default?: typeof L }).default ?? module) as typeof L;

    this.leaflet = leaflet;
    MapView.adoptStyles(styles.LEAFLET_CSS);

    this.map = leaflet.map(host, {
      // Its own attribution control is a line of text across the bottom of
      // the map; see attributionControl below for what stands in for it.
      attributionControl: false,
      dragging: this.interactive,
      keyboard: this.interactive,
      scrollWheelZoom: this.interactive,
      touchZoom: this.interactive,
      doubleClickZoom: this.interactive,
      zoomControl: this.interactive,
      /*
       * A hard wall rather than a rubber band. Leaflet's default lets a drag
       * past the edge succeed and then springs back, which reads as the map
       * fighting the finger; at 1 the edge simply does not move.
       */
      maxBoundsViscosity: 1,
    });

    /*
     * CARTO's dark basemap, not OpenStreetMap's own tiles: node content is
     * drawn for a dark canvas, and a bright map in the middle of this editor
     * is a hole in it. The attribution is not decoration — both parties
     * require it.
     */
    leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.map);

    this.addAttribution(leaflet, this.map);

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
    /*
     * Dots follow the zoom. A marker is a fixed number of screen pixels, so
     * zooming out packs the same dots into less map until the country is one
     * blob — the drawing stops being a set of places and becomes a stain. Only
     * the size changes, not the markers, so this is cheap enough to do on every
     * zoom of 400 of them.
     */
    this.map.on('zoomend', () => this.resize());

    this.map.on('moveend', () => {
      if (this.interactive && this.moved && this.map) {
        const centre = this.map.getCenter();

        this.worker.setView(centre.lat, centre.lng, this.map.getZoom());
      }
    });

    this.draw();

    if (typeof ResizeObserver !== 'undefined') {
      // Leaflet measures its container once; a node that grows has to say so.
      /*
       * Nothing to invalidate for a container with no size or no document: a
       * detached host measures 0x0, and Leaflet then computes a centre from
       * that and reports it as where the reader left the map.
       */
      this.resizeObserver = new ResizeObserver(() => {
        if (this.map && host.isConnected && host.clientWidth > 0) {
          this.map.invalidateSize();
        }
      });
      this.resizeObserver.observe(host);
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.subscription?.unsubscribe();
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    /*
     * Stop, then unbind, then remove — in that order, and then forget it.
     *
     * `remove()` deletes the map's pane but cancels neither the 250ms
     * zoom-transition timer nor the deferred animation frame that arm on every
     * pan and zoom. Those fire on a dead map and read the position of an
     * element that is gone: "Cannot read properties of undefined (reading
     * '_leaflet_pos')", which this suite has been printing for a while. Our own
     * draw arms them on every pass — setMaxBounds pans, setMinZoom zooms — so
     * the window is open nearly all the time.
     */
    this.map?.stop();
    this.map?.off();
    this.map?.remove();
    this.map = undefined;
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

  /**
   * Credit where it is due, without a sentence across the bottom of the map.
   *
   * Both the tiles and the data behind them require attribution, and a node
   * this size cannot spend a line of text on it — at the small view that line
   * was most of what you could see. So: a button that says i, and the names
   * when it is pressed. The same shape the TOPAS map uses, for the same
   * reason.
   */
  private addAttribution(leaflet: typeof L, map: L.Map): void {
    const control = new leaflet.Control({ position: 'bottomright' });

    control.onAdd = () => {
      const root = leaflet.DomUtil.create('div', 'fb-map-credit');
      const text = leaflet.DomUtil.create('span', 'fb-map-credit-text', root);
      const button = leaflet.DomUtil.create('button', '', root);

      text.textContent = '© OpenStreetMap · © CARTO';
      text.hidden = true;
      button.type = 'button';
      button.textContent = 'i';
      button.setAttribute('aria-label', 'Attribution');
      button.setAttribute('aria-expanded', 'false');

      button.addEventListener('click', event => {
        event.stopPropagation();
        text.hidden = !text.hidden;
        button.setAttribute('aria-expanded', String(!text.hidden));
      });

      // A press here is about the credit, not about the map underneath it.
      leaflet.DomEvent.disableClickPropagation(root);

      return root;
    };

    control.addTo(map);
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
      .fb-map-credit {
        align-items: center;
        background: rgba(0, 0, 0, 0.55);
        border-radius: 10px;
        color: #ccc;
        display: flex;
        font: 10px system-ui, sans-serif;
        gap: 4px;
        padding: 1px 2px 1px 0;
      }
      .fb-map-credit-text { padding-left: 6px; }
      .fb-map-credit-text[hidden] { display: none; }
      .fb-map-credit button {
        background: rgba(255, 255, 255, 0.12);
        border: none;
        border-radius: 50%;
        color: #ddd;
        cursor: pointer;
        font: italic 600 10px serif;
        height: 16px;
        line-height: 16px;
        padding: 0;
        width: 16px;
      }
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
  /**
   * Hold the reader to the data: the widest view is the fit, and there is
   * nowhere to pan to where the data is not.
   *
   * Both limits come from the data rather than from numbers somebody typed —
   * a minimum zoom written by hand is wrong the moment the layer changes, and
   * these layers arrive over the network. What IS configured is how much room
   * to leave around it, which is a matter of taste and does not go stale.
   *
   * Recomputed on every draw, because the data is what it is measuring. Only
   * the LIMITS move; the view the reader is on is left alone unless it has
   * become impossible, which Leaflet corrects itself.
   */
  private limit(leaflet: typeof L, map: L.Map, points: [number, number][]): void {
    if (!points.length || !this.worker.bounded) {
      // Off, or nothing to be bounded by. Both limits are dropped, or a map
      // switched back to free would stay locked to whatever it last held.
      map.setMinZoom(0);
      map.setMaxBounds(undefined as unknown as L.LatLngBounds);

      return;
    }

    const data = leaflet.latLngBounds(points);
    const south = data.getSouth();
    const north = data.getNorth();
    const west = data.getWest();
    const east = data.getEast();

    /*
     * A fraction of the data's own size, and a floor in degrees: a single
     * place has no width at all, and a fraction of nothing is nothing — the
     * bounds would be a point and the map would refuse to move.
     */
    const padX = Math.max((east - west) * this.worker.slackX, 0.02);
    const padY = Math.max((north - south) * this.worker.slackY, 0.02);
    const roomy = leaflet.latLngBounds(
      [Math.max(-85, south - padY), Math.max(-180, west - padX)],
      [Math.min(85, north + padY), Math.min(180, east + padX)],
    );

    map.setMaxBounds(roomy);

    /*
     * The floor is the FIT — the zoom at which the data itself just fills the
     * view — and not the zoom at which the padded rectangle fits.
     *
     * The distinction is the whole of the requirement. The slack is room to
     * pan into, which is a different question from how far out the reader may
     * stand; computing the floor from the padded box let the map zoom out one
     * step past its own data, which is where this was measured and found
     * wrong. Same bounds, same padding, same cap as the fit above, so the two
     * cannot disagree.
     */
    const floor = Math.min(
      map.getBoundsZoom(data, false, leaflet.point(FIT.padding[0], FIT.padding[1])),
      FIT.maxZoom,
    );

    map.setMinZoom(floor);
  }

  /** The zoom the resting radii were chosen at: the whole of the Netherlands. */
  private static readonly BASE_ZOOM = 7;
  /** The radius a chosen dot has at that zoom. */
  private static readonly CHOSEN_RADIUS = 9;

  /**
   * A radius at the zoom the map is on now.
   *
   * Not proportional to the scale, deliberately: a dot that grew with the map
   * would be a circle of fixed WIDTH ON THE GROUND, kilometres across, and a
   * station is a point. Half a step per zoom level keeps the dots readable when
   * you come in close and small enough not to merge when you go out, and the
   * clamp stops both ends running away.
   */
  private scaled(radius: number): number {
    const zoom = this.map?.getZoom() ?? MapView.BASE_ZOOM;
    const factor = Math.min(2, Math.max(0.5, 1 + (zoom - MapView.BASE_ZOOM) * 0.16));

    // Never below a pixel and a half: at that size a dot reads as dirt on the
    // screen, and there is no zoom at which "invisible" is the right answer.
    return Math.max(1.5, radius * factor);
  }

  /** Give every dot the size it should have at the zoom the map is on. */
  private resize(): void {
    for (const dot of this.dots) {
      const radius = this.chosen?.marker === dot.marker ? MapView.CHOSEN_RADIUS : dot.radius;

      dot.marker.setRadius(this.scaled(radius));
    }
  }

  /**
   * Draw this marker as the chosen one, and give the last one back its own
   * looks.
   *
   * A white ring rather than another colour: the fill keeps saying which layer
   * the place belongs to, which is a different question from which place is
   * selected, and answering both with one colour makes both unreadable. Raised
   * to the front because a chosen dot under an unchosen one is not chosen as
   * far as the reader can tell.
   */
  private markChosen(marker: L.CircleMarker, resting: L.CircleMarkerOptions): void {
    if (this.chosen && this.chosen.marker !== marker) {
      // The radius is not a style in Leaflet's sense and has its own setter,
      // so putting it back takes both calls.
      this.chosen.marker.setStyle(this.chosen.resting);
      this.chosen.marker.setRadius(this.scaled(this.chosen.resting.radius ?? 5));
    }

    marker.setStyle({ color: '#fff', fillOpacity: 1, weight: 3 });
    marker.setRadius(this.scaled(MapView.CHOSEN_RADIUS));
    marker.bringToFront();

    this.chosen = { marker, resting };
  }

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
    this.dots = [];
    // The marker it pointed at has just been removed from the map; the choice
    // itself lives in the worker and is re-applied as the new markers are made.
    this.chosen = undefined;

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
        const resting: L.CircleMarkerOptions = {
          color: colour,
          fillColor: colour,
          fillOpacity: active ? 0.95 : 0.55,
          radius: active ? 8 : 5,
          weight: 2,
        };
        const marker = leaflet
          .circleMarker(at, { ...resting, radius: this.scaled(resting.radius!) })
          .addTo(map);

        this.dots.push({ marker, radius: resting.radius! });

        /*
         * A press is a question about this spot, and the node's output is
         * where the answer goes. The cursor says so, because a dot that does
         * something and a dot that does not look identical otherwise.
         *
         * And the answer is not only downstream: pressing a dot marks it, so
         * the map still says which of four hundred it was after the panel
         * below it fills in. A click that changes something out of sight is a
         * click you cannot be sure landed.
         */
        marker.on('click', () => {
          this.worker.pick(place);
          this.markChosen(marker, resting);
        });
        marker.options.className = 'fb-map-pickable';

        // A redraw rebuilds every marker, so the choice is re-applied from the
        // worker rather than remembered by the marker that no longer exists.
        if (this.worker.isPicked(place)) {
          this.markChosen(marker, resting);
        }

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

    /*
     * The limits BEFORE the fit, not after it.
     *
     * setMaxBounds nudges the map back inside its wall, and a nudge issued
     * after a fit is a second, animated move — during which Leaflet reads the
     * position of markers that the next draw has already thrown away. It threw
     * (`_leaflet_pos` of undefined) and, worse, left the map somewhere other
     * than where the fit had just put it, so a press aimed at a marker landed
     * on empty water. Set the wall first, then fit inside it, and nothing has
     * to be corrected afterwards.
     */
    this.limit(leaflet, map, bounds);

    if (this.worker.refit) {
      // The reader asked for the fit back; a gesture from before that is not
      // an argument against it.
      this.moved = false;
      this.worker.refit = false;
    }

    if (bounds.length && this.worker.follow && !this.moved && !this.worker.view) {
      map.fitBounds(leaflet.latLngBounds(bounds), { padding: FIT.padding, maxZoom: FIT.maxZoom });
    }

    this.cdr.detectChanges();
  }
}

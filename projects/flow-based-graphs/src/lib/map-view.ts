import { AfterViewInit, ChangeDetectorRef, Directive, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { NodeService } from '@scaljeri/flow-based';
import { Subscription } from 'rxjs';
import type * as L from 'leaflet';
import { MapLayer, MapWorker } from './map.worker';

/** One colour per layer, matching the plots so a flow reads the same throughout. */
const LAYER_COLOURS = ['#bada55', '#ff4081', '#2aa7a0'];

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

    this.map.setView([52.1, 5.3], 7);
    this.map.on('movestart', () => {
      // Only a gesture counts: fitBounds moves the map too, and treating that
      // as the user taking over would stop following on the first draw.
      if (this.interactive) {
        this.moved = true;
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

    if (bounds.length && this.worker.follow && !this.moved) {
      map.fitBounds(leaflet.latLngBounds(bounds), { padding: [24, 24], maxZoom: 12 });
    }

    this.cdr.detectChanges();
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */

declare namespace AMap {
  class Map {
    constructor(container: HTMLElement, opts?: Record<string, any>)
    destroy(): void
    setCenter(center: [number, number], immediately?: boolean): void
    setZoom(zoom: number, immediately?: boolean): void
  }

  class Marker {
    constructor(opts?: Record<string, any>)
    setMap(map: Map | null): void
    on(event: string, handler: (...args: any[]) => void): void
  }

  class TileLayer {
    static Satellite(): any
    static RoadNet(): any
  }
}

declare namespace Loca {
  class Container {
    constructor(opts?: Record<string, any>)
    destroy(): void
    animate: { start(): void }
  }

  class PulseLineLayer {
    constructor(opts?: Record<string, any>)
    setSource(source: any): void
    setStyle(style: Record<string, any>): void
    render(): void
  }

  class GeoJSONSource {
    constructor(opts?: Record<string, any>)
  }
}

declare global {
  interface Window {
    AMap: typeof AMap
    Loca: typeof Loca
    _AMapSecurityConfig?: { securityJsCode: string }
  }
}

export {}

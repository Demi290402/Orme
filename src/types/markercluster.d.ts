import * as L from 'leaflet';

declare module 'leaflet' {
    export function markerClusterGroup(options?: any): any;
}

declare module 'leaflet.markercluster';
declare module '@changey/react-leaflet-markercluster';

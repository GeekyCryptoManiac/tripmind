declare module 'react-simple-maps' {
  import { FC, SVGProps, ReactNode } from 'react';

  export interface ComposableMapProps {
    projection?: string;
    projectionConfig?: {
      rotate?: [number, number, number];
      center?: [number, number];
      scale?: number;
    };
    width?: number;
    height?: number;
    className?: string;
    children?: ReactNode;
  }

  export interface ZoomableGroupProps {
    zoom?: number;
    center?: [number, number];
    minZoom?: number;
    maxZoom?: number;
    onMoveStart?: (position: { coordinates: [number, number]; zoom: number }) => void;
    onMoveEnd?: (position: { coordinates: [number, number]; zoom: number }) => void;
    onMove?: (position: { coordinates: [number, number]; zoom: number }) => void;
    children?: ReactNode;
  }

  export interface GeographiesProps {
    geography: string | object | any[];
    parseGeographies?: (geographies: any) => any;
    children?: (data: {
      geographies: any[];
      outline: any;
      borders: any;
    }) => ReactNode;
  }

  export interface GeographyProps extends SVGProps<SVGPathElement> {
    geography: any;
    onMouseEnter?: (event: React.MouseEvent<SVGPathElement>) => void;
    onMouseLeave?: (event: React.MouseEvent<SVGPathElement>) => void;
    onClick?: (event: React.MouseEvent<SVGPathElement>) => void;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
  }

  export const ComposableMap: FC<ComposableMapProps>;
  export const ZoomableGroup: FC<ZoomableGroupProps>;
  export const Geographies: FC<GeographiesProps>;
  export const Geography: FC<GeographyProps>;
}

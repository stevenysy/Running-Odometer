export interface RoutePreview {
  points: RoutePreviewPoint[];
}

export interface RoutePreviewPoint {
  x: number;
  y: number;
}

interface LatLngPoint {
  lat: number;
  lng: number;
}

const MAX_ROUTE_PREVIEW_POINTS = 120;

export function createRoutePreview(summaryPolyline: string | null): RoutePreview | null {
  if (!summaryPolyline) {
    return null;
  }

  const decodedPoints = safelyDecodePolyline(summaryPolyline);

  if (decodedPoints.length < 2) {
    return null;
  }

  const normalizedPoints = normalizeRoutePoints(decodedPoints);

  if (normalizedPoints.length < 2) {
    return null;
  }

  return {
    points: downsamplePoints(normalizedPoints, MAX_ROUTE_PREVIEW_POINTS)
  };
}

function safelyDecodePolyline(polyline: string): LatLngPoint[] {
  try {
    return decodePolyline(polyline);
  } catch {
    return [];
  }
}

function decodePolyline(polyline: string): LatLngPoint[] {
  const points: LatLngPoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < polyline.length) {
    const decodedLat = decodeValue(polyline, index);
    index = decodedLat.nextIndex;
    lat += decodedLat.value;

    const decodedLng = decodeValue(polyline, index);
    index = decodedLng.nextIndex;
    lng += decodedLng.value;

    points.push({
      lat: lat / 100000,
      lng: lng / 100000
    });
  }

  return points;
}

function decodeValue(polyline: string, startIndex: number): { value: number; nextIndex: number } {
  let result = 0;
  let shift = 0;
  let index = startIndex;
  let byte: number;

  do {
    if (index >= polyline.length) {
      throw new Error('Invalid encoded polyline');
    }

    byte = polyline.charCodeAt(index) - 63;
    index += 1;
    result |= (byte & 0x1f) << shift;
    shift += 5;
  } while (byte >= 0x20);

  return {
    value: result & 1 ? ~(result >> 1) : result >> 1,
    nextIndex: index
  };
}

function normalizeRoutePoints(points: LatLngPoint[]): RoutePreviewPoint[] {
  const bounds = points.reduce(
    (acc, point) => ({
      minLat: Math.min(acc.minLat, point.lat),
      maxLat: Math.max(acc.maxLat, point.lat),
      minLng: Math.min(acc.minLng, point.lng),
      maxLng: Math.max(acc.maxLng, point.lng)
    }),
    {
      minLat: Number.POSITIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
      minLng: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY
    }
  );

  const latSpan = bounds.maxLat - bounds.minLat;
  const lngSpan = bounds.maxLng - bounds.minLng;

  if (latSpan === 0 && lngSpan === 0) {
    return [];
  }

  if (lngSpan >= latSpan) {
    const yScale = lngSpan === 0 ? 1 : latSpan / lngSpan;
    const yOffset = (1 - yScale) / 2;

    return points.map((point) => ({
      x: lngSpan === 0 ? 0.5 : roundCoordinate((point.lng - bounds.minLng) / lngSpan),
      y:
        latSpan === 0
          ? 0.5
          : roundCoordinate(yOffset + ((bounds.maxLat - point.lat) / latSpan) * yScale)
    }));
  }

  const xScale = latSpan === 0 ? 1 : lngSpan / latSpan;
  const xOffset = (1 - xScale) / 2;

  return points.map((point) => ({
    x:
      lngSpan === 0
        ? 0.5
        : roundCoordinate(xOffset + ((point.lng - bounds.minLng) / lngSpan) * xScale),
    y: latSpan === 0 ? 0.5 : roundCoordinate((bounds.maxLat - point.lat) / latSpan)
  }));
}

function downsamplePoints(points: RoutePreviewPoint[], maxPoints: number): RoutePreviewPoint[] {
  if (points.length <= maxPoints) {
    return points;
  }

  const fallbackPoint = points[points.length - 1];

  if (!fallbackPoint) {
    return [];
  }

  return Array.from({ length: maxPoints }, (_, index) => {
    const sourceIndex = Math.round((index * (points.length - 1)) / (maxPoints - 1));

    return points[sourceIndex] ?? fallbackPoint;
  });
}

function roundCoordinate(value: number): number {
  return Math.round(value * 10000) / 10000;
}

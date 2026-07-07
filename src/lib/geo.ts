// PostgREST returns PostGIS `geography(point)` columns as an EWKB hex string
// (e.g. "0101000020E6100000...") rather than GeoJSON — decode it directly
// instead of assuming a `{ coordinates: [lng, lat] }` shape.
export function parseWkbPoint(hex: string | null): { lat: number; lng: number } | null {
  if (!hex) return null
  try {
    const bytes = new Uint8Array(hex.length / 2)
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
    }
    const view = new DataView(bytes.buffer)
    const littleEndian = bytes[0] === 1
    const typeAndFlags = view.getUint32(1, littleEndian)
    const hasSrid = (typeAndFlags & 0x20000000) !== 0
    const offset = 5 + (hasSrid ? 4 : 0)
    const lng = view.getFloat64(offset, littleEndian)
    const lat = view.getFloat64(offset + 8, littleEndian)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  } catch {
    return null
  }
}

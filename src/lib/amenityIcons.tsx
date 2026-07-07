import {
  Wifi, Waves, Snowflake, ParkingSquare, Utensils,
  WashingMachine, Tv, Trees, Sailboat, Anchor, type LucideIcon,
} from 'lucide-react'

export const AMENITY_ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  pool: Waves,
  air_conditioning: Snowflake,
  parking: ParkingSquare,
  kitchen: Utensils,
  washer: WashingMachine,
  tv: Tv,
  garden: Trees,
  sea_view: Sailboat,
  ocean_view: Anchor,
}

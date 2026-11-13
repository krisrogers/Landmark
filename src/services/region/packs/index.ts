/**
 * Region packs — each region's set of context providers. `global` uses the
 * worldwide keyless sources; `AU` currently inherits them (Open-Meteo works in
 * Australia). The seam is real: to give Australia higher-res data later, swap
 * `AU`'s `elevation`/`soil` for Geoscience Australia / CSIRO implementations —
 * nothing else changes.
 */
import type { RegionKey, RegionPack } from '../types';
import { openMeteoElevation } from '../providers/elevation.openMeteo';
import { openMeteoClimate } from '../providers/climate.openMeteo';
import { soilGridsSoil } from '../providers/soil.soilGrids';

const globalPack: RegionPack = {
  region: 'global',
  label: 'Worldwide',
  elevation: openMeteoElevation,
  climate: openMeteoClimate,
  soil: soilGridsSoil,
};

const auPack: RegionPack = {
  region: 'AU',
  label: 'Australia',
  // TODO: override with Geoscience Australia DEM + CSIRO Soil & Landscape Grid.
  elevation: openMeteoElevation,
  climate: openMeteoClimate,
  soil: soilGridsSoil,
};

const PACKS: Record<RegionKey, RegionPack> = {
  global: globalPack,
  AU: auPack,
};

export function packForRegion(region: RegionKey): RegionPack {
  return PACKS[region];
}

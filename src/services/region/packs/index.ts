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
import { auClimate } from '../providers/climate.au';
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
  // TODO: override elevation with Geoscience Australia DEM; soil with CSIRO SLGA.
  elevation: openMeteoElevation,
  // BoM-derived rainfall (SILO) with Open-Meteo temps; falls back to Open-Meteo.
  climate: auClimate,
  soil: soilGridsSoil,
};

const PACKS: Record<RegionKey, RegionPack> = {
  global: globalPack,
  AU: auPack,
};

export function packForRegion(region: RegionKey): RegionPack {
  return PACKS[region];
}

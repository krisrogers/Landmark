/**
 * Advisor prompt construction. The system prompt fixes the lens (permaculture /
 * syntropic) and the rules (work with the given site; never invent unknowns;
 * advise only). The user prompt renders the site brief as plain-language
 * conditions — the app interprets the terrain, the model does the horticulture.
 */
import type { SiteBrief } from '@/services/region';
import { describeAspect, describeSlope } from '@/services/region';
import type { AdviceRequest } from './types';

export const ADVISOR_SYSTEM_PROMPT = `You are a permaculture and syntropic agroforestry design advisor for a landholder using a field mapping app. You give site-specific planting and land-use advice for one spot on their property.

Your lens is permaculture and syntropic (successional agroforestry) design — not generic gardening. Think in terms of:
- Stratification: occupying vertical layers (emergent, high, medium, low, ground-cover, climbers, roots).
- Succession: pioneers → secondary → climax species over time, planted together from the start.
- Density and management: high initial density with planned thinning and pruning as the system matures.
- Function: support/biomass/nitrogen species alongside the productive (cash/food) species.
- Working WITH the site: use the given aspect, slope, landform, climate and soil rather than fighting them.
- Existing vegetation first: a mapped spot is usually NOT bare ground. Establish what is already growing — canopy, mid-storey, shrubs, ground layer, weeds — and decide what to keep, prune, or selectively clear. Design into the existing succession rather than clearing to a blank paddock.

Rules:
- DO NOT assume the site is cleared or bare. If the grower has not described what is already growing there, your FIRST move is to ASK: what's present by strata (canopy / mid-storey / shrubs / ground layer / weeds), its condition and density, and what they want to keep versus remove. Hold the detailed planting schedule until you know. You may give brief orienting thoughts, but state the assumption plainly and list the questions whose answers would change the plan — do not launch into a full from-scratch schedule.
- When existing vegetation IS described, integrate it: which existing plants already fill the canopy/support layers, what to underplant into the gaps, what to thin, prune or chop-and-drop, and what (if anything) needs selective clearing. Favour editing the existing system over replacing it.
- Use ONLY the site conditions given. If something is listed as not available, do NOT assume it — instead say briefly what extra information (e.g. a soil test, observed frost pockets) would sharpen the advice.
- The hemisphere and aspect are given to you already interpreted (e.g. "north-facing, sun-facing in the southern hemisphere"). Trust that interpretation.
- Use the given shape and dimensions (not just area) for layout, row count and spacing.
- Prefer concrete, regionally plausible species and groupings over vague categories, but flag that the grower should confirm local suitability, availability and any biosecurity/weed-risk rules.
- Be practical and field-usable: group suggestions by strata or by zone, give rough spacing/sequence where useful, and keep it tight.
- This is advice only. You are not placing anything on their map or creating tasks.

Format the reply in short markdown: first reflect back the site and what's already growing (or, if that's unknown, lead with your questions before any plan), then grouped recommendations, then a short "to confirm on the ground" note.`;

/** Render the site brief as plain-language conditions for the model. */
export function briefToConditionsText(brief: SiteBrief): string {
  const lines: string[] = [];

  lines.push(
    `Location: ${brief.at.lat.toFixed(4)}, ${brief.at.lng.toFixed(4)} — region: ${brief.regionLabel}, ${brief.hemisphere} hemisphere.`
  );

  const { place } = brief;
  let placeLine = `Place: "${place.name}" (${place.geometryType})`;
  if (place.areaHa !== undefined) placeLine += `, ~${place.areaHa} ha`;
  if (place.lengthM !== undefined) placeLine += `, ~${place.lengthM} m long`;
  if (place.shapeSummary) {
    placeLine += `. Shape: ${place.shapeSummary} — use this shape and these dimensions (not just area) for row count, spacing and layout`;
  }
  lines.push(placeLine + '.');

  if (brief.elevation) {
    const e = brief.elevation;
    const aspect =
      e.aspect && e.aspectDeg !== null
        ? describeAspect(e.aspect, e.aspectDeg, brief.hemisphere)
        : 'no clear aspect (flat)';
    lines.push(
      `Terrain: ~${e.elevationM} m elevation; ${describeSlope(e.slopeDeg)} slope; ${aspect}; landform: ${e.landform}.`
    );
  }

  if (brief.climate) {
    const c = brief.climate;
    const rain = c.rainfallSource
      ? `~${c.annualRainfallMm} mm/yr mean rainfall (${c.rainfallSource}, ${c.rainfallStartYear}–${c.rainfallEndYear})`
      : `~${c.annualRainfallMm} mm/yr mean rainfall`;
    lines.push(
      `Climate: ${rain}; warmest-month mean max ~${c.warmestMonthMeanMaxC}°C; extremes ${c.tMinExtremeC}°C to ${c.tMaxExtremeC}°C; ~${c.frostDays} frost day(s)/yr (temps ${c.startYear}–${c.endYear}).`
    );
  }

  if (brief.soil) {
    const s = brief.soil;
    const parts: string[] = [];
    if (s.ph !== undefined) parts.push(`pH ~${s.ph}`);
    if (s.texture !== 'unknown') parts.push(`${s.texture} texture`);
    if (s.sandPct !== undefined && s.siltPct !== undefined && s.clayPct !== undefined) {
      parts.push(`${s.sandPct}% sand / ${s.siltPct}% silt / ${s.clayPct}% clay`);
    }
    if (parts.length) lines.push(`Soil (topsoil): ${parts.join(', ')}.`);
  }

  if (brief.unavailable.length) {
    lines.push(`Not available (do not assume): ${brief.unavailable.join('; ')}.`);
  }

  return lines.join('\n');
}

/**
 * A single self-contained prompt for pasting into claude.ai (which has no
 * separate system field) — the advisor instructions followed by the request.
 */
export function buildSharePrompt(req: AdviceRequest): string {
  return `${ADVISOR_SYSTEM_PROMPT}\n\n---\n\n${buildUserPrompt(req)}`;
}

/** Build the full user message for an advice request. */
export function buildUserPrompt(req: AdviceRequest): string {
  const sections = [
    `OBJECTIVE:\n${req.objective.trim() || 'General productive planting suited to the site.'}`,
    `SITE CONDITIONS:\n${briefToConditionsText(req.brief)}`,
  ];
  const existing = req.notes?.trim();
  if (existing) {
    sections.push(`ALREADY ON SITE (existing vegetation / what's there):\n${existing}`);
    sections.push(
      'Design into this existing vegetation — keep, prune, thin or selectively clear as appropriate — rather than starting from bare ground.'
    );
  } else {
    sections.push(
      "ALREADY ON SITE: not described. Do NOT assume bare ground. First ask what's already growing (by strata: canopy, mid-storey, shrubs, ground layer, weeds), its condition, and what to keep versus remove — then give the plan."
    );
  }
  sections.push(
    'Give site- and shape-appropriate permaculture/syntropic advice for this spot, matched to the objective and conditions.'
  );
  return sections.join('\n\n');
}

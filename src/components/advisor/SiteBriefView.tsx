import type { SiteBrief } from '@/services/region';
import { describeAspect, describeSlope } from '@/services/region';

/** Compact, human-readable view of the site conditions sent to the advisor. */
export function SiteBriefView({ brief }: { brief: SiteBrief }) {
  const rows: { label: string; value: string }[] = [];

  rows.push({
    label: 'Region',
    value: `${brief.regionLabel} · ${brief.hemisphere} hemisphere`,
  });

  if (brief.elevation) {
    const e = brief.elevation;
    const aspect =
      e.aspect && e.aspectDeg !== null
        ? describeAspect(e.aspect, e.aspectDeg, brief.hemisphere)
        : 'no clear aspect (flat)';
    rows.push({ label: 'Elevation', value: `~${e.elevationM} m` });
    rows.push({ label: 'Slope', value: describeSlope(e.slopeDeg) });
    rows.push({ label: 'Aspect', value: aspect });
    rows.push({ label: 'Landform', value: e.landform });
  }

  if (brief.climate) {
    const c = brief.climate;
    rows.push({
      label: 'Rainfall',
      value: `~${c.annualRainfallMm} mm/yr (${c.startYear}–${c.endYear} avg)`,
    });
    rows.push({
      label: 'Temperature',
      value: `${c.tMinExtremeC}°C to ${c.tMaxExtremeC}°C · warmest-month mean max ~${c.warmestMonthMeanMaxC}°C`,
    });
    rows.push({ label: 'Frost', value: `~${c.frostDays} day(s)/yr` });
  }

  if (brief.soil) {
    const s = brief.soil;
    const parts: string[] = [];
    if (s.ph !== undefined) parts.push(`pH ~${s.ph}`);
    if (s.texture !== 'unknown') parts.push(s.texture);
    if (s.sandPct !== undefined) parts.push(`${s.sandPct}/${s.siltPct}/${s.clayPct} sand/silt/clay`);
    if (parts.length) rows.push({ label: 'Soil', value: parts.join(' · ') });
  }

  return (
    <div className="rounded-lg border border-stone-200 bg-white overflow-hidden">
      <div className="px-3 py-2 bg-stone-50 border-b border-stone-200">
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">
          Site read
        </p>
      </div>
      <dl className="divide-y divide-stone-100">
        {rows.map((r) => (
          <div key={r.label} className="px-3 py-2 flex gap-3">
            <dt className="w-24 shrink-0 text-sm text-stone-500">{r.label}</dt>
            <dd className="text-sm text-stone-800">{r.value}</dd>
          </div>
        ))}
      </dl>
      {brief.unavailable.length > 0 && (
        <div className="px-3 py-2 bg-amber-50 border-t border-amber-100">
          <p className="text-xs text-amber-800">
            Couldn't read: {brief.unavailable.join('; ')}. The advice notes this rather than
            guessing.
          </p>
        </div>
      )}
    </div>
  );
}

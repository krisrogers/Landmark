// Small build-identity watermark so it's obvious which deploy is running after
// a refresh. The values are injected at build time via Vite `define`; the
// typeof guards keep it safe under test where they aren't defined.
export function VersionBadge() {
  const id = typeof __BUILD_ID__ !== 'undefined' ? __BUILD_ID__ : 'dev';
  const iso = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '';

  let time = '';
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) {
      time = d.toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }

  return (
    <div
      className="fixed top-0 left-0 z-[2000] pointer-events-none select-none safe-top"
      aria-hidden="true"
    >
      <div className="font-mono text-[10px] leading-none text-white/90 bg-black/55 rounded-br-md px-1.5 py-1">
        {id}
        {time ? ` · ${time}` : ''}
      </div>
    </div>
  );
}

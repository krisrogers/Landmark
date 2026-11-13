// Small build-identity watermark so it's obvious which deploy is running. It
// doubles as a manual refresh control — essential in an installed PWA, which
// has no address bar or pull-to-refresh. Build values are injected at build
// time via Vite `define`; the typeof guards keep it safe under test.
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
    <div className="fixed top-0 left-0 z-[2000] select-none safe-top">
      <button
        type="button"
        onClick={() => window.location.reload()}
        title="Tap to refresh"
        aria-label="Refresh app"
        className="flex items-center gap-1 font-mono text-[10px] leading-none text-white/90 bg-black/55 rounded-br-md px-1.5 py-1 active:bg-black/75"
      >
        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 9a8 8 0 00-14.3-3.3L4 9m0 6a8 8 0 0014.3 3.3L20 15" />
        </svg>
        {id}
        {time ? ` · ${time}` : ''}
      </button>
    </div>
  );
}

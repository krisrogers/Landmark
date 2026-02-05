interface VersionInfo {
  commitSha: string;
  prNumber: string;
  buildTime: string;
}

function getVersionInfo(): VersionInfo {
  return {
    commitSha: import.meta.env.VITE_COMMIT_SHA || 'dev',
    prNumber: import.meta.env.VITE_PR_NUMBER || '',
    buildTime: import.meta.env.VITE_BUILD_TIME || '',
  };
}

export function VersionWatermark() {
  const { commitSha, prNumber } = getVersionInfo();

  const shortSha = commitSha.slice(0, 7);
  const versionText = prNumber ? `PR #${prNumber} (${shortSha})` : shortSha;

  return (
    <div className="fixed bottom-16 left-2 z-[999] pointer-events-none">
      <span className="text-[10px] font-mono text-stone-400 bg-white/80 px-1 rounded">
        {versionText}
      </span>
    </div>
  );
}

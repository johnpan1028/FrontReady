export function VersionCheckoutDialog({
  versionShortLabel,
  onCancel,
  onDiscard,
  onSave,
}: {
  versionShortLabel: string;
  onCancel: () => void;
  onDiscard: () => void;
  onSave: () => void;
}) {
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/25 px-4">
      <div className="w-full max-w-sm rounded-xl border border-hr-border bg-hr-panel p-4 shadow-2xl">
        <div className="text-sm font-semibold text-hr-text">
          Switch to {versionShortLabel}?
        </div>
        <div className="mt-1 text-sm text-hr-muted">
          Save current changes first?
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-hr-border px-3 py-1.5 text-sm text-hr-muted hover:text-hr-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onDiscard}
            className="rounded-md border border-hr-border px-3 py-1.5 text-sm text-hr-text hover:border-hr-primary hover:text-hr-primary"
          >
            Don’t Save
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-md bg-hr-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-hr-primary/90"
          >
            Save & Switch
          </button>
        </div>
      </div>
    </div>
  );
}

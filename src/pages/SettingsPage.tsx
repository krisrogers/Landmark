import { useSettingsStore } from '@/store';

export function SettingsPage() {
  const {
    unitsSystem,
    dateFormat,
    hapticFeedback,
    highContrast,
    setUnitsSystem,
    setDateFormat,
    setHapticFeedback,
    setHighContrast,
  } = useSettingsStore();

  return (
    <div className="h-full flex flex-col bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-4 py-3 safe-top">
        <h1 className="text-xl font-semibold text-stone-900">Settings</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Units */}
        <section className="bg-white mt-4">
          <h2 className="px-4 py-2 text-sm font-medium text-stone-500 uppercase tracking-wide">
            Units
          </h2>
          <div className="divide-y divide-stone-100">
            <SettingOption
              label="Metric"
              description="Meters, hectares, kilograms"
              selected={unitsSystem === 'metric'}
              onClick={() => setUnitsSystem('metric')}
            />
            <SettingOption
              label="Imperial"
              description="Feet, acres, pounds"
              selected={unitsSystem === 'imperial'}
              onClick={() => setUnitsSystem('imperial')}
            />
          </div>
        </section>

        {/* Date Format */}
        <section className="bg-white mt-4">
          <h2 className="px-4 py-2 text-sm font-medium text-stone-500 uppercase tracking-wide">
            Date Format
          </h2>
          <div className="divide-y divide-stone-100">
            <SettingOption
              label="Relative"
              description="2 days ago, in 3 weeks"
              selected={dateFormat === 'relative'}
              onClick={() => setDateFormat('relative')}
            />
            <SettingOption
              label="ISO"
              description="2024-01-15"
              selected={dateFormat === 'iso'}
              onClick={() => setDateFormat('iso')}
            />
            <SettingOption
              label="Local"
              description="15 Jan 2024"
              selected={dateFormat === 'local'}
              onClick={() => setDateFormat('local')}
            />
          </div>
        </section>

        {/* Accessibility */}
        <section className="bg-white mt-4">
          <h2 className="px-4 py-2 text-sm font-medium text-stone-500 uppercase tracking-wide">
            Accessibility
          </h2>
          <div className="divide-y divide-stone-100">
            <SettingToggle
              label="Haptic Feedback"
              description="Vibration on button presses"
              enabled={hapticFeedback}
              onToggle={() => setHapticFeedback(!hapticFeedback)}
            />
            <SettingToggle
              label="High Contrast"
              description="Increase visual contrast"
              enabled={highContrast}
              onToggle={() => setHighContrast(!highContrast)}
            />
          </div>
        </section>

        {/* About */}
        <section className="bg-white mt-4 mb-4">
          <h2 className="px-4 py-2 text-sm font-medium text-stone-500 uppercase tracking-wide">
            About
          </h2>
          <div className="px-4 py-3">
            <p className="font-medium text-stone-900">Landmark</p>
            <p className="text-sm text-stone-500">Version 1.0.0</p>
            <p className="text-sm text-stone-500 mt-2">
              Offline-first field notebook and land-planning system.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

interface SettingOptionProps {
  label: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

function SettingOption({ label, description, selected, onClick }: SettingOptionProps) {
  return (
    <button
      onClick={onClick}
      className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-50 transition-colors"
    >
      <div className="text-left">
        <p className="font-medium text-stone-900">{label}</p>
        <p className="text-sm text-stone-500">{description}</p>
      </div>
      {selected && (
        <svg className="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </button>
  );
}

interface SettingToggleProps {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

function SettingToggle({ label, description, enabled, onToggle }: SettingToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="w-full px-4 py-3 flex items-center justify-between hover:bg-stone-50 transition-colors"
    >
      <div className="text-left">
        <p className="font-medium text-stone-900">{label}</p>
        <p className="text-sm text-stone-500">{description}</p>
      </div>
      <div
        className={`
          w-11 h-6 rounded-full relative transition-colors
          ${enabled ? 'bg-primary-600' : 'bg-stone-300'}
        `}
      >
        <div
          className={`
            absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
            ${enabled ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </div>
    </button>
  );
}

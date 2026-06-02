import { useState } from 'react';
import { useMapStore, type BasemapType } from '@/store';

const basemapOptions: { id: BasemapType; label: string; icon: string }[] = [
  { id: 'osm', label: 'Street', icon: '🗺️' },
  { id: 'satellite', label: 'Satellite', icon: '🛰️' },
  { id: 'none', label: 'None', icon: '⬜' },
];

export function BasemapSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { basemap, setBasemap } = useMapStore();

  const currentBasemap = basemapOptions.find((b) => b.id === basemap);

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-md hover:bg-stone-50 transition-colors min-h-touch"
        >
          <span className="text-lg">{currentBasemap?.icon}</span>
          <span className="text-sm font-medium text-stone-700">{currentBasemap?.label}</span>
          <svg
            className={`w-4 h-4 text-stone-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-[-1]"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-lg overflow-hidden animate-fade-in">
              {basemapOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setBasemap(option.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 text-left
                    hover:bg-stone-50 transition-colors min-h-touch
                    ${basemap === option.id ? 'bg-primary-50 text-primary-700' : 'text-stone-700'}
                  `}
                >
                  <span className="text-lg">{option.icon}</span>
                  <span className="font-medium">{option.label}</span>
                  {basemap === option.id && (
                    <svg className="w-5 h-5 ml-auto text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

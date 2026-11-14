import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useMapStore } from '@/store';

const mapIcon = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
  </svg>
);

const placesIcon = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h10M4 12h10M4 18h7" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.5 14.5l-2.1 2.1a1 1 0 01-1.4 0l-1-1a4 4 0 114.5-1.1z" />
  </svg>
);

const settingsIcon = (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

// Due and Things are hidden for the alpha (mapping + measuring focus).
const leftItems = [
  { path: '/', label: 'Map', icon: mapIcon },
  { path: '/places', label: 'Places', icon: placesIcon },
];
const rightItems = [{ path: '/settings', label: 'Settings', icon: settingsIcon }];

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setCaptureOpen } = useMapStore();

  // Hide navigation on full-screen detail and editor pages
  const hideOn = ['/feature/', '/asset/', '/task/'];
  if (hideOn.some((p) => location.pathname.startsWith(p))) {
    return null;
  }

  const openCapture = () => {
    if (location.pathname !== '/') navigate('/');
    setCaptureOpen(true);
  };

  const linkClass = ({ isActive }: { isActive: boolean }) => `
    flex flex-col items-center justify-center
    py-2 px-4 min-h-[56px] flex-1
    transition-colors
    ${isActive ? 'text-primary-600' : 'text-stone-500 hover:text-stone-700'}
  `;

  const renderLink = (item: { path: string; label: string; icon: JSX.Element }) => (
    <NavLink key={item.path} to={item.path} end={item.path === '/'} className={linkClass}>
      {item.icon}
      <span className="text-xs mt-1 font-medium">{item.label}</span>
    </NavLink>
  );

  return (
    <nav className="bg-white border-t border-stone-200 safe-bottom">
      <div className="flex items-center">
        {leftItems.map(renderLink)}

        <button
          onClick={openCapture}
          aria-label="Add"
          className="flex-1 flex items-center justify-center min-h-[56px]"
        >
          <span className="w-12 h-12 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={2.4} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
          </span>
        </button>

        {rightItems.map(renderLink)}
      </div>
    </nav>
  );
}

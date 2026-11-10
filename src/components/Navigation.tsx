import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useMapStore } from '@/store';

const navItems = [
  {
    path: '/',
    label: 'Map',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
      </svg>
    ),
  },
  // Due and Things are hidden for the alpha (mapping + measuring focus).
  // Re-add these entries to bring them back.
  // {
  //   path: '/due',
  //   label: 'Due',
  //   icon: (
  //     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  //       <circle cx="12" cy="12" r="8.5" strokeWidth={2} />
  //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 7.5V12l3 2" />
  //     </svg>
  //   ),
  // },
  // {
  //   path: '/things',
  //   label: 'Things',
  //   icon: (
  //     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  //     </svg>
  //   ),
  // },
  {
    path: '/settings',
    label: 'Settings',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

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

  return (
    <nav className="bg-white border-t border-stone-200 safe-bottom">
      <div className="flex items-center">
        <NavLink to={navItems[0].path} className={linkClass}>
          {navItems[0].icon}
          <span className="text-xs mt-1 font-medium">{navItems[0].label}</span>
        </NavLink>

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

        <NavLink to={navItems[1].path} className={linkClass}>
          {navItems[1].icon}
          <span className="text-xs mt-1 font-medium">{navItems[1].label}</span>
        </NavLink>
      </div>
    </nav>
  );
}

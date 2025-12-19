import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  Users, 
  Settings, 
  LogOut,
  Clock,
  Package,
  User,
  ChevronRight
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const adminEmail =
    typeof window !== 'undefined'
      ? localStorage.getItem('admin_email') || sessionStorage.getItem('admin_email')
      : null;
  const adminRole =
    typeof window !== 'undefined'
      ? localStorage.getItem('admin_role') || sessionStorage.getItem('admin_role')
      : null;

  const handleLogout = () => {
    // Nettoyer les infos admin des deux stockages
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_email');
    localStorage.removeItem('admin_role');
    localStorage.removeItem('admin_store_id');

    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_email');
    sessionStorage.removeItem('admin_role');
    sessionStorage.removeItem('admin_store_id');

    navigate('/admin/login');
  };

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    {
      section: 'Menu',
      items: [
        { path: '/admin/planning', icon: CalendarIcon, label: 'Planning' },
      ],
    },
    {
      section: 'Gestion',
      items: [
        { path: '/admin/customers', icon: User, label: 'Annuaire clients' },
        { path: '/admin/services', icon: Package, label: 'Prestations' },
        { path: '/admin/availability', icon: Clock, label: 'Disponibilités' },
        { path: '/admin/store-settings', icon: Settings, label: 'Paramètres magasin' },
      ],
    },
    ...(adminRole === 'super_admin'
      ? [
          {
            section: 'Administration',
            items: [
              { path: '/admin/admins', icon: Users, label: 'Gestion des administrateurs' },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Inspired by Figma Mega Dropdown Menu Sidebar */}
      <aside className="w-[335px] bg-[#f7f8f9] border-r border-[#d9dde1] flex flex-col pt-4 pb-0">
        
        {/* Header Section from Design */}
        <div className="px-5 pb-4 border-b border-[#d9dde1] mb-2">
          <div className="flex flex-col items-start gap-0">
            <h1 className="font-['Overpass'] font-extrabold text-[24px] leading-[28px] text-[#005162] mb-1">
              Administration
            </h1>
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-1 group"
            >
              <span className="font-['Inter'] text-[12.8px] leading-[16px] text-[#005162] group-hover:underline">
                Retour au site
              </span>
              <ChevronRight className="h-[14px] w-[14px] text-[#005162]" />
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto px-0 scrollbar-thin scrollbar-thumb-[#b3bac3] scrollbar-track-transparent">
          {menuItems.map((section, idx) => (
            <div key={idx} className="mb-2">
              <p className="px-5 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {section.section}
              </p>
              <div className="flex flex-col">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  
                  return (
                    <div key={item.path} className="flex flex-col w-full">
                      <button
                        onClick={() => navigate(item.path)}
                        className={`w-full flex items-center justify-between px-5 py-3 transition-colors group
                          ${active ? 'bg-white shadow-sm' : 'hover:bg-white hover:shadow-sm'}
                        `}
                      >
                        <div className="flex items-center gap-3">
                          {/* We can keep the icon if we want, or remove it to strictly match Figma text-only list items. 
                              The Figma design shows just text "List item". 
                              But preserving icons is usually better for UX in admin panels. 
                              I will keep icons but style them to fit.
                           */}
                          <Icon className={`h-5 w-5 ${active ? 'text-[#005162]' : 'text-gray-500 group-hover:text-[#005162]'}`} />
                          <span className={`font-['Inter'] font-extrabold text-[14px] leading-[18px] ${active ? 'text-[#005162]' : 'text-[#142129]'}`}>
                            {item.label}
                          </span>
                        </div>
                        
                        {/* Right Icon Circle from Figma */}
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-[#f0f7f9] group-hover:bg-[#e1eff2]">
                           <ChevronRight className="h-4 w-4 text-[#005162]" />
                        </div>
                      </button>
                      {/* Divider line as per Figma design (except for last item maybe, but design shows dividers) */}
                      <div className="h-px w-full bg-[#d9dde1]" />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User / Footer */}
        <div className="p-5 border-t border-[#d9dde1] bg-[#f7f8f9]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-[#d9dde1] shadow-sm mb-3">
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs text-gray-500">Connecté en tant que</span>
              <span className="truncate text-sm font-semibold text-[#142129]">
                {adminEmail || 'Admin Alltricks'}
              </span>
            </div>
            <button
              onClick={() => navigate('/admin/settings')}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#005162] transition-colors"
              title="Paramètres du compte"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-[#142129] bg-white border border-[#d9dde1] hover:bg-gray-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-y-auto bg-white">
        {children}
      </main>
    </div>
  );
}

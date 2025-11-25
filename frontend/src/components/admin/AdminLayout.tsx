import { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  Users, 
  Settings, 
  LogOut,
  Clock,
  Package
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
      ]
    },
    {
      section: 'Gestion',
      items: [
        { path: '/admin/services', icon: Package, label: 'Prestations' },
        { path: '/admin/availability', icon: Clock, label: 'Disponibilités' },
        { path: '/admin/settings', icon: Settings, label: 'Paramètres' },
      ]
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-gray-200">
          <img 
            src="/assets/alltricks-logo.svg" 
            alt="Alltricks" 
            className="h-12 w-auto cursor-pointer"
            onClick={() => navigate('/admin/planning')}
          />
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 overflow-y-auto">
          {menuItems.map((section, idx) => (
            <div key={idx} className="mb-6">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-3">
                {section.section}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                        active
                          ? 'bg-gray-900 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">
              Déconnexion{adminEmail ? ` – ${adminEmail}` : ''}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}

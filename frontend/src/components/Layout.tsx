import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bike } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

export default function Layout({ children, showHeader = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {showHeader && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-blue-500 hover:text-blue-600">
              <Bike className="h-8 w-8" />
              <span className="text-xl font-bold">Alltricks Bike Fitting</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/stores" className="text-sm font-medium text-gray-700 hover:text-blue-500">
                Réserver
              </Link>
              <Link to="/admin/login" className="text-sm font-medium text-gray-700 hover:text-blue-500">
                Espace Pro
              </Link>
            </nav>
          </div>
        </header>
      )}
      <main>{children}</main>
    </div>
  );
}

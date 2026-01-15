import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, LayoutDashboard } from 'lucide-react';

export default function ModernBookingConfirmation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const adminToken =
      localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
    setIsAdmin(!!adminToken);
  }, []);

  return (
    <div className="min-h-screen bg-[#eff1f3] flex flex-col">
      <div className="bg-[#005162] text-white border-b border-[#004552] flex-shrink-0">
        <div className="container mx-auto px-4 flex items-center justify-between h-14">
          <div className="w-[180px] flex justify-start">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-white/20 transition-all text-white font-bold text-sm"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Retour</span>
            </button>
          </div>

          <div className="flex-1 flex justify-center">
            <img
              src="/assets/logo_alltricks.png"
              alt="Alltricks"
              className="h-12 w-auto cursor-pointer"
              onClick={() => navigate('/stores')}
            />
          </div>

          <div className="w-[180px] flex justify-end gap-2">
            {isAdmin ? (
              <button
                onClick={() => navigate('/admin/planning')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white font-bold text-sm border border-white/20"
                title="Accéder au planning admin"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden md:inline">Planning</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h1 className="text-xl font-extrabold text-[#142129]">Confirmation</h1>
            <p className="mt-2 text-sm text-gray-600">
              Votre réservation a bien été enregistrée.
            </p>
            {token ? (
              <p className="mt-3 text-xs text-gray-400 break-all">Token: {token}</p>
            ) : null}
            <button
              onClick={() => navigate('/stores')}
              className="mt-6 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#005162] text-white font-semibold hover:bg-[#004552]"
            >
              Revenir aux magasins
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
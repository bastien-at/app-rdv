import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bike } from 'lucide-react';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Card from '../../components/Card';
import { adminLogin } from '../../services/api';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = await adminLogin(email, password);

      const persistentStorage = rememberMe ? localStorage : sessionStorage;
      const ephemeralStorage = rememberMe ? sessionStorage : localStorage;

      // Nettoyer l'autre stockage pour éviter les incohérences
      ephemeralStorage.removeItem('admin_token');
      ephemeralStorage.removeItem('admin_email');
      ephemeralStorage.removeItem('admin_role');
      ephemeralStorage.removeItem('admin_store_id');

      // Stocker le token et l'email dans le stockage choisi
      persistentStorage.setItem('admin_token', token);
      persistentStorage.setItem('admin_email', email);

      // Décoder le JWT pour récupérer le rôle et le store_id
      try {
        const [, payloadBase64] = token.split('.');
        const payloadJson = atob(payloadBase64);
        const payload = JSON.parse(payloadJson) as { role?: string; store_id?: string | null };
        if (payload.role) {
          persistentStorage.setItem('admin_role', payload.role);
        }
        if (payload.store_id) {
          persistentStorage.setItem('admin_store_id', payload.store_id);
        } else {
          persistentStorage.removeItem('admin_store_id');
        }
      } catch {
        // en cas d'erreur de décodage, on continue simplement
      }
      navigate('/admin/dashboard');
    } catch (err) {
      setError('Email ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="text-center mb-6">
            <img
              src="/assets/logo_alltricks.png"
              alt="Alltricks"
              className="h-10 w-auto mx-auto mb-3"
            />
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              Espace Professionnel
            </h1>
            <p className="text-sm text-gray-600">
              Connectez-vous avec votre compte magasin Alltricks
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@alltricks.com"
            />

            <Input
              label="Mot de passe"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-gray-600">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Rester connecté</span>
              </label>
              <button
                type="button"
                onClick={() => navigate('/admin/forgot-password')}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Mot de passe oublié ?
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                {error}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              loading={loading}
            >
              Me connecter
            </Button>
          </form>
        </Card>

      
      </div>
    </div>
  );
}

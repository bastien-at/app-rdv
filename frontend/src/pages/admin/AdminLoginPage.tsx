import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Card from '../../components/Card';
import { adminLogin } from '../../services/api';

type ChangelogEntry = {
  hash: string;
  date: string;
  message: string;
};

type ChangelogData = {
  generatedAt: string;
  entries: ChangelogEntry[];
};

interface AppInfo {
  version: string;
  changelog?: Array<{
    version: string;
    date?: string;
    changes?: string[];
  }>;
}

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);

  const getLatestVersion = (info: AppInfo | null) => {
    if (!info) return null;
    const versions = (info.changelog || []).map((c: any) => c.version).filter(Boolean);
    if (versions.length === 0) return info.version || null;

    const parse = (v: string) => v.split('.').map((x) => Number.parseInt(x, 10) || 0);
    const cmp = (a: string, b: string) => {
      const pa = parse(a);
      const pb = parse(b);
      const len = Math.max(pa.length, pb.length);
      for (let i = 0; i < len; i++) {
        const da = pa[i] ?? 0;
        const db = pb[i] ?? 0;
        if (da !== db) return da - db;
      }
      return 0;
    };

    return versions.sort(cmp).at(-1) || info.version || null;
  };

  useEffect(() => {
    // Rediriger vers le dashboard si déjà connecté
    const token = localStorage.getItem('admin_token') || sessionStorage.getItem('admin_token');
    if (token) {
      navigate('/admin/planning');
    }

    let isMounted = true;

    const loadAppInfo = async () => {
      try {
        const res = await fetch('/app-info.json', { cache: 'no-cache' });
        if (!res.ok) return;
        const data = (await res.json()) as AppInfo;
        if (!isMounted) return;
        if (data && typeof data.version === 'string') setAppInfo(data);
      } catch {
        // Ignore
      }
    };

    loadAppInfo();

    return () => {
      isMounted = false;
    };
  }, []);

  const [changelog, setChangelog] = useState<ChangelogData | null>(null);

  const appVersion = (import.meta.env.VITE_APP_VERSION as string | undefined) || '';
  const appGitSha = (import.meta.env.VITE_APP_GIT_SHA as string | undefined) || '';

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/changelog.json', { cache: 'no-store' });
        if (!res.ok) return;
        const json = (await res.json()) as ChangelogData;
        if (!cancelled) {
          setChangelog(json);
        }
      } catch {
        // ignore
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

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

          {getLatestVersion(appInfo) ? (
            <div className="mt-5 text-center text-xs text-gray-400">
              Version {getLatestVersion(appInfo)}
            </div>
          ) : null}
        </Card>

        <div className="mt-4 text-xs text-gray-500">
          <div className="flex items-center justify-between">
          
            {changelog?.generatedAt ? (
              <span>
                Changelog {new Date(changelog.generatedAt).toLocaleString()}
              </span>
            ) : null}
          </div>

          {changelog?.entries?.length ? (
            <div className="mt-2 border border-gray-200 bg-white rounded-lg p-3 max-h-40 overflow-auto">
              <div className="font-medium text-gray-700 mb-2">Derniers changements</div>
              <div className="space-y-2">
                {changelog.entries.slice(0, 10).map((entry) => (
                  <div key={entry.hash} className="text-gray-600">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate">{entry.message}</span>
                      <span className="shrink-0 font-mono text-[10px]">{entry.hash.slice(0, 7)}</span>
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {new Date(entry.date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { User, Lock, Save } from 'lucide-react';
import { changePassword } from '../../services/api';
import Input from '../../components/Input';
import Button from '../../components/Button';
import AdminLayout from '../../components/admin/AdminLayout';

export default function AdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const adminEmail = localStorage.getItem('admin_email') || sessionStorage.getItem('admin_email');
  const adminRole = localStorage.getItem('admin_role') || sessionStorage.getItem('admin_role');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      setSuccess('Mot de passe modifié avec succès');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Erreur changement mot de passe:', err);
      setError(err.response?.data?.error || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-6 max-w-4xl mx-auto overflow-y-auto h-full">
        <div className="flex items-center gap-3 mb-6">
          <User className="h-8 w-8 text-[#005162]" />
          <h1 className="text-2xl font-bold text-[#142129]">Mon Compte</h1>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Informations du profil */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-[#142129] mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-gray-400" />
              Informations personnelles
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
                  {adminEmail}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
                <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 capitalize">
                  {adminRole === 'super_admin' ? 'Super Administrateur' : 'Administrateur Magasin'}
                </div>
              </div>
            </div>
          </div>

          {/* Changement de mot de passe */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-[#142129] mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-gray-400" />
              Changer mon mot de passe
            </h2>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-100">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg text-sm border border-green-100">
                {success}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
              <Input
                label="Mot de passe actuel"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <Input
                label="Nouveau mot de passe"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                label="Confirmer le nouveau mot de passe"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[#005162] hover:bg-[#003a46] text-white"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Modification...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Save className="h-4 w-4" />
                      Mettre à jour le mot de passe
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

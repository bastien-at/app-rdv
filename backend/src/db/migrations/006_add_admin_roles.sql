-- Migration: Ajout du système de rôles pour les administrateurs

-- Ajouter la colonne role à la table admins
ALTER TABLE admins ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'store_admin';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- Créer un index sur store_id pour les requêtes
CREATE INDEX IF NOT EXISTS idx_admins_store_id ON admins(store_id);

-- Mettre à jour les admins existants pour qu'ils soient super_admin par défaut
UPDATE admins SET role = 'super_admin' WHERE role IS NULL OR role = 'store_admin';

-- Ajouter une contrainte pour vérifier que les store_admin ont un store_id
ALTER TABLE admins ADD CONSTRAINT check_store_admin_has_store 
  CHECK (role != 'store_admin' OR store_id IS NOT NULL);

-- Commentaires
COMMENT ON COLUMN admins.role IS 'Role de l''administrateur: super_admin ou store_admin';
COMMENT ON COLUMN admins.store_id IS 'ID du magasin pour les store_admin (NULL pour super_admin)';

-- Migration pour améliorer la table services

-- Ajouter les nouvelles colonnes
ALTER TABLE services 
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- Créer une table pour l'historique des modifications
CREATE TABLE IF NOT EXISTS service_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'activated', 'deactivated'
  changed_fields JSONB, -- Les champs modifiés avec anciennes et nouvelles valeurs
  changed_by VARCHAR(255), -- Email ou nom de l'admin
  changed_at TIMESTAMP DEFAULT NOW(),
  snapshot JSONB -- Snapshot complet du service au moment du changement
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_services_store_id ON services(store_id);
CREATE INDEX IF NOT EXISTS idx_services_type ON services(service_type);
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_service_history_service_id ON service_history(service_id);
CREATE INDEX IF NOT EXISTS idx_service_history_changed_at ON service_history(changed_at DESC);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour services
DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at 
    BEFORE UPDATE ON services 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour documentation
COMMENT ON COLUMN services.category IS 'Catégorie de la prestation (ex: Entretien, Réparation, Diagnostic)';
COMMENT ON COLUMN services.image_url IS 'URL de l''image de la prestation';
COMMENT ON COLUMN services.is_global IS 'Si true, le service est disponible dans tous les magasins';
COMMENT ON TABLE service_history IS 'Historique de toutes les modifications apportées aux services';

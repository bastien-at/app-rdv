-- Ajout des colonnes has_workshop et has_fitting à la table stores
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS has_workshop BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS has_fitting BOOLEAN DEFAULT true;

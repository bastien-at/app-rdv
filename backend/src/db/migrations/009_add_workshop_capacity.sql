-- Ajout de la colonne workshop_capacity à la table stores
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS workshop_capacity INTEGER DEFAULT 1;

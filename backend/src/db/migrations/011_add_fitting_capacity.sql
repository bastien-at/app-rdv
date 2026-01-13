-- Ajout de la colonne fitting_capacity à la table stores
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS fitting_capacity INTEGER DEFAULT 1;

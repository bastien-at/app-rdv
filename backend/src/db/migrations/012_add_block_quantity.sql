-- Ajoute une colonne quantity à la table availability_blocks
-- Par défaut à 1, représente le nombre de places (techniciens) bloqués
ALTER TABLE availability_blocks ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- Migration pour ajouter la colonne public_notes à la table bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS public_notes TEXT;

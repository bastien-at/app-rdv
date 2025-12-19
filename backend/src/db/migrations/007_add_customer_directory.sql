-- Table de l'annuaire des clients
CREATE TABLE IF NOT EXISTS customer_directory (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  firstname VARCHAR(100) NOT NULL,
  lastname VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  first_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  -- Référence à la première réservation du client
  total_bookings INT DEFAULT 1,
  -- Nombre total de réservations du client
  last_booking_date TIMESTAMP,
  -- Date de la dernière réservation
  notes TEXT,
  -- Notes internes sur le client
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_customer_email_per_store UNIQUE(store_id, email)
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_customer_directory_store ON customer_directory(store_id);
CREATE INDEX IF NOT EXISTS idx_customer_directory_email ON customer_directory(email);
CREATE INDEX IF NOT EXISTS idx_customer_directory_name ON customer_directory(lastname, firstname);
CREATE INDEX IF NOT EXISTS idx_customer_directory_active ON customer_directory(active);

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS update_customer_directory_updated_at ON customer_directory;
CREATE TRIGGER update_customer_directory_updated_at BEFORE UPDATE ON customer_directory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

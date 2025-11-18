-- Table pour l'état des lieux du vélo
CREATE TABLE IF NOT EXISTS bike_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  technician_id UUID REFERENCES technicians(id),
  comments TEXT,
  status VARCHAR(50) DEFAULT 'draft', -- draft, completed, sent
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  UNIQUE(booking_id)
);

-- Table pour les photos de l'état des lieux
CREATE TABLE IF NOT EXISTS inspection_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES bike_inspections(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  photo_order INTEGER DEFAULT 1,
  caption TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table pour le PV de réception
CREATE TABLE IF NOT EXISTS reception_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  inspection_id UUID REFERENCES bike_inspections(id),
  technician_id UUID REFERENCES technicians(id),
  
  -- Informations client
  customer_signature_data TEXT, -- Base64 de la signature
  customer_signed_at TIMESTAMP,
  
  -- Travaux réalisés
  work_performed TEXT,
  parts_replaced TEXT,
  recommendations TEXT,
  
  -- Tarification
  labor_cost DECIMAL(10, 2),
  parts_cost DECIMAL(10, 2),
  total_cost DECIMAL(10, 2),
  
  -- Statut
  status VARCHAR(50) DEFAULT 'draft', -- draft, signed, sent
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  
  UNIQUE(booking_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_bike_inspections_booking ON bike_inspections(booking_id);
CREATE INDEX IF NOT EXISTS idx_inspection_photos_inspection ON inspection_photos(inspection_id);
CREATE INDEX IF NOT EXISTS idx_reception_reports_booking ON reception_reports(booking_id);

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_bike_inspections_updated_at ON bike_inspections;
CREATE TRIGGER update_bike_inspections_updated_at
  BEFORE UPDATE ON bike_inspections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_reception_reports_updated_at ON reception_reports;
CREATE TRIGGER update_reception_reports_updated_at
  BEFORE UPDATE ON reception_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

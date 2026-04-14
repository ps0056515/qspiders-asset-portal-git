-- QSpiders Asset Management Portal — Supabase Schema
-- Run this in your Supabase SQL editor after creating a new project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Centers
CREATE TABLE centers (
  id TEXT PRIMARY KEY,         -- e.g. BLR-MH
  name TEXT NOT NULL,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO centers VALUES
  ('BLR-MH', 'Bangalore - MH', 'Bangalore'),
  ('BLR-JP', 'Bangalore - JP Nagar', 'Bangalore'),
  ('MYS-01', 'Mysuru - Main', 'Mysuru'),
  ('HYD-01', 'Hyderabad - Main', 'Hyderabad'),
  ('CHN-01', 'Chennai - Main', 'Chennai'),
  ('PUN-01', 'Pune - Main', 'Pune');

-- User profiles (linked to Supabase Auth)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin','ops_admin','center_head','center_staff','auditor')),
  center_id TEXT REFERENCES centers(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assets
CREATE TABLE assets (
  id TEXT PRIMARY KEY,             -- e.g. QS-BLR-MH-IT-0042
  asset_name TEXT NOT NULL,
  category TEXT NOT NULL,
  sub_category TEXT,
  make_brand TEXT,
  model_no TEXT,
  serial_no TEXT,
  center_id TEXT NOT NULL REFERENCES centers(id),
  center_name TEXT,
  location TEXT,
  quantity INTEGER DEFAULT 1,
  condition TEXT DEFAULT 'Good' CHECK (condition IN ('Good','Fair','Needs Repair','Damaged')),
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active','Under Maintenance','In Storage','Decommissioned','Pending Decommission','Pending Transfer')),
  purchase_date DATE,
  purchase_value NUMERIC(12,2),
  vendor TEXT,
  warranty_expiry DATE,
  custodian TEXT,
  department TEXT,
  last_verified DATE,
  verified_by TEXT,
  photo_url TEXT,
  notes TEXT,
  decommission_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transfers
CREATE TABLE transfers (
  id TEXT PRIMARY KEY,           -- e.g. TRF-001
  asset_id TEXT NOT NULL REFERENCES assets(id),
  asset_name TEXT,
  from_center TEXT NOT NULL REFERENCES centers(id),
  to_center TEXT NOT NULL REFERENCES centers(id),
  quantity INTEGER DEFAULT 1,
  status TEXT DEFAULT 'Pending Approval' CHECK (status IN ('Pending Approval','In Transit','Completed','Rejected')),
  reason TEXT,
  new_location TEXT,
  new_custodian TEXT,
  initiated_by TEXT,
  approved_by TEXT,
  dispatched_date DATE,
  received_date DATE,
  transfer_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Maintenance
CREATE TABLE maintenance_records (
  id TEXT PRIMARY KEY,           -- e.g. MNT-001
  asset_id TEXT NOT NULL REFERENCES assets(id),
  asset_name TEXT,
  center_id TEXT NOT NULL REFERENCES centers(id),
  issue TEXT NOT NULL,
  vendor TEXT,
  technician TEXT,
  start_date DATE,
  expected_return DATE,
  actual_return DATE,
  estimated_cost NUMERIC(10,2),
  actual_cost NUMERIC(10,2),
  status TEXT DEFAULT 'In Progress' CHECK (status IN ('In Progress','Completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  asset_id TEXT,
  asset_name TEXT,
  center TEXT,
  "user" TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  details TEXT
);

-- Row-level security policies
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admin / ops admin / auditor: see all
CREATE POLICY "admin_all_assets" ON assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'ops_admin', 'auditor')
    )
  );

-- Center head / center staff: see own center
CREATE POLICY "center_own_assets" ON assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND center_id = assets.center_id
    )
  );

-- Indexes for performance
CREATE INDEX assets_center_id_idx ON assets(center_id);
CREATE INDEX assets_status_idx ON assets(status);
CREATE INDEX assets_category_idx ON assets(category);
CREATE INDEX transfers_asset_id_idx ON transfers(asset_id);
CREATE INDEX maintenance_asset_id_idx ON maintenance_records(asset_id);
CREATE INDEX audit_logs_asset_id_idx ON audit_logs(asset_id);
CREATE INDEX audit_logs_timestamp_idx ON audit_logs(timestamp DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const { Pool, Client } = pg

const DB_URL = process.env.DATABASE_URL
// Parse the DB URL to get the DB name and build a "bootstrap" URL pointing to postgres
function buildBootstrapUrl(dbUrl) {
  const url = new URL(dbUrl)
  const dbName = url.pathname.slice(1) // strip leading /
  url.pathname = '/postgres'
  return { bootstrapUrl: url.toString(), dbName }
}

let pool

async function ensureDatabaseExists() {
  const { bootstrapUrl, dbName } = buildBootstrapUrl(DB_URL)
  const client = new Client({ connectionString: bootstrapUrl, ssl: false })
  await client.connect()
  const { rows } = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName])
  if (!rows.length) {
    console.log(`[DB] Database "${dbName}" not found — creating it…`)
    await client.query(`CREATE DATABASE "${dbName}"`)
    console.log(`[DB] Database "${dbName}" created ✓`)
  } else {
    console.log(`[DB] Database "${dbName}" already exists ✓`)
  }
  await client.end()
}

export async function query(text, params) {
  const client = await pool.connect()
  try {
    const res = await client.query(text, params)
    return res
  } finally {
    client.release()
  }
}

export async function initDB() {
  // Step 1: ensure the target database exists
  await ensureDatabaseExists()

  // Step 2: create pool pointing at the target DB
  pool = new Pool({
    connectionString: DB_URL,
    ssl: false,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 10,
  })

  pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message)
  })

  const client = await pool.connect()
  try {
    console.log('[DB] Connected to PostgreSQL. Initialising schema…')

    await client.query(`
      CREATE TABLE IF NOT EXISTS centers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        city TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await client.query(`
      INSERT INTO centers (id, name, city) VALUES
        ('BLR-MH', 'Bangalore - MH', 'Bangalore'),
        ('BLR-JP', 'Bangalore - JP Nagar', 'Bangalore'),
        ('MYS-01', 'Mysuru - Main', 'Mysuru'),
        ('HYD-01', 'Hyderabad - Main', 'Hyderabad'),
        ('CHN-01', 'Chennai - Main', 'Chennai'),
        ('PUN-01', 'Pune - Main', 'Pune')
      ON CONFLICT (id) DO NOTHING
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('super_admin','ops_admin','center_head','center_staff','auditor')),
        center_id TEXT REFERENCES centers(id),
        center_name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await client.query(`
      INSERT INTO users (name, email, password_hash, role, center_id, center_name) VALUES
        ('Rajesh Kumar',  'superadmin@qspiders.com', 'admin123', 'super_admin', NULL, 'HQ'),
        ('Priya Sharma',  'opsadmin@qspiders.com',   'ops123',   'ops_admin',   NULL, 'All Centers'),
        ('Arun Nair',     'centerhead@qspiders.com', 'head123',  'center_head', 'BLR-MH', 'Bangalore - MH'),
        ('Deepa Rao',     'staff@qspiders.com',      'staff123', 'center_staff','BLR-MH', 'Bangalore - MH'),
        ('Vikram Singh',  'auditor@qspiders.com',    'audit123', 'auditor',     NULL, 'All Centers')
      ON CONFLICT (email) DO NOTHING
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
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
        condition TEXT DEFAULT 'Good',
        status TEXT DEFAULT 'Active',
        purchase_date DATE,
        purchase_value NUMERIC(12,2),
        vendor TEXT,
        warranty_start DATE,
        warranty_expiry DATE,
        custodian TEXT,
        department TEXT,
        last_verified DATE,
        verified_by TEXT,
        photo_url TEXT,
        invoice_url TEXT,
        asset_type TEXT DEFAULT 'common',
        employee_name TEXT,
        employee_id TEXT,
        notes TEXT,
        decommission_reason TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Migrations for existing DBs
    await client.query(`
      ALTER TABLE assets
        ADD COLUMN IF NOT EXISTS warranty_start DATE,
        ADD COLUMN IF NOT EXISTS invoice_url TEXT,
        ADD COLUMN IF NOT EXISTS asset_type TEXT DEFAULT 'common',
        ADD COLUMN IF NOT EXISTS employee_name TEXT,
        ADD COLUMN IF NOT EXISTS employee_id TEXT
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS transfers (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL REFERENCES assets(id),
        asset_name TEXT,
        from_center TEXT NOT NULL REFERENCES centers(id),
        to_center TEXT NOT NULL REFERENCES centers(id),
        quantity INTEGER DEFAULT 1,
        status TEXT DEFAULT 'Pending Approval',
        reason TEXT,
        new_location TEXT,
        new_custodian TEXT,
        initiated_by TEXT,
        approved_by TEXT,
        dispatched_date DATE,
        received_date DATE,
        transfer_date DATE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS maintenance_records (
        id TEXT PRIMARY KEY,
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
        status TEXT DEFAULT 'In Progress',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY,
        action TEXT NOT NULL,
        asset_id TEXT,
        asset_name TEXT,
        center TEXT,
        actor TEXT,
        timestamp TIMESTAMPTZ DEFAULT NOW(),
        details TEXT
      )
    `)

    // Seed assets if none exist
    const { rows } = await client.query('SELECT COUNT(*) FROM assets')
    if (parseInt(rows[0].count) === 0) {
      console.log('[DB] Seeding initial asset data…')
      await seedAssets(client)
    }

    console.log('[DB] Schema ready ✓')
  } finally {
    client.release()
  }
}


async function seedAssets(client) {
  const assets = [
    ['QS-BLR-MH-IT-0001','HP LaserJet Pro M404n','IT & Electronics','Peripherals','HP','M404n','HPLJ001234','BLR-MH','Bangalore - MH','Lab 2, 2nd Floor',1,'Good','Active','2023-06-15',18500,'HP India','2026-06-14','Deepa Rao','IT','2025-12-10','Arun Nair',null,''],
    ['QS-BLR-MH-IT-0002','Dell OptiPlex 7090 Desktop','IT & Electronics','Computers & Laptops','Dell','OptiPlex 7090','DLOP7090-002','BLR-MH','Bangalore - MH','Lab 1, 1st Floor',10,'Good','Active','2022-04-10',52000,'Dell Technologies','2025-04-09','Deepa Rao','IT','2025-12-10','Arun Nair',null,'Lab 1 computers'],
    ['QS-BLR-MH-HVAC-0001','Voltas 1.5T Inverter AC','HVAC & Electrical','Air Conditioners','Voltas','183V CAZD','VOLT-AC-003','BLR-MH','Bangalore - MH','Lab 1, 1st Floor',2,'Good','Active','2021-03-20',38000,'Voltas Ltd','2024-03-19','Arun Nair','Facilities','2025-12-10','Arun Nair',null,''],
    ['QS-BLR-MH-FURN-0001','Ergonomic Office Chair','Furniture','Chairs','Godrej Interio','Vertex HB','GI-CH-0042','BLR-MH','Bangalore - MH','Training Hall, 3rd Floor',30,'Fair','Active','2020-08-01',6500,'Godrej Interio',null,'Deepa Rao','Admin','2025-12-10','Arun Nair',null,'5 chairs need cushion replacement'],
    ['QS-BLR-MH-IT-0003','Epson EB-X51 Projector','IT & Electronics','Projectors & Displays','Epson','EB-X51','EPSON-PROJ-005','BLR-MH','Bangalore - MH','Training Hall, 3rd Floor',1,'Needs Repair','Under Maintenance','2021-11-15',32000,'Epson India','2024-11-14','Arun Nair','IT','2025-11-20','Deepa Rao',null,'Lamp replacement needed'],
    ['QS-BLR-JP-IT-0001','Lenovo ThinkPad E14 Gen 4','IT & Electronics','Computers & Laptops','Lenovo','ThinkPad E14 G4','LEN-E14-006','BLR-JP','Bangalore - JP Nagar','Lab A, 1st Floor',15,'Good','Active','2023-09-01',65000,'Lenovo India','2026-08-31','Ramesh T','IT','2025-12-05','Suresh M',null,''],
    ['QS-BLR-JP-FURN-0001','Computer Lab Desk (Student)','Furniture','Tables & Desks','Featherlite','FL-COMP-DESK','FL-DESK-007','BLR-JP','Bangalore - JP Nagar','Lab A, 1st Floor',15,'Good','Active','2023-09-01',8500,'Featherlite',null,'Ramesh T','Admin','2025-12-05','Suresh M',null,''],
    ['QS-MYS-01-IT-0001','HP EliteDesk 800 G6 Desktop','IT & Electronics','Computers & Laptops','HP','EliteDesk 800 G6','HP-ED800-008','MYS-01','Mysuru - Main','Computer Lab, 2nd Floor',20,'Good','Active','2022-07-15',55000,'HP India','2025-07-14','Kavitha B','IT','2025-11-30','Mohan S',null,''],
    ['QS-MYS-01-HVAC-0001','Daikin 2T Split AC','HVAC & Electrical','Air Conditioners','Daikin','FTKF60TV','DKIN-AC-009','MYS-01','Mysuru - Main','Server Room, Ground Floor',1,'Good','Active','2022-01-10',45000,'Daikin India','2027-01-09','Mohan S','Facilities','2025-11-30','Mohan S',null,''],
    ['QS-HYD-01-IT-0001','Cisco Catalyst 2960 Switch','IT & Electronics','Networking','Cisco','Catalyst 2960-24TC','CISCO-SW-010','HYD-01','Hyderabad - Main','Server Room, Ground Floor',2,'Good','Active','2021-05-20',28000,'Cisco India','2024-05-19','Venkat R','IT','2025-10-15','Sanjay P',null,''],
    ['QS-HYD-01-FURN-0001','Whiteboard (6x4 ft)','Furniture','Whiteboards','Camlin','WB-6x4','CAM-WB-011','HYD-01','Hyderabad - Main','Training Hall 1, 1st Floor',5,'Good','Active','2022-06-01',4500,'Camlin Ltd',null,'Sanjay P','Admin','2025-10-15','Sanjay P',null,''],
    ['QS-CHN-01-IT-0001','Samsung 27" Monitor','IT & Electronics','Projectors & Displays','Samsung','LC27F396FHWXXL','SAM-MON-012','CHN-01','Chennai - Main','Lab 1, 1st Floor',12,'Good','Active','2023-03-10',16500,'Samsung India','2026-03-09','Meena K','IT','2025-12-01','Rajan T',null,''],
    ['QS-PUN-01-HVAC-0001','APC Smart-UPS 2200VA','HVAC & Electrical','UPS & Inverters','APC','SMT2200I','APC-UPS-013','PUN-01','Pune - Main','Server Room, Ground Floor',1,'Fair','Active','2020-11-01',42000,'APC by Schneider','2023-10-31','Nikhil D','IT','2025-09-20','Pooja L',null,'Battery replacement due'],
    ['QS-BLR-MH-IT-0004','Dell PowerEdge R740 Server','IT & Electronics','Servers','Dell','PowerEdge R740','DELL-SRV-014','BLR-MH','Bangalore - MH','Server Room, Ground Floor',1,'Good','Active','2022-02-14',285000,'Dell Technologies','2025-02-13','Arun Nair','IT','2025-12-10','Arun Nair',null,'Primary application server'],
    ['QS-BLR-MH-FURN-0002','Instructor Podium with Mic','Furniture','Podiums','Godrej Interio','POD-MIC-STD','GI-POD-015','BLR-MH','Bangalore - MH','Training Hall, 3rd Floor',1,'Good','Pending Decommission','2019-06-10',15000,'Godrej Interio',null,'Deepa Rao','Admin','2025-12-10','Arun Nair',null,'Mic system broken, requested decommission'],
  ]
  for (const a of assets) {
    await client.query(`
      INSERT INTO assets (id,asset_name,category,sub_category,make_brand,model_no,serial_no,center_id,center_name,location,quantity,condition,status,purchase_date,purchase_value,vendor,warranty_expiry,custodian,department,last_verified,verified_by,photo_url,notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
      ON CONFLICT (id) DO NOTHING
    `, a)
  }

  // Seed audit logs
  await client.query(`
    INSERT INTO audit_logs (action, asset_id, asset_name, center, actor, timestamp, details) VALUES
      ('Asset Added','QS-BLR-MH-IT-0001','HP LaserJet Pro M404n','BLR-MH','Deepa Rao', NOW() - INTERVAL '5 days','New asset registered'),
      ('Asset Added','QS-BLR-MH-IT-0002','Dell OptiPlex 7090 Desktop','BLR-MH','Deepa Rao', NOW() - INTERVAL '10 days','Batch of 10 registered'),
      ('Maintenance Started','QS-BLR-MH-IT-0003','Epson EB-X51 Projector','BLR-MH','Arun Nair', NOW() - INTERVAL '2 days','Sent for lamp replacement'),
      ('Decommission Requested','QS-BLR-MH-FURN-0002','Instructor Podium with Mic','BLR-MH','Deepa Rao', NOW() - INTERVAL '1 day','Mic system broken')
  `)

  // Seed a maintenance record
  await client.query(`
    INSERT INTO maintenance_records (id,asset_id,asset_name,center_id,issue,vendor,technician,start_date,expected_return,estimated_cost,status)
    VALUES ('MNT-001','QS-BLR-MH-IT-0003','Epson EB-X51 Projector','BLR-MH','Projector lamp blown','Epson Service Centre','Ravi Kumar','2025-12-01','2026-01-15',8500,'In Progress')
    ON CONFLICT (id) DO NOTHING
  `)
}

export default { query }

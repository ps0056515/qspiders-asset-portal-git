// Mock data for demo mode (when Supabase is not configured)

export const CENTERS = [
  { id: 'BLR-MH', name: 'Bangalore - MH', city: 'Bangalore' },
  { id: 'BLR-JP', name: 'Bangalore - JP Nagar', city: 'Bangalore' },
  { id: 'MYS-01', name: 'Mysuru - Main', city: 'Mysuru' },
  { id: 'HYD-01', name: 'Hyderabad - Main', city: 'Hyderabad' },
  { id: 'CHN-01', name: 'Chennai - Main', city: 'Chennai' },
  { id: 'PUN-01', name: 'Pune - Main', city: 'Pune' },
]

export const CATEGORIES = [
  { id: 'IT', name: 'IT & Electronics', subcategories: ['Computers & Laptops', 'Peripherals', 'Networking', 'Servers', 'Projectors & Displays', 'Software'] },
  { id: 'FURN', name: 'Furniture', subcategories: ['Chairs', 'Tables & Desks', 'Cabinets & Storage', 'Whiteboards', 'Podiums'] },
  { id: 'HVAC', name: 'HVAC & Electrical', subcategories: ['Air Conditioners', 'Fans', 'Electrical Panels', 'UPS & Inverters', 'CCTV & Security'] },
  { id: 'INFRA', name: 'Infrastructure', subcategories: ['Flooring', 'Partitions', 'Lighting', 'Fire Safety'] },
  { id: 'OTHER', name: 'Other', subcategories: ['Stationery', 'Housekeeping', 'Kitchen Appliances', 'Miscellaneous'] },
]

export const CONDITIONS = ['Good', 'Fair', 'Needs Repair', 'Damaged']
export const STATUSES = ['Active', 'Under Maintenance', 'In Storage', 'Decommissioned', 'Pending Decommission', 'Pending Transfer']

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  OPS_ADMIN: 'ops_admin',
  CENTER_HEAD: 'center_head',
  CENTER_STAFF: 'center_staff',
  AUDITOR: 'auditor',
}

export const DEMO_USERS = [
  { id: '1', email: 'superadmin@qspiders.com', password: 'admin123', name: 'Rajesh Kumar', role: ROLES.SUPER_ADMIN, center_id: null, center_name: 'HQ' },
  { id: '2', email: 'opsadmin@qspiders.com', password: 'ops123', name: 'Priya Sharma', role: ROLES.OPS_ADMIN, center_id: null, center_name: 'All Centers' },
  { id: '3', email: 'centerhead@qspiders.com', password: 'head123', name: 'Arun Nair', role: ROLES.CENTER_HEAD, center_id: 'BLR-MH', center_name: 'Bangalore - MH' },
  { id: '4', email: 'staff@qspiders.com', password: 'staff123', name: 'Deepa Rao', role: ROLES.CENTER_STAFF, center_id: 'BLR-MH', center_name: 'Bangalore - MH' },
  { id: '5', email: 'auditor@qspiders.com', password: 'audit123', name: 'Vikram Singh', role: ROLES.AUDITOR, center_id: null, center_name: 'All Centers' },
]

const generateId = (center, category, num) =>
  `QS-${center}-${category}-${String(num).padStart(4, '0')}`

export const MOCK_ASSETS = [
  { id: generateId('BLR-MH', 'IT', 1), asset_name: 'HP LaserJet Pro M404n', category: 'IT & Electronics', sub_category: 'Peripherals', make_brand: 'HP', model_no: 'M404n', serial_no: 'HPLJ001234', center_id: 'BLR-MH', center_name: 'Bangalore - MH', location: 'Lab 2, 2nd Floor', quantity: 1, condition: 'Good', status: 'Active', purchase_date: '2023-06-15', purchase_value: 18500, vendor: 'HP India', warranty_expiry: '2026-06-14', custodian: 'Deepa Rao', department: 'IT', last_verified: '2025-12-10', verified_by: 'Arun Nair', photo_url: null, notes: '' },
  { id: generateId('BLR-MH', 'IT', 2), asset_name: 'Dell OptiPlex 7090 Desktop', category: 'IT & Electronics', sub_category: 'Computers & Laptops', make_brand: 'Dell', model_no: 'OptiPlex 7090', serial_no: 'DLOP7090-002', center_id: 'BLR-MH', center_name: 'Bangalore - MH', location: 'Lab 1, 1st Floor', quantity: 10, condition: 'Good', status: 'Active', purchase_date: '2022-04-10', purchase_value: 52000, vendor: 'Dell Technologies', warranty_expiry: '2025-04-09', custodian: 'Deepa Rao', department: 'IT', last_verified: '2025-12-10', verified_by: 'Arun Nair', photo_url: null, notes: 'Lab 1 computers' },
  { id: generateId('BLR-MH', 'HVAC', 1), asset_name: 'Voltas 1.5T Inverter AC', category: 'HVAC & Electrical', sub_category: 'Air Conditioners', make_brand: 'Voltas', model_no: '183V CAZD', serial_no: 'VOLT-AC-003', center_id: 'BLR-MH', center_name: 'Bangalore - MH', location: 'Lab 1, 1st Floor', quantity: 2, condition: 'Good', status: 'Active', purchase_date: '2021-03-20', purchase_value: 38000, vendor: 'Voltas Ltd', warranty_expiry: '2024-03-19', custodian: 'Arun Nair', department: 'Facilities', last_verified: '2025-12-10', verified_by: 'Arun Nair', photo_url: null, notes: '' },
  { id: generateId('BLR-MH', 'FURN', 1), asset_name: 'Ergonomic Office Chair', category: 'Furniture', sub_category: 'Chairs', make_brand: 'Godrej Interio', model_no: 'Vertex HB', serial_no: 'GI-CH-0042', center_id: 'BLR-MH', center_name: 'Bangalore - MH', location: 'Training Hall, 3rd Floor', quantity: 30, condition: 'Fair', status: 'Active', purchase_date: '2020-08-01', purchase_value: 6500, vendor: 'Godrej Interio', warranty_expiry: '2023-07-31', custodian: 'Deepa Rao', department: 'Admin', last_verified: '2025-12-10', verified_by: 'Arun Nair', photo_url: null, notes: '5 chairs need cushion replacement' },
  { id: generateId('BLR-MH', 'IT', 3), asset_name: 'Epson EB-X51 Projector', category: 'IT & Electronics', sub_category: 'Projectors & Displays', make_brand: 'Epson', model_no: 'EB-X51', serial_no: 'EPSON-PROJ-005', center_id: 'BLR-MH', center_name: 'Bangalore - MH', location: 'Training Hall, 3rd Floor', quantity: 1, condition: 'Needs Repair', status: 'Under Maintenance', purchase_date: '2021-11-15', purchase_value: 32000, vendor: 'Epson India', warranty_expiry: '2024-11-14', custodian: 'Arun Nair', department: 'IT', last_verified: '2025-11-20', verified_by: 'Deepa Rao', photo_url: null, notes: 'Lamp replacement needed' },
  { id: generateId('BLR-JP', 'IT', 1), asset_name: 'Lenovo ThinkPad E14 Gen 4', category: 'IT & Electronics', sub_category: 'Computers & Laptops', make_brand: 'Lenovo', model_no: 'ThinkPad E14 G4', serial_no: 'LEN-E14-006', center_id: 'BLR-JP', center_name: 'Bangalore - JP Nagar', location: 'Lab A, 1st Floor', quantity: 15, condition: 'Good', status: 'Active', purchase_date: '2023-09-01', purchase_value: 65000, vendor: 'Lenovo India', warranty_expiry: '2026-08-31', custodian: 'Ramesh T', department: 'IT', last_verified: '2025-12-05', verified_by: 'Suresh M', photo_url: null, notes: '' },
  { id: generateId('BLR-JP', 'FURN', 1), asset_name: 'Computer Lab Desk (Student)', category: 'Furniture', sub_category: 'Tables & Desks', make_brand: 'Featherlite', model_no: 'FL-COMP-DESK', serial_no: 'FL-DESK-007', center_id: 'BLR-JP', center_name: 'Bangalore - JP Nagar', location: 'Lab A, 1st Floor', quantity: 15, condition: 'Good', status: 'Active', purchase_date: '2023-09-01', purchase_value: 8500, vendor: 'Featherlite', warranty_expiry: null, custodian: 'Ramesh T', department: 'Admin', last_verified: '2025-12-05', verified_by: 'Suresh M', photo_url: null, notes: '' },
  { id: generateId('MYS-01', 'IT', 1), asset_name: 'HP EliteDesk 800 G6 Desktop', category: 'IT & Electronics', sub_category: 'Computers & Laptops', make_brand: 'HP', model_no: 'EliteDesk 800 G6', serial_no: 'HP-ED800-008', center_id: 'MYS-01', center_name: 'Mysuru - Main', location: 'Computer Lab, 2nd Floor', quantity: 20, condition: 'Good', status: 'Active', purchase_date: '2022-07-15', purchase_value: 55000, vendor: 'HP India', warranty_expiry: '2025-07-14', custodian: 'Kavitha B', department: 'IT', last_verified: '2025-11-30', verified_by: 'Mohan S', photo_url: null, notes: '' },
  { id: generateId('MYS-01', 'HVAC', 1), asset_name: 'Daikin 2T Split AC', category: 'HVAC & Electrical', sub_category: 'Air Conditioners', make_brand: 'Daikin', model_no: 'FTKF60TV', serial_no: 'DKIN-AC-009', center_id: 'MYS-01', center_name: 'Mysuru - Main', location: 'Server Room, Ground Floor', quantity: 1, condition: 'Good', status: 'Active', purchase_date: '2022-01-10', purchase_value: 45000, vendor: 'Daikin India', warranty_expiry: '2027-01-09', custodian: 'Mohan S', department: 'Facilities', last_verified: '2025-11-30', verified_by: 'Mohan S', photo_url: null, notes: '' },
  { id: generateId('HYD-01', 'IT', 1), asset_name: 'Cisco Catalyst 2960 Switch', category: 'IT & Electronics', sub_category: 'Networking', make_brand: 'Cisco', model_no: 'Catalyst 2960-24TC', serial_no: 'CISCO-SW-010', center_id: 'HYD-01', center_name: 'Hyderabad - Main', location: 'Server Room, Ground Floor', quantity: 2, condition: 'Good', status: 'Active', purchase_date: '2021-05-20', purchase_value: 28000, vendor: 'Cisco India', warranty_expiry: '2024-05-19', custodian: 'Venkat R', department: 'IT', last_verified: '2025-10-15', verified_by: 'Sanjay P', photo_url: null, notes: '' },
  { id: generateId('HYD-01', 'FURN', 1), asset_name: 'Whiteboard (6x4 ft)', category: 'Furniture', sub_category: 'Whiteboards', make_brand: 'Camlin', model_no: 'WB-6x4', serial_no: 'CAM-WB-011', center_id: 'HYD-01', center_name: 'Hyderabad - Main', location: 'Training Hall 1, 1st Floor', quantity: 5, condition: 'Good', status: 'Active', purchase_date: '2022-06-01', purchase_value: 4500, vendor: 'Camlin Ltd', warranty_expiry: null, custodian: 'Sanjay P', department: 'Admin', last_verified: '2025-10-15', verified_by: 'Sanjay P', photo_url: null, notes: '' },
  { id: generateId('CHN-01', 'IT', 1), asset_name: 'Samsung 27" Monitor', category: 'IT & Electronics', sub_category: 'Projectors & Displays', make_brand: 'Samsung', model_no: 'LC27F396FHWXXL', serial_no: 'SAM-MON-012', center_id: 'CHN-01', center_name: 'Chennai - Main', location: 'Lab 1, 1st Floor', quantity: 12, condition: 'Good', status: 'Active', purchase_date: '2023-03-10', purchase_value: 16500, vendor: 'Samsung India', warranty_expiry: '2026-03-09', custodian: 'Meena K', department: 'IT', last_verified: '2025-12-01', verified_by: 'Rajan T', photo_url: null, notes: '' },
  { id: generateId('PUN-01', 'IT', 1), asset_name: 'APC Smart-UPS 2200VA', category: 'HVAC & Electrical', sub_category: 'UPS & Inverters', make_brand: 'APC', model_no: 'SMT2200I', serial_no: 'APC-UPS-013', center_id: 'PUN-01', center_name: 'Pune - Main', location: 'Server Room, Ground Floor', quantity: 1, condition: 'Fair', status: 'Active', purchase_date: '2020-11-01', purchase_value: 42000, vendor: 'APC by Schneider', warranty_expiry: '2023-10-31', custodian: 'Nikhil D', department: 'IT', last_verified: '2025-09-20', verified_by: 'Pooja L', photo_url: null, notes: 'Battery replacement due' },
  { id: generateId('BLR-MH', 'IT', 4), asset_name: 'Dell PowerEdge R740 Server', category: 'IT & Electronics', sub_category: 'Servers', make_brand: 'Dell', model_no: 'PowerEdge R740', serial_no: 'DELL-SRV-014', center_id: 'BLR-MH', center_name: 'Bangalore - MH', location: 'Server Room, Ground Floor', quantity: 1, condition: 'Good', status: 'Active', purchase_date: '2022-02-14', purchase_value: 285000, vendor: 'Dell Technologies', warranty_expiry: '2025-02-13', custodian: 'Arun Nair', department: 'IT', last_verified: '2025-12-10', verified_by: 'Arun Nair', photo_url: null, notes: 'Primary application server' },
  { id: generateId('BLR-MH', 'FURN', 2), asset_name: 'Instructor Podium with Mic', category: 'Furniture', sub_category: 'Podiums', make_brand: 'Godrej Interio', model_no: 'POD-MIC-STD', serial_no: 'GI-POD-015', center_id: 'BLR-MH', center_name: 'Bangalore - MH', location: 'Training Hall, 3rd Floor', quantity: 1, condition: 'Good', status: 'Pending Decommission', purchase_date: '2019-06-10', purchase_value: 15000, vendor: 'Godrej Interio', warranty_expiry: null, custodian: 'Deepa Rao', department: 'Admin', last_verified: '2025-12-10', verified_by: 'Arun Nair', photo_url: null, notes: 'Mic system broken, requested decommission' },
]

export const MOCK_TRANSFERS = [
  { id: 'TRF-001', asset_id: generateId('BLR-MH', 'IT', 2), asset_name: 'Dell OptiPlex 7090 Desktop', from_center: 'BLR-MH', to_center: 'MYS-01', quantity: 2, status: 'Completed', reason: 'New lab setup at Mysuru', initiated_by: 'Arun Nair', approved_by: 'Priya Sharma', dispatched_date: '2025-10-05', received_date: '2025-10-07', transfer_date: '2025-10-07' },
  { id: 'TRF-002', asset_id: generateId('BLR-JP', 'IT', 1), asset_name: 'Lenovo ThinkPad E14 Gen 4', from_center: 'BLR-JP', to_center: 'CHN-01', quantity: 3, status: 'Pending Approval', reason: 'Chennai center expansion', initiated_by: 'Suresh M', approved_by: null, dispatched_date: null, received_date: null, transfer_date: null },
  { id: 'TRF-003', asset_id: generateId('HYD-01', 'IT', 1), asset_name: 'Cisco Catalyst 2960 Switch', from_center: 'HYD-01', to_center: 'PUN-01', quantity: 1, status: 'In Transit', reason: 'Pune network upgrade', initiated_by: 'Venkat R', approved_by: 'Priya Sharma', dispatched_date: '2026-04-10', received_date: null, transfer_date: null },
]

export const MOCK_MAINTENANCE = [
  { id: 'MNT-001', asset_id: generateId('BLR-MH', 'IT', 3), asset_name: 'Epson EB-X51 Projector', center_id: 'BLR-MH', issue: 'Projector lamp blown, image flickering', vendor: 'Epson Service Centre', technician: 'Ravi Kumar', start_date: '2025-12-01', expected_return: '2026-01-15', actual_return: null, estimated_cost: 8500, actual_cost: null, status: 'In Progress' },
  { id: 'MNT-002', asset_id: generateId('PUN-01', 'IT', 1), asset_name: 'APC Smart-UPS 2200VA', center_id: 'PUN-01', issue: 'Battery backup time reduced significantly', vendor: 'APC Authorised Service', technician: 'Sunil Mehta', start_date: '2025-11-20', expected_return: '2025-12-10', actual_return: '2025-12-08', estimated_cost: 12000, actual_cost: 11500, status: 'Completed' },
]

export const MOCK_AUDIT_LOGS = [
  { id: 1, action: 'Asset Added', asset_id: generateId('BLR-MH', 'IT', 1), asset_name: 'HP LaserJet Pro M404n', center: 'BLR-MH', user: 'Deepa Rao', timestamp: '2026-04-14T09:30:00', details: 'New asset registered via mobile app' },
  { id: 2, action: 'Transfer Initiated', asset_id: generateId('BLR-JP', 'IT', 1), asset_name: 'Lenovo ThinkPad E14 Gen 4', center: 'BLR-JP', user: 'Suresh M', timestamp: '2026-04-13T14:20:00', details: 'Transfer to Chennai - Main requested' },
  { id: 3, action: 'Maintenance Started', asset_id: generateId('BLR-MH', 'IT', 3), asset_name: 'Epson EB-X51 Projector', center: 'BLR-MH', user: 'Arun Nair', timestamp: '2026-04-12T11:00:00', details: 'Sent for lamp replacement' },
  { id: 4, action: 'Decommission Requested', asset_id: generateId('BLR-MH', 'FURN', 2), asset_name: 'Instructor Podium with Mic', center: 'BLR-MH', user: 'Deepa Rao', timestamp: '2026-04-11T16:45:00', details: 'Mic system broken, beyond economic repair' },
  { id: 5, action: 'Asset Verified', asset_id: generateId('MYS-01', 'IT', 1), asset_name: 'HP EliteDesk 800 G6 Desktop', center: 'MYS-01', user: 'Mohan S', timestamp: '2026-04-10T10:30:00', details: 'Quarterly audit — marked as Verified' },
  { id: 6, action: 'Transfer Completed', asset_id: generateId('BLR-MH', 'IT', 2), asset_name: 'Dell OptiPlex 7090 Desktop', center: 'MYS-01', user: 'Kavitha B', timestamp: '2026-04-09T15:00:00', details: 'Receipt confirmed at Mysuru - Main' },
  { id: 7, action: 'Asset Edited', asset_id: generateId('HYD-01', 'FURN', 1), asset_name: 'Whiteboard (6x4 ft)', center: 'HYD-01', user: 'Sanjay P', timestamp: '2026-04-08T09:15:00', details: 'Updated quantity from 4 to 5' },
  { id: 8, action: 'Maintenance Completed', asset_id: generateId('PUN-01', 'IT', 1), asset_name: 'APC Smart-UPS 2200VA', center: 'PUN-01', user: 'Pooja L', timestamp: '2026-04-07T14:00:00', details: 'Battery replaced, returned to active' },
  { id: 9, action: 'Asset Added', asset_id: generateId('CHN-01', 'IT', 1), asset_name: 'Samsung 27" Monitor', center: 'CHN-01', user: 'Meena K', timestamp: '2026-04-06T11:30:00', details: 'Batch of 12 monitors registered' },
  { id: 10, action: 'Transfer Approved', asset_id: generateId('HYD-01', 'IT', 1), asset_name: 'Cisco Catalyst 2960 Switch', center: 'HYD-01', user: 'Priya Sharma', timestamp: '2026-04-05T16:00:00', details: 'Transfer to Pune approved' },
]

export const WARRANTY_ALERTS = MOCK_ASSETS.filter(a => {
  if (!a.warranty_expiry) return false
  const expiry = new Date(a.warranty_expiry)
  const now = new Date()
  const days = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24))
  return days <= 90 && days > 0
}).map(a => ({
  asset_id: a.id,
  asset_name: a.asset_name,
  center: a.center_name,
  warranty_expiry: a.warranty_expiry,
  days_left: Math.ceil((new Date(a.warranty_expiry) - new Date()) / (1000 * 60 * 60 * 24)),
}))

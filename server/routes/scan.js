import { Router } from 'express'
import multer from 'multer'
import Anthropic from '@anthropic-ai/sdk'
import fs from 'fs'

const router = Router()

// Keep image in memory (no disk write needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Only image files are accepted'))
  },
})

// ─── Layer 1: Google Cloud Vision ────────────────────────────────────────────
async function callGoogleVision(imageBase64, mimeType) {
  const apiKey = process.env.GOOGLE_VISION_API_KEY
  if (!apiKey) throw new Error('GOOGLE_VISION_API_KEY not configured')

  const body = {
    requests: [{
      image: { content: imageBase64 },
      features: [
        { type: 'LABEL_DETECTION',    maxResults: 20 },
        { type: 'LOGO_DETECTION',     maxResults: 10 },
        { type: 'TEXT_DETECTION',     maxResults: 1  },
        { type: 'OBJECT_LOCALIZATION',maxResults: 10 },
      ],
    }],
  }

  const res = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  )

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Google Vision API error: ${err}`)
  }

  const data = await res.json()
  const response = data.responses?.[0]

  const labels = (response.labelAnnotations || []).map(l => l.description)
  const logos  = (response.logoAnnotations  || []).map(l => l.description)
  const objects = (response.localizedObjectAnnotations || []).map(o => o.name)
  const ocrText = response.textAnnotations?.[0]?.description || ''

  return { labels, logos, objects, ocrText }
}

// ─── Layer 2: Claude Sonnet reasoning ────────────────────────────────────────
async function callClaude(visionResult) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const client = new Anthropic({ apiKey })

  const { labels, logos, objects, ocrText } = visionResult

  const prompt = `You are an asset classification assistant for QSpiders training centers across India.
Analyze the following data detected from an asset photo and map it to the QSpiders asset taxonomy.

Vision API detected:
- Labels: ${[...labels, ...objects].join(', ') || 'none'}
- Logos/Brands: ${logos.join(', ') || 'none'}
- OCR text: ${ocrText.replace(/\n/g, ' ').substring(0, 500) || 'none'}

QSpiders asset categories:
- IT & Electronics (sub: Computers & Laptops, Peripherals, Networking, Servers, Projectors & Displays, Software)
- Furniture (sub: Chairs, Tables & Desks, Cabinets & Storage, Whiteboards, Podiums)
- HVAC & Electrical (sub: Air Conditioners, Fans, Electrical Panels, UPS & Inverters, CCTV & Security)
- Infrastructure (sub: Flooring, Partitions, Lighting, Fire Safety)
- Other (sub: Stationery, Housekeeping, Kitchen Appliances, Miscellaneous)

Return ONLY valid JSON — no preamble, no explanation, no markdown.
JSON schema:
{
  "asset_name": "full descriptive product name",
  "category": "one of the 5 categories above",
  "sub_category": "matching sub-category",
  "make_brand": "brand/manufacturer name or empty string",
  "model_no": "model number extracted from OCR or empty string",
  "serial_no": "serial number extracted from OCR or empty string",
  "condition_estimate": "Good|Fair|Damaged",
  "confidence_pct": <integer 0-100>,
  "confidence_reason": "brief reason for confidence score",
  "notes": "any additional observations"
}`

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].text.trim()

  // Strip any accidental markdown fences
  const jsonText = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim()

  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error(`Claude returned invalid JSON: ${jsonText.substring(0, 200)}`)
  }

  return parsed
}

// ─── Demo / fallback response ─────────────────────────────────────────────────
function demoResult(filename) {
  const name = (filename || '').toLowerCase()

  if (name.includes('laptop') || name.includes('computer') || name.includes('dell') || name.includes('hp') || name.includes('lenovo')) {
    return {
      asset_name: 'HP EliteBook 840 G9 Laptop',
      category: 'IT & Electronics',
      sub_category: 'Computers & Laptops',
      make_brand: 'HP',
      model_no: 'EliteBook 840 G9',
      serial_no: '',
      condition_estimate: 'Good',
      confidence_pct: 91,
      confidence_reason: 'Brand logo and product form factor clearly identified',
      notes: 'Serial number label not clearly visible — enter manually',
      _demo: true,
    }
  }
  if (name.includes('chair') || name.includes('furniture')) {
    return {
      asset_name: 'Ergonomic Office Chair',
      category: 'Furniture',
      sub_category: 'Chairs',
      make_brand: 'Godrej Interio',
      model_no: '',
      serial_no: '',
      condition_estimate: 'Good',
      confidence_pct: 84,
      confidence_reason: 'Office chair form factor detected; brand inferred from style',
      notes: '',
      _demo: true,
    }
  }
  if (name.includes('ac') || name.includes('hvac') || name.includes('air')) {
    return {
      asset_name: 'Split AC Unit 1.5T',
      category: 'HVAC & Electrical',
      sub_category: 'Air Conditioners',
      make_brand: 'Daikin',
      model_no: '',
      serial_no: '',
      condition_estimate: 'Good',
      confidence_pct: 82,
      confidence_reason: 'AC indoor unit identified; brand from label',
      notes: '',
      _demo: true,
    }
  }
  if (name.includes('printer')) {
    return {
      asset_name: 'HP LaserJet Pro M404n',
      category: 'IT & Electronics',
      sub_category: 'Peripherals',
      make_brand: 'HP',
      model_no: 'M404n',
      serial_no: 'HPLJ' + Math.floor(Math.random() * 900000 + 100000),
      condition_estimate: 'Good',
      confidence_pct: 94,
      confidence_reason: 'HP LaserJet product line clearly detected from logo and form',
      notes: '',
      _demo: true,
    }
  }

  // Generic fallback
  return {
    asset_name: 'Office Equipment',
    category: 'IT & Electronics',
    sub_category: 'Peripherals',
    make_brand: '',
    model_no: '',
    serial_no: '',
    condition_estimate: 'Good',
    confidence_pct: 52,
    confidence_reason: 'Unable to identify specific product — low confidence, manual entry recommended',
    notes: 'Please fill in asset details manually',
    _demo: true,
  }
}

// ─── POST /api/scan ───────────────────────────────────────────────────────────
router.post('/', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image file provided' })

    const imageBase64 = req.file.buffer.toString('base64')
    const mimeType = req.file.mimetype
    const filename = req.file.originalname || ''

    const hasVisionKey  = !!process.env.GOOGLE_VISION_API_KEY
    const hasClaudeKey  = !!process.env.ANTHROPIC_API_KEY
    const demoMode      = !hasVisionKey || !hasClaudeKey

    if (demoMode) {
      console.log('[Scan] Demo mode — API keys not configured. Returning mock result.')
      const result = demoResult(filename)
      return res.json({
        ...result,
        _demo: true,
        _demo_reason: !hasVisionKey
          ? 'GOOGLE_VISION_API_KEY not set'
          : 'ANTHROPIC_API_KEY not set',
        vision_raw: null,
      })
    }

    // Layer 1 — Vision
    console.log('[Scan] Calling Google Cloud Vision…')
    const visionResult = await callGoogleVision(imageBase64, mimeType)
    console.log('[Scan] Vision labels:', visionResult.labels.slice(0, 5))
    console.log('[Scan] Vision logos:', visionResult.logos)

    // Layer 2 — Claude
    console.log('[Scan] Calling Claude Sonnet for field mapping…')
    const claudeResult = await callClaude(visionResult)
    console.log('[Scan] Claude confidence:', claudeResult.confidence_pct)

    res.json({
      ...claudeResult,
      _demo: false,
      vision_raw: {
        labels: visionResult.labels,
        logos: visionResult.logos,
        objects: visionResult.objects,
        ocr_snippet: visionResult.ocrText.substring(0, 300),
      },
    })
  } catch (err) {
    console.error('[Scan] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ─── POST /api/scan/url — scan from image URL ─────────────────────────────────
router.post('/url', async (req, res) => {
  try {
    const { url } = req.body
    if (!url) return res.status(400).json({ error: 'url is required' })

    const imgRes = await fetch(url)
    if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`)
    const buffer = Buffer.from(await imgRes.arrayBuffer())
    const imageBase64 = buffer.toString('base64')
    const mimeType = imgRes.headers.get('content-type') || 'image/jpeg'

    const hasVisionKey = !!process.env.GOOGLE_VISION_API_KEY
    const hasClaudeKey = !!process.env.ANTHROPIC_API_KEY

    if (!hasVisionKey || !hasClaudeKey) {
      return res.json({ ...demoResult(''), _demo: true })
    }

    const visionResult = await callGoogleVision(imageBase64, mimeType)
    const claudeResult = await callClaude(visionResult)
    res.json({ ...claudeResult, _demo: false, vision_raw: visionResult })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router

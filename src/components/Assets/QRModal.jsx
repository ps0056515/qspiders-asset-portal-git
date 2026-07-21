import { useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { X, Download, Printer } from 'lucide-react'

export default function QRModal({ asset, onClose }) {
  const qrRef = useRef(null)

  const handlePrint = () => {
    const printContent = `
      <html><head><title>QR - ${asset.id}</title>
      <style>
        body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
        .sticker { border: 2px dashed #ccc; padding: 16px; text-align: center; width: 200px; }
        .sticker svg { width: 150px; height: 150px; }
        .asset-id { font-family: monospace; font-size: 11px; font-weight: bold; margin-top: 8px; word-break: break-all; }
        .asset-name { font-size: 10px; color: #555; margin-top: 4px; }
        .center { font-size: 9px; color: #888; margin-top: 2px; }
      </style></head>
      <body>
        <div class="sticker">
          ${qrRef.current?.innerHTML || ''}
          <div class="asset-id">${asset.id}</div>
          <div class="asset-name">${asset.asset_name}</div>
          <div class="center">${asset.center_name}</div>
        </div>
      </body></html>
    `
    const win = window.open('', '_blank')
    win.document.write(printContent)
    win.document.close()
    win.print()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Asset QR Code</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center gap-4">
          {/* QR sticker preview */}
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center w-48">
            <div ref={qrRef} className="flex justify-center">
              <QRCodeSVG
                value={`QS-ASSET::${asset.id}::${asset.asset_name}`}
                size={130}
                level="M"
                includeMargin={false}
                fgColor="#1e293b"
              />
            </div>
            <p className="font-mono text-[10px] font-bold mt-2 text-slate-700 break-all">{asset.id}</p>
            <p className="text-[9px] text-slate-500 mt-1 leading-tight">{asset.asset_name}</p>
            <p className="text-[8px] text-slate-400 mt-0.5">{asset.center_name}</p>
          </div>

          <div className="text-center text-xs text-slate-500 space-y-0.5">
            <p>Recommended print size: 3cm × 3cm</p>
            <p>Use Avery label sheets or sticker paper</p>
          </div>

          {/* Asset details */}
          <div className="w-full space-y-1.5 bg-slate-50 rounded-lg p-3">
            {[
              ['Asset ID', asset.id],
              ['Name', asset.asset_name],
              ['Center', asset.center_name],
              ['Location', asset.location],
              ['Serial No', asset.serial_no || '—'],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-slate-400">{label}</span>
                <span className="text-slate-700 font-medium text-right max-w-40 truncate">{val}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 w-full">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium transition"
            >
              <Printer size={15} />
              Print Sticker
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

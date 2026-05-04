import { writeFileSync } from 'fs'
import zlib from 'zlib'

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (const byte of buf) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0) }
  return (crc ^ 0xFFFFFFFF) >>> 0
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii'), l = Buffer.alloc(4), c = Buffer.alloc(4)
  l.writeUInt32BE(data.length); c.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([l, t, data, c])
}
function makePng(size, drawFn) {
  const pixels = new Uint8Array(size * size * 4)
  drawFn(pixels, size)
  const rows = []
  for (let y = 0; y < size; y++) {
    const row = Buffer.alloc(1 + size * 3); row[0] = 0
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      row[1 + x*3] = pixels[i]; row[2 + x*3] = pixels[i+1]; row[3 + x*3] = pixels[i+2]
    }
    rows.push(row)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size,0); ihdr.writeUInt32BE(size,4); ihdr[8]=8; ihdr[9]=2
  return Buffer.concat([
    Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))), chunk('IEND', Buffer.alloc(0))
  ])
}

function drawIcon(pixels, size) {
  const cx = size / 2, cy = size / 2, r = size * 0.44
  // Dark navy background + circular button
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4
    const dx = x - cx, dy = y - cy
    pixels[i] = 0x0d; pixels[i+1] = 0x11; pixels[i+2] = 0x17; pixels[i+3] = 255
    if (dx*dx + dy*dy <= r*r) { pixels[i] = 0x1a; pixels[i+1] = 0x2f; pixels[i+2] = 0x47 }
  }

  function setPixel(x, y, alpha) {
    x = Math.round(x); y = Math.round(y)
    if (x < 0 || y < 0 || x >= size || y >= size) return
    const i = (y * size + x) * 4
    const a = alpha / 255
    pixels[i]   = Math.round(pixels[i]   * (1-a) + 0xe2 * a)
    pixels[i+1] = Math.round(pixels[i+1] * (1-a) + 0xea * a)
    pixels[i+2] = Math.round(pixels[i+2] * (1-a) + 0xf4 * a)
  }
  function plotLine(x0, y0, x1, y1, w) {
    const dx = x1-x0, dy = y1-y0, len = Math.sqrt(dx*dx+dy*dy)
    const steps = Math.ceil(len*2)
    for (let s = 0; s <= steps; s++) {
      const t = s/steps, px = x0+dx*t, py = y0+dy*t
      for (let oy = -w; oy <= w; oy++) for (let ox = -w; ox <= w; ox++) {
        if (ox*ox+oy*oy <= w*w) setPixel(px+ox, py+oy, 255)
      }
    }
  }
  function plotArc(cx, cy, rx, ry, a0, a1, w) {
    const steps = Math.ceil(Math.abs(a1-a0) * Math.max(rx,ry))
    for (let s = 0; s <= steps; s++) {
      const a = a0 + (a1-a0)*s/steps
      const px = cx + rx*Math.cos(a), py = cy + ry*Math.sin(a)
      for (let oy = -w; oy <= w; oy++) for (let ox = -w; ox <= w; ox++) {
        if (ox*ox+oy*oy <= w*w) setPixel(px+ox, py+oy, 255)
      }
    }
  }
  function plotRoundRect(x, y, w, h, rr, sw) {
    plotArc(x+rr, y+rr, rr, rr, Math.PI, Math.PI*1.5, sw)
    plotArc(x+w-rr, y+rr, rr, rr, Math.PI*1.5, Math.PI*2, sw)
    plotArc(x+rr, y+h-rr, rr, rr, Math.PI*0.5, Math.PI, sw)
    plotArc(x+w-rr, y+h-rr, rr, rr, 0, Math.PI*0.5, sw)
    plotLine(x+rr, y, x+w-rr, y, sw)
    plotLine(x+rr, y+h, x+w-rr, y+h, sw)
    plotLine(x, y+rr, x, y+h-rr, sw)
    plotLine(x+w, y+rr, x+w, y+h-rr, sw)
  }

  const sc = size / 100
  const sw = Math.max(2, Math.round(2.8 * sc))

  // Mic body — pill shape
  plotRoundRect(40*sc, 25*sc, 20*sc, 30*sc, 10*sc, sw)
  // Bracket arc below mic
  plotArc(50*sc, 55*sc, 16*sc, 16*sc, Math.PI, 0, sw)
  // Vertical stem
  plotLine(50*sc, 71*sc, 50*sc, 80*sc, sw)
}

for (const size of [192, 512]) {
  const png = makePng(size, drawIcon)
  const path = `C:/Users/mcble/Claude Code/Echo Mail/public/icons/icon-${size}.png`
  writeFileSync(path, png)
  console.log(`icon-${size}.png — ${png.length} bytes`)
}

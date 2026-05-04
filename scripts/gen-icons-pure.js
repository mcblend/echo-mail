// Generates minimal PNG icons without any dependencies
import { createWriteStream, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import zlib from 'zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../public/icons')
mkdirSync(outDir, { recursive: true })

function crc32(buf) {
  let crc = 0xFFFFFFFF
  for (const byte of buf) {
    crc ^= byte
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0)
  }
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const crcInput = Buffer.concat([typeBytes, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcInput))
  return Buffer.concat([len, typeBytes, data, crc])
}

function makePng(size, r, g, b) {
  // IHDR
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)  // width
  ihdr.writeUInt32BE(size, 4)  // height
  ihdr[8] = 8   // bit depth
  ihdr[9] = 2   // color type RGB
  ihdr[10] = 0  // compression
  ihdr[11] = 0  // filter
  ihdr[12] = 0  // interlace

  // Raw pixel data: each row has a filter byte (0) + width*3 bytes
  const rawRow = Buffer.alloc(1 + size * 3)
  rawRow[0] = 0 // filter none
  for (let x = 0; x < size; x++) {
    rawRow[1 + x * 3] = r
    rawRow[2 + x * 3] = g
    rawRow[3 + x * 3] = b
  }
  const rows = []
  for (let y = 0; y < size; y++) rows.push(rawRow)
  const raw = Buffer.concat(rows)
  const compressed = zlib.deflateSync(raw)

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

for (const size of [192, 512]) {
  const png = makePng(size, 0x1a, 0x2f, 0x47) // #1a2f47 navy blue
  const path = join(outDir, `icon-${size}.png`)
  require('fs').writeFileSync(path, png)
  console.log(`icon-${size}.png created (${png.length} bytes)`)
}

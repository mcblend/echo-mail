// Run with: node scripts/gen-icons.js
// Generates minimal PNG icons for the PWA manifest
import { createCanvas } from 'canvas'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '../public/icons')
mkdirSync(outDir, { recursive: true })

function generateIcon(size) {
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Background
  ctx.fillStyle = '#0d1117'
  ctx.beginPath()
  ctx.roundRect(0, 0, size, size, size * 0.2)
  ctx.fill()

  // Mic icon
  const cx = size / 2
  const cy = size / 2
  const r = size * 0.18
  const bodyH = size * 0.36
  ctx.strokeStyle = '#7ab0e0'
  ctx.lineWidth = size * 0.06
  ctx.lineCap = 'round'

  // Mic body (rounded rect)
  ctx.beginPath()
  ctx.roundRect(cx - r, cy - bodyH / 2, r * 2, bodyH, r)
  ctx.stroke()

  // Stand arc
  const arcR = size * 0.22
  ctx.beginPath()
  ctx.arc(cx, cy + bodyH * 0.1, arcR, Math.PI, 0, true)
  ctx.stroke()

  // Stand line
  ctx.beginPath()
  ctx.moveTo(cx, cy + bodyH * 0.1 + arcR)
  ctx.lineTo(cx, cy + bodyH * 0.1 + arcR + size * 0.08)
  ctx.stroke()

  // Base
  ctx.beginPath()
  ctx.moveTo(cx - size * 0.12, cy + bodyH * 0.1 + arcR + size * 0.08)
  ctx.lineTo(cx + size * 0.12, cy + bodyH * 0.1 + arcR + size * 0.08)
  ctx.stroke()

  return canvas.toBuffer('image/png')
}

for (const size of [192, 512]) {
  writeFileSync(join(outDir, `icon-${size}.png`), generateIcon(size))
  console.log(`Generated icon-${size}.png`)
}

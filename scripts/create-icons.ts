/**
 * アイコン生成スクリプト
 * SVG → PNG(1024x1024) → ICO + ICNS
 * 実行: npx ts-node --project tsconfig.scripts.json scripts/create-icons.ts
 */
import sharp from 'sharp'
import * as png2icons from 'png2icons'
import * as fs from 'fs/promises'
import * as path from 'path'

const RESOURCES_DIR = path.join(process.cwd(), 'resources')

// FloatPad アイコン SVG（ノートパッドをモチーフにした幾何学デザイン）
const SVG = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#252535"/>
      <stop offset="100%" stop-color="#1a1a28"/>
    </linearGradient>
  </defs>

  <!-- 背景 -->
  <rect width="1024" height="1024" rx="220" fill="url(#bg)"/>

  <!-- ノートパッド本体 -->
  <rect x="190" y="160" width="520" height="660" rx="48" fill="#2a2a3e"/>
  <rect x="190" y="160" width="520" height="660" rx="48"
        fill="none" stroke="#4a9eff" stroke-width="18" opacity="0.5"/>

  <!-- メモ行 -->
  <rect x="248" y="300" width="400" height="26" rx="13" fill="#4a9eff"/>
  <rect x="248" y="374" width="400" height="26" rx="13" fill="#4a9eff" opacity="0.65"/>
  <rect x="248" y="448" width="300" height="26" rx="13" fill="#4a9eff" opacity="0.45"/>
  <rect x="248" y="522" width="340" height="26" rx="13" fill="#4a9eff" opacity="0.30"/>

  <!-- 電卓ドット（右下） -->
  <circle cx="730" cy="620" r="38" fill="#4a9eff" opacity="0.9"/>
  <circle cx="830" cy="620" r="38" fill="#4a9eff" opacity="0.65"/>
  <circle cx="730" cy="720" r="38" fill="#4a9eff" opacity="0.65"/>
  <circle cx="830" cy="720" r="38" fill="#4a9eff" opacity="0.40"/>

  <!-- Webグローブ（右上） -->
  <circle cx="790" cy="240" r="90" fill="none" stroke="#4a9eff" stroke-width="18" opacity="0.7"/>
  <line  x1="790" y1="152" x2="790" y2="328" stroke="#4a9eff" stroke-width="14" opacity="0.5"/>
  <ellipse cx="790" cy="240" rx="46" ry="90" fill="none" stroke="#4a9eff" stroke-width="14" opacity="0.5"/>
  <line  x1="703" y1="210" x2="877" y2="210" stroke="#4a9eff" stroke-width="14" opacity="0.5"/>
  <line  x1="703" y1="270" x2="877" y2="270" stroke="#4a9eff" stroke-width="14" opacity="0.5"/>
</svg>`

async function run(): Promise<void> {
  await fs.mkdir(RESOURCES_DIR, { recursive: true })

  // SVG → PNG 1024x1024
  const pngPath = path.join(RESOURCES_DIR, 'icon.png')
  await sharp(Buffer.from(SVG))
    .resize(1024, 1024)
    .png()
    .toFile(pngPath)
  console.log(`✓ ${pngPath}`)

  const pngBuf = await fs.readFile(pngPath)

  // PNG → ICO（Windows 用）
  const ico = png2icons.createICO(pngBuf, png2icons.BILINEAR, 0, false, true)
  if (!ico) throw new Error('ICO 変換に失敗しました')
  const icoPath = path.join(RESOURCES_DIR, 'icon.ico')
  await fs.writeFile(icoPath, ico)
  console.log(`✓ ${icoPath}`)

  // PNG → ICNS（macOS 用）
  const icns = png2icons.createICNS(pngBuf, png2icons.BILINEAR, 0)
  if (!icns) throw new Error('ICNS 変換に失敗しました')
  const icnsPath = path.join(RESOURCES_DIR, 'icon.icns')
  await fs.writeFile(icnsPath, icns)
  console.log(`✓ ${icnsPath}`)

  console.log('\nアイコン生成完了')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})

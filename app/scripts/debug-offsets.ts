import { getCompDefAccOffset } from '@arcium-hq/client'

const names = ['private_trade', 'batch_clear', 'resolve_market']

for (const name of names) {
  const offsetBytes = getCompDefAccOffset(name)
  const offsetNum = Buffer.from(offsetBytes).readUInt32LE(0)
  console.log(`${name}:`)
  console.log(`  Offset bytes: ${Buffer.from(offsetBytes).toString('hex')}`)
  console.log(`  Offset number: ${offsetNum}`)
}

console.log('\nMXE registered offsets: [1, 3754481436, 548528962, 484556922]')

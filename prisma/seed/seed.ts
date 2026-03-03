import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const generateId = (pubCode: string, langCode: string, format: string) =>
  `${pubCode}|${langCode}|${format}`

const CDN_BASE = 'https://b.jw-cdn.org/apis/cdh-pub-images/v1/images'
const WP_ISSUE_MONTHS: Record<string, string> = { '1': '01', '2': '05', '3': '09' }
const G_ISSUE_MONTHS: Record<string, string> = { '1': '03', '2': '07', '3': '11' }
const NO_IMAGE_PREFIXES = ['ldstd', 'ldcrt', 'jwcd', 'mvp']

function getUrl(pub: string, lang: string): string | null {
  const code = pub.toLowerCase()
  if (NO_IMAGE_PREFIXES.some((p) => code.startsWith(p))) return null
  if (code.startsWith('nwt')) return `${CDN_BASE}?pub=nwt&lang=T`
  const wpMatch = code.match(/^wp(\d{2})\.(\d)$/)
  if (wpMatch) {
    const month = WP_ISSUE_MONTHS[wpMatch[2]]
    if (month) return `${CDN_BASE}?pub=wp&issue=20${wpMatch[1]}${month}&lang=${lang}`
  }
  const gMatch = code.match(/^g(\d{2})\.(\d)$/)
  if (gMatch) {
    const month = G_ISSUE_MONTHS[gMatch[2]]
    if (month) return `${CDN_BASE}?pub=g&issue=20${gMatch[1]}${month}&lang=${lang}`
  }
  return `${CDN_BASE}?pub=${pub}&lang=${lang}`
}

async function main() {
  console.log('Iniciando Seed...')

  // ─── 1. Congregações ─────────────────────────────────
  const vilaYara = await prisma.congregation.upsert({
    where: { id: 'vila-yara-id' },
    update: {},
    create: { id: 'vila-yara-id', name: 'Vila Yara', language: 'T', isCoordinator: true },
  })

  await prisma.congregation.upsert({
    where: { id: 'pres-altina-id' },
    update: {},
    create: { id: 'pres-altina-id', name: 'Presidente Altina', language: 'T', isCoordinator: false },
  })

  await prisma.congregation.upsert({
    where: { id: 'lingua-inglesa-id' },
    update: {},
    create: { id: 'lingua-inglesa-id', name: 'Língua Inglesa', language: 'E', isCoordinator: false },
  })

  console.log('Congregações criadas')

  // ─── 2. Localizações ─────────────────────────────────
  const locations = [
    { id: 'loc-arm-e1', name: 'Armário Esquerdo 1', labelCode: 'ARM-E1', subStockType: 'ARMARIO' as const, description: 'Prateleira 1' },
    { id: 'loc-arm-e2', name: 'Armário Esquerdo 2', labelCode: 'ARM-E2', subStockType: 'ARMARIO' as const, description: 'Prateleira 2' },
    { id: 'loc-arm-e3', name: 'Armário Esquerdo 3', labelCode: 'ARM-E3', subStockType: 'ARMARIO' as const, description: 'Prateleira 3' },
    { id: 'loc-arm-d1', name: 'Armário Direito 1', labelCode: 'ARM-D1', subStockType: 'ARMARIO' as const, description: 'Prateleira 1' },
    { id: 'loc-arm-d2', name: 'Armário Direito 2', labelCode: 'ARM-D2', subStockType: 'ARMARIO' as const, description: 'Prateleira 2' },
    { id: 'loc-arm-d3', name: 'Armário Direito 3', labelCode: 'ARM-D3', subStockType: 'ARMARIO' as const, description: 'Prateleira 3' },
    { id: 'loc-exp-e', name: 'Expositor Esquerdo', labelCode: 'EXP-E', subStockType: 'MOSTRUARIO' as const, description: 'Mostruário esquerdo' },
    { id: 'loc-exp-d', name: 'Expositor Direito', labelCode: 'EXP-D', subStockType: 'MOSTRUARIO' as const, description: 'Mostruário direito' },
  ]

  for (const loc of locations) {
    await prisma.location.upsert({
      where: { id: loc.id },
      update: {},
      create: { ...loc, congregationId: vilaYara.id },
    })
  }

  console.log('8 localizações criadas')

  // Localização da Língua Inglesa
  await prisma.location.upsert({
    where: { id: 'loc-eng-arm' },
    update: {},
    create: { id: 'loc-eng-arm', name: 'Armário Inglês', labelCode: 'ENG-ARM', subStockType: 'ARMARIO', description: 'Publicações em inglês', congregationId: 'lingua-inglesa-id' },
  })

  // Itens em inglês para Língua Inglesa
  const englishItems = [
    { code: 'nwt', lang: 'E', format: 'NORMAL', title: 'New World Translation of the Holy Scriptures', cat: 'Bibles', spc: false, ord: true, qty: 8, avg: 2 },
    { code: 'wp24.1', lang: 'E', format: 'NORMAL', title: 'The Watchtower No. 1 2024', cat: 'Magazines', spc: false, ord: true, qty: 10, avg: 6 },
    { code: 'g24.1', lang: 'E', format: 'NORMAL', title: 'Awake! No. 1 2024', cat: 'Magazines', spc: false, ord: true, qty: 6, avg: 5 },
    { code: 'lffi', lang: 'E', format: 'NORMAL', title: 'Enjoy Life Forever!', cat: 'Brochures', spc: false, ord: true, qty: 12, avg: 4 },
  ]

  for (const item of englishItems) {
    const id = generateId(item.code, item.lang, item.format)
    await prisma.item.upsert({
      where: { id },
      update: {},
      create: {
        id,
        pubCode: item.code,
        langCode: item.lang,
        format: item.format,
        title: item.title,
        categoryTags: item.cat,
        isSpecialOrder: item.spc,
        isOrderable: item.ord,
        imageUrl: getUrl(item.code, item.lang),
        defaultLocationId: 'loc-eng-arm',
      },
    })
    await prisma.inventory.upsert({
      where: { itemId_congregationId_locationId: { itemId: id, congregationId: 'lingua-inglesa-id', locationId: 'loc-eng-arm' } },
      update: {},
      create: { itemId: id, congregationId: 'lingua-inglesa-id', locationId: 'loc-eng-arm', currentQuantity: item.qty, minStock: 0, averageMonthlyConsumption: item.avg },
    })
  }

  console.log('4 itens em inglês criados (Língua Inglesa)')

  // ─── 3. Usuário SS ───────────────────────────────────
  const passwordHash = await hash('admin123', 12)
  await prisma.user.upsert({
    where: { email: 'rafael@vilayara.jw' },
    update: {},
    create: {
      id: 'user-rafael-ss',
      name: 'Rafael',
      email: 'rafael@vilayara.jw',
      passwordHash,
      role: 'SS',
      isActive: true,
      congregationId: vilaYara.id,
    },
  })

  console.log('Usuário SS criado')

  // ─── 4. Catálogo ─────────────────────────────────────
  // qty: estoque atual, avg: consumo médio mensal (simulado)
  const rawItems = [
    { code: 'nwt', lang: 'T', cat: 'Bíblias', format: 'NORMAL', title: 'Tradução do Novo Mundo da Bíblia Sagrada', spc: false, ord: true, loc: 'loc-arm-e1', qty: 12, avg: 4 },
    { code: 'nwtpkt', lang: 'T', cat: 'Bíblias', format: 'NORMAL', title: 'Tradução do Novo Mundo — Edição de Bolso', spc: false, ord: true, loc: 'loc-arm-e1', qty: 3, avg: 5 },
    { code: 'nwtls', lang: 'T', cat: 'Bíblias', format: 'LARGE_PRINT', title: 'Tradução do Novo Mundo — Letra Grande', spc: true, ord: true, loc: 'loc-arm-e1', qty: 0, avg: 1 },
    { code: 'nwt-1', lang: 'T', cat: 'Bíblias', format: 'BRAILLE', title: 'Tradução do Novo Mundo — Braille Vol. 1', spc: false, ord: true, loc: 'loc-arm-e3', qty: 1, avg: 0 },
    { code: 'nwt-2', lang: 'T', cat: 'Bíblias', format: 'BRAILLE', title: 'Tradução do Novo Mundo — Braille Vol. 2', spc: false, ord: true, loc: 'loc-arm-e3', qty: 0, avg: 0 },

    { code: 'jwcd9', lang: 'T', cat: 'Kit de Ferramentas', format: 'NORMAL', title: 'Cartão curso bíblico — presencial', spc: false, ord: true, loc: 'loc-arm-d1', qty: 30, avg: 12 },
    { code: 'jwcd10', lang: 'T', cat: 'Kit de Ferramentas', format: 'NORMAL', title: 'Cartão curso bíblico — virtual', spc: false, ord: true, loc: 'loc-arm-d1', qty: 8, avg: 10 },
    { code: 'jwcd4', lang: 'E', cat: 'Kit de Ferramentas', format: 'NORMAL', title: 'Business Card — jw.org (English)', spc: false, ord: false, loc: 'loc-arm-d1', qty: 15, avg: 3 },

    { code: 'inv', lang: 'T', cat: 'Convites', format: 'NORMAL', title: 'Convite para Reuniões Cristãs', spc: false, ord: true, loc: 'loc-arm-d2', qty: 0, avg: 20 },
    { code: 'lffi', lang: 'T', cat: 'Brochuras', format: 'NORMAL', title: 'Seja Feliz para Sempre! — Comece a Aprender', spc: false, ord: true, loc: 'loc-arm-e2', qty: 25, avg: 8 },

    { code: 'lff', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Seja Feliz para Sempre! — Curso da Bíblia', spc: false, ord: true, loc: 'loc-arm-e2', qty: 18, avg: 6 },
    { code: 'be', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Beneficie-se da Escola do Ministério Teocrático', spc: false, ord: true, loc: 'loc-arm-e2', qty: 2, avg: 3 },
    { code: 'jy', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Jesus — o Caminho, a Verdade e a Vida', spc: false, ord: true, loc: 'loc-arm-e2', qty: 6, avg: 2 },
    { code: 'sfg', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Pastoreiem o Rebanho de Deus', spc: true, ord: true, loc: 'loc-arm-e3', qty: 3, avg: 0 },

    { code: 'ldstd-1', lang: 'E', cat: 'Equipamento', format: 'NORMAL', title: 'Display de publicações — Simples', spc: true, ord: true, loc: 'loc-arm-d3', qty: 2, avg: 0 },
    { code: 'ldcrt-1', lang: 'E', cat: 'Equipamento', format: 'NORMAL', title: 'Carrinho de publicações', spc: true, ord: true, loc: 'loc-arm-d3', qty: 1, avg: 0 },

    { code: 'mvpwp24.1', lang: 'T', cat: 'Arte', format: 'NORMAL', title: 'A Sentinela Nº1 2024 — Cartaz magnético', spc: false, ord: true, loc: 'loc-exp-e', qty: 1, avg: 0 },

    { code: 'wp24.1', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (público) Nº1 2024', spc: false, ord: true, loc: 'loc-exp-e', qty: 0, avg: 15 },
    { code: 'g24.1', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'Despertai! Nº1 2024', spc: false, ord: true, loc: 'loc-exp-d', qty: 2, avg: 12 },
    { code: 'wp24.2', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (público) Nº2 2024', spc: false, ord: true, loc: 'loc-exp-e', qty: 8, avg: 15 },
  ]

  for (const item of rawItems) {
    const id = generateId(item.code, item.lang, item.format)
    const cleanLang = item.lang.split(' ')[0] || 'T'

    await prisma.item.upsert({
      where: { id },
      update: {},
      create: {
        id,
        pubCode: item.code,
        langCode: item.lang,
        format: item.format,
        title: item.title,
        categoryTags: item.cat,
        isSpecialOrder: item.spc,
        isOrderable: item.ord,
        imageUrl: getUrl(item.code, cleanLang),
        defaultLocationId: item.loc,
      },
    })

    await prisma.inventory.upsert({
      where: {
        itemId_congregationId_locationId: {
          itemId: id,
          congregationId: vilaYara.id,
          locationId: item.loc,
        },
      },
      update: {},
      create: {
        itemId: id,
        congregationId: vilaYara.id,
        locationId: item.loc,
        currentQuantity: item.qty,
        minStock: 0,
        averageMonthlyConsumption: item.avg,
      },
    })
  }

  console.log(`${rawItems.length} itens criados`)

  // ─── 5. Movimentações de Saída (últimos 3 meses) ─────
  const now = new Date()

  // Gerar movimentações simuladas para os últimos 3 meses
  const movementItems = [
    { code: 'nwt', lang: 'T', format: 'NORMAL', qtyPerMonth: [5, 3, 4] },
    { code: 'nwtpkt', lang: 'T', format: 'NORMAL', qtyPerMonth: [6, 4, 5] },
    { code: 'jwcd9', lang: 'T', format: 'NORMAL', qtyPerMonth: [15, 10, 11] },
    { code: 'jwcd10', lang: 'T', format: 'NORMAL', qtyPerMonth: [12, 8, 10] },
    { code: 'inv', lang: 'T', format: 'NORMAL', qtyPerMonth: [25, 18, 17] },
    { code: 'lffi', lang: 'T', format: 'NORMAL', qtyPerMonth: [10, 7, 7] },
    { code: 'lff', lang: 'T', format: 'NORMAL', qtyPerMonth: [8, 5, 5] },
    { code: 'be', lang: 'T', format: 'NORMAL', qtyPerMonth: [4, 2, 3] },
    { code: 'wp24.1', lang: 'T', format: 'NORMAL', qtyPerMonth: [18, 14, 13] },
    { code: 'g24.1', lang: 'T', format: 'NORMAL', qtyPerMonth: [15, 10, 11] },
    { code: 'wp24.2', lang: 'T', format: 'NORMAL', qtyPerMonth: [16, 13, 16] },
  ]

  for (const mi of movementItems) {
    const itemId = generateId(mi.code, mi.lang, mi.format)
    for (let m = 2; m >= 0; m--) {
      const qty = mi.qtyPerMonth[2 - m]
      const date = new Date(now.getFullYear(), now.getMonth() - m, Math.floor(Math.random() * 25) + 1)

      await prisma.stockMovement.create({
        data: {
          itemId,
          congregationId: vilaYara.id,
          userId: 'user-rafael-ss',
          locationId: 'loc-arm-e1',
          type: 'ISSUE_PUBLISHER',
          quantity: -qty,
          notes: 'Saída para publicadores',
          timestamp: date,
        },
      })
    }
  }

  console.log('Movimentações criadas (3 meses)')

  // ─── 6. Remessa Pendente ─────────────────────────────
  const order = await prisma.order.create({
    data: {
      shipmentNumber: '7845321',
      type: 'COMMON',
      status: 'IN_TRANSIT',
      creatorCongregationId: vilaYara.id,
    },
  })

  const box = await prisma.orderBox.create({
    data: {
      orderId: order.id,
      boxNumber: 'Caixa 1 de 2',
      isReceived: false,
    },
  })

  await prisma.orderItem.create({
    data: {
      orderBoxId: box.id,
      itemId: generateId('inv', 'T', 'NORMAL'),
      quantity: 50,
    },
  })

  const box2 = await prisma.orderBox.create({
    data: {
      orderId: order.id,
      boxNumber: 'Caixa 2 de 2',
      isReceived: false,
    },
  })

  await prisma.orderItem.create({
    data: {
      orderBoxId: box2.id,
      itemId: generateId('wp24.1', 'T', 'NORMAL'),
      quantity: 30,
    },
  })

  console.log('Remessa pendente criada')
  console.log('Seed concluído com sucesso!')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1) })

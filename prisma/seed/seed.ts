import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const generateId = (pubCode: string, langCode: string, format: string) =>
  `${pubCode}|${langCode}|${format}`

const CDN_BASE = 'https://b.jw-cdn.org/apis/cdh-pub-images/v1/images'
const CMS_CDN = 'https://cms-imgp.jw-cdn.org/img/p'
const NO_IMAGE_PREFIXES = ['ldstd', 'ldcrt', 'jwcd', 'mvp', 'sfg']
const WP_ISSUES: Record<string, string> = {
  '19.1': '201901', '19.2': '201905', '19.3': '201909',
  '20.1': '202001', '20.2': '202005', '20.3': '202009',
  '21.1': '202101', '21.2': '202105', '21.3': '202109',
  '22.1': '202205', '23.1': '202305', '24.1': '202407', '25.1': '202509',
}
const G_ISSUES: Record<string, string> = {
  '19.1': '201903', '19.2': '201907', '19.3': '201911',
  '20.1': '202003', '20.2': '202007', '20.3': '202011',
  '21.1': '202103', '21.2': '202107', '21.3': '202111',
  '22.1': '202207', '23.1': '202311', '24.1': '202411', '25.1': '202511',
}
const LOCALE: Record<string, string> = { T: 'pt', E: 'en' }

function getUrl(pub: string, lang: string): string | null {
  const code = pub.toLowerCase()
  if (NO_IMAGE_PREFIXES.some((p) => code.startsWith(p))) return null
  if (code.startsWith('nwt')) return `${CDN_BASE}?pub=nwt&lang=T`

  // Sentinela de Estudo (w) -> cms-imgp CDN
  const wMatch = code.match(/^w(\d{2})\.(\d{2})$/)
  if (wMatch) {
    const locale = LOCALE[lang]
    if (locale) return `${CMS_CDN}/w/20${wMatch[1]}${wMatch[2]}/${lang}/${locale}/w_${lang}_20${wMatch[1]}${wMatch[2]}_lg.jpg`
    return null
  }

  // Sentinela público (wp) -> cms-imgp CDN
  const wpMatch = code.match(/^wp(\d{2})\.(\d)$/)
  if (wpMatch) {
    const issue = WP_ISSUES[`${wpMatch[1]}.${wpMatch[2]}`]
    const locale = LOCALE[lang]
    if (issue && locale) return `${CMS_CDN}/wp/${issue}/${lang}/${locale}/wp_${lang}_${issue}_lg.jpg`
    return null
  }

  // Despertai (g) -> cms-imgp CDN
  const gMatch = code.match(/^g(\d{2})\.(\d)$/)
  if (gMatch) {
    const issue = G_ISSUES[`${gMatch[1]}.${gMatch[2]}`]
    const locale = LOCALE[lang]
    if (issue && locale) return `${CMS_CDN}/g/${issue}/${lang}/${locale}/g_${lang}_${issue}_lg.jpg`
    return null
  }

  // Apostila Vida e Ministério (mwb)
  const mwbMatch = code.match(/^mwb(\d{2})\.(\d{2})$/)
  if (mwbMatch) {
    const locale = LOCALE[lang]
    if (locale) return `${CMS_CDN}/mwb/20${mwbMatch[1]}${mwbMatch[2]}/${lang}/${locale}/mwb_${lang}_20${mwbMatch[1]}${mwbMatch[2]}_lg.jpg`
    return null
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
    create: { id: 'pres-altina-id', name: 'Presidente Altino', language: 'T', isCoordinator: false },
  })

  await prisma.congregation.upsert({
    where: { id: 'lingua-inglesa-id' },
    update: {},
    create: { id: 'lingua-inglesa-id', name: 'Língua Inglesa', language: 'E', isCoordinator: false },
  })

  console.log('Congregações criadas')

  // ─── 2. Localizações ─────────────────────────────────
  // B1 = Balcão 1 (frente, perto do auditório/corrimão)
  // B2 = Balcão 2 (trás, perto do palco/TV)
  // LE = Lado Esquerdo, LD = Lado Direito
  // P1 = Prateleira 1 (superior), P2 = Prateleira 2 (meio), P3 = Prateleira 3 (inferior)
  // Tampo = em cima do balcão (exposição livre)
  const locations = [
    // ── Balcão 1 (Frente) ──
    { id: 'b1-le-p1', name: 'B1.LE.P1', labelCode: 'B1.LE.P1', subStockType: 'ARMARIO' as const, description: 'Balcão 1 (frente) · Lado Esquerdo · Prateleira 1 (superior)', imageUrl: '/fotos-balcao/balcao-frente-lado-esquerdo.jpeg' },
    { id: 'b1-le-p2', name: 'B1.LE.P2', labelCode: 'B1.LE.P2', subStockType: 'ARMARIO' as const, description: 'Balcão 1 (frente) · Lado Esquerdo · Prateleira 2 (meio)',     imageUrl: '/fotos-balcao/balcao-frente-lado-esquerdo.jpeg' },
    { id: 'b1-le-p3', name: 'B1.LE.P3', labelCode: 'B1.LE.P3', subStockType: 'ARMARIO' as const, description: 'Balcão 1 (frente) · Lado Esquerdo · Prateleira 3 (inferior)', imageUrl: '/fotos-balcao/balcao-frente-lado-esquerdo.jpeg' },
    { id: 'b1-ld-p1', name: 'B1.LD.P1', labelCode: 'B1.LD.P1', subStockType: 'ARMARIO' as const, description: 'Balcão 1 (frente) · Lado Direito · Prateleira 1 (superior)',  imageUrl: '/fotos-balcao/balcao-frente-lado-direito.jpeg' },
    { id: 'b1-ld-p2', name: 'B1.LD.P2', labelCode: 'B1.LD.P2', subStockType: 'ARMARIO' as const, description: 'Balcão 1 (frente) · Lado Direito · Prateleira 2 (meio)',      imageUrl: '/fotos-balcao/balcao-frente-lado-direito.jpeg' },
    { id: 'b1-ld-p3', name: 'B1.LD.P3', labelCode: 'B1.LD.P3', subStockType: 'ARMARIO' as const, description: 'Balcão 1 (frente) · Lado Direito · Prateleira 3 (inferior)',  imageUrl: '/fotos-balcao/balcao-frente-lado-direito.jpeg' },
    { id: 'b1-tampo', name: 'B1.Tampo', labelCode: 'B1.TAMPO',  subStockType: 'MOSTRUARIO' as const, description: 'Balcão 1 (frente) · Em cima (exposição livre)',            imageUrl: '/fotos-balcao/balco-frente-completo.jpeg' },
    // ── Balcão 2 (Trás) ──
    { id: 'b2-le-p1', name: 'B2.LE.P1', labelCode: 'B2.LE.P1', subStockType: 'ARMARIO' as const, description: 'Balcão 2 (trás) · Lado Esquerdo · Prateleira 1 (superior)',   imageUrl: '/fotos-balcao/balcao-atras-lado-esquerdo.jpeg' },
    { id: 'b2-le-p2', name: 'B2.LE.P2', labelCode: 'B2.LE.P2', subStockType: 'ARMARIO' as const, description: 'Balcão 2 (trás) · Lado Esquerdo · Prateleira 2 (meio)',       imageUrl: '/fotos-balcao/balcao-atras-lado-esquerdo.jpeg' },
    { id: 'b2-le-p3', name: 'B2.LE.P3', labelCode: 'B2.LE.P3', subStockType: 'ARMARIO' as const, description: 'Balcão 2 (trás) · Lado Esquerdo · Prateleira 3 (inferior)',   imageUrl: '/fotos-balcao/balcao-atras-lado-esquerdo.jpeg' },
    { id: 'b2-ld-p1', name: 'B2.LD.P1', labelCode: 'B2.LD.P1', subStockType: 'ARMARIO' as const, description: 'Balcão 2 (trás) · Lado Direito · Prateleira 1 (superior)',    imageUrl: '/fotos-balcao/balcao-atras-lado-direito.jpeg' },
    { id: 'b2-ld-p2', name: 'B2.LD.P2', labelCode: 'B2.LD.P2', subStockType: 'ARMARIO' as const, description: 'Balcão 2 (trás) · Lado Direito · Prateleira 2 (meio)',        imageUrl: '/fotos-balcao/balcao-atras-lado-direito.jpeg' },
    { id: 'b2-ld-p3', name: 'B2.LD.P3', labelCode: 'B2.LD.P3', subStockType: 'ARMARIO' as const, description: 'Balcão 2 (trás) · Lado Direito · Prateleira 3 (inferior)',    imageUrl: '/fotos-balcao/balcao-atras-lado-direito.jpeg' },
    { id: 'b2-tampo', name: 'B2.Tampo', labelCode: 'B2.TAMPO',  subStockType: 'MOSTRUARIO' as const, description: 'Balcão 2 (trás) · Em cima (exposição livre)',              imageUrl: '/fotos-balcao/balco-atras-completo.jpeg' },
  ]

  for (const loc of locations) {
    await prisma.location.upsert({
      where: { id: loc.id },
      update: {},
      create: { ...loc, congregationId: vilaYara.id },
    })
  }

  console.log(`${locations.length} localizações criadas`)

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
    { code: 'nwt', lang: 'T', cat: 'Bíblias', format: 'NORMAL', title: 'Bíblia — Edição Normal', spc: false, ord: true, loc: 'b1-le-p1', qty: 12, avg: 4 },
    { code: 'nwtpkt', lang: 'T', cat: 'Bíblias', format: 'NORMAL', title: 'Bíblia — Edição de Bolso', spc: false, ord: true, loc: 'b1-le-p1', qty: 3, avg: 5 },
    { code: 'nwtls', lang: 'T', cat: 'Bíblias', format: 'LARGE_PRINT', title: 'Bíblia — Letra Grande', spc: true, ord: true, loc: 'b1-le-p1', qty: 0, avg: 1 },
    { code: 'nwt-1', lang: 'T', cat: 'Bíblias', format: 'BRAILLE', title: 'Bíblia — Braille Vol. 1', spc: false, ord: true, loc: 'b1-le-p1', qty: 1, avg: 0 },
    { code: 'nwt-2', lang: 'T', cat: 'Bíblias', format: 'BRAILLE', title: 'Bíblia — Braille Vol. 2', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },

    { code: 'jwcd9', lang: 'T', cat: 'Kit de Ferramentas', format: 'NORMAL', title: 'Cartão curso bíblico — presencial', spc: false, ord: true, loc: 'b1-le-p1', qty: 30, avg: 12 },
    { code: 'jwcd10', lang: 'T', cat: 'Kit de Ferramentas', format: 'NORMAL', title: 'Cartão curso bíblico — virtual', spc: false, ord: true, loc: 'b1-le-p1', qty: 8, avg: 10 },
    { code: 'jwcd4', lang: 'E', cat: 'Kit de Ferramentas', format: 'NORMAL', title: 'Business Card — jw.org (English)', spc: false, ord: false, loc: 'b1-le-p1', qty: 15, avg: 3 },

    { code: 'inv', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'Convite para Reuniões Cristãs', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 20 },
    { code: 'mi26', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'Convite para a Celebração de 2026', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0, img: 'https://cms-imgp.jw-cdn.org/img/p/mi26/T/pt/mi26_T_lg.jpg' },

    // ── Folhetos ──
    { code: 'T-36', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'O Que é o Reino de Deus?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 10, img: 'https://cms-imgp.jw-cdn.org/img/p/T-36/T/pt/T-36_T_lg.jpg' },
    { code: 'T-37', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'Onde Encontrar as Respostas mais Importantes da Vida?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 10, img: 'https://cms-imgp.jw-cdn.org/img/p/T-37/T/pt/T-37_T_lg.jpg' },
    { code: '1102013381', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'O Que Você Acha da Bíblia?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 10, img: 'https://cms-imgp.jw-cdn.org/img/p/1102013381/T/wpub/1102013381_T_cvr_lg.jpg' },
    { code: 'T-31', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'O Que Você Espera do Futuro?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 10, img: 'https://cms-imgp.jw-cdn.org/img/p/T-31/T/pt/T-31_T_lg.jpg' },
    { code: 'T-32', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'Qual o Segredo para Ter uma Família Feliz?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 10, img: 'https://cms-imgp.jw-cdn.org/img/p/T-32/T/pt/T-32_T_lg.jpg' },
    { code: 'T-33', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'Quem Controla o Mundo?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 10, img: 'https://cms-imgp.jw-cdn.org/img/p/T-33/T/pt/T-33_T_lg.jpg' },
    { code: 'T-34', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'O Sofrimento Vai Acabar Algum Dia?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 10, img: 'https://cms-imgp.jw-cdn.org/img/p/T-34/T/pt/T-34_T_lg.jpg' },
    { code: 'T-35', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'Será Que os Mortos Podem Voltar a Viver?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 10, img: 'https://cms-imgp.jw-cdn.org/img/p/T-35/T/pt/T-35_T_lg.jpg' },
    { code: 't-ftr', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'É Possível Viver Feliz para Sempre?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 10, img: 'https://cms-imgp.jw-cdn.org/img/p/t-ftr/T/pt/t-ftr_T_lg.jpg' },
    { code: 't-fam', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'Como Ter uma Família Feliz?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 10, img: 'https://cms-imgp.jw-cdn.org/img/p/t-fam/T/pt/t-fam_T_lg.jpg' },
    { code: 't-god', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'Quem É o Verdadeiro Deus?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 10, img: 'https://cms-imgp.jw-cdn.org/img/p/t-god/T/pt/t-god_T_lg.jpg' },
    { code: 't-pry', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'Alguém Ouve Nossas Orações?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 10, img: 'https://cms-imgp.jw-cdn.org/img/p/t-pry/T/pt/t-pry_T_lg.jpg' },
    { code: 't-jss', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'Os Conselhos de Jesus Funcionam Hoje?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 10, img: 'https://cms-imgp.jw-cdn.org/img/p/t-jss/T/pt/t-jss_T_lg.jpg' },
    { code: 't-kng', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'Como o Reino de Deus Vai Resolver Nossos Problemas?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 10, img: 'https://cms-imgp.jw-cdn.org/img/p/t-kng/T/pt/t-kng_T_lg.jpg' },
    { code: 't-sfr', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'A Dor e a Tristeza Vão Acabar Algum Dia?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 10, img: 'https://cms-imgp.jw-cdn.org/img/p/t-sfr/T/pt/t-sfr_T_lg.jpg' },
    { code: 't-dth', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'Será Que as Pessoas Que Amamos Voltarão a Viver?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 10, img: 'https://cms-imgp.jw-cdn.org/img/p/t-dth/T/pt/t-dth_T_lg.jpg' },
    { code: 't-rlg', lang: 'T', cat: 'Folhetos', format: 'NORMAL', title: 'Deus Aprova Todas as Religiões?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 10, img: 'https://cms-imgp.jw-cdn.org/img/p/t-rlg/T/pt/t-rlg_T_lg.jpg' },
    { code: 'lffi', lang: 'T', cat: 'Brochuras', format: 'NORMAL', title: 'Seja Feliz para Sempre! — Comece a Aprender', spc: false, ord: true, loc: 'b1-le-p1', qty: 25, avg: 8 },
    { code: 'lmd', lang: 'T', cat: 'Brochuras', format: 'NORMAL', title: 'Ame as Pessoas — Faça Discípulos', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 3, img: 'https://cms-imgp.jw-cdn.org/img/p/lmd/T/pt/lmd_T_lg.jpg' },
    { code: 'wfg', lang: 'T', cat: 'Brochuras', format: 'NORMAL', title: 'Aprenda com a Sabedoria de Jesus', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 3, img: 'https://cms-imgp.jw-cdn.org/img/p/wfg/T/pt/wfg_T_lg.jpg' },
    { code: 'th', lang: 'T', cat: 'Brochuras', format: 'NORMAL', title: 'Melhore Sua Leitura e Seu Ensino', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 2, img: 'https://cms-imgp.jw-cdn.org/img/p/th/T/pt/th_T_lg.jpg' },
    { code: 'rj', lang: 'T', cat: 'Brochuras', format: 'NORMAL', title: 'Volte para Jeová', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 2, img: 'https://cms-imgp.jw-cdn.org/img/p/rj/T/pt/rj_T_lg.jpg' },
    { code: 'ypq', lang: 'T', cat: 'Brochuras', format: 'NORMAL', title: '10 Perguntas Que os Jovens Se Fazem e as Melhores Respostas', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 2, img: 'https://cms-imgp.jw-cdn.org/img/p/ypq/T/pt/ypq_T_lg.jpg' },
    { code: 'hf', lang: 'T', cat: 'Brochuras', format: 'NORMAL', title: 'Você Pode Ter uma Família Feliz!', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 2, img: 'https://cms-imgp.jw-cdn.org/img/p/hf/T/pt/hf_T_lg.jpg' },
    { code: 'jl', lang: 'T', cat: 'Brochuras', format: 'NORMAL', title: 'Quem Está Fazendo a Vontade de Jeová Hoje?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 2, img: 'https://cms-imgp.jw-cdn.org/img/p/jl/T/pt/jl_T_lg.jpg' },
    { code: 'yc', lang: 'T', cat: 'Brochuras', format: 'NORMAL', title: 'Ensine Seus Filhos', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 2, img: 'https://cms-imgp.jw-cdn.org/img/p/yc/T/pt/yc_T_lg.jpg' },
    { code: 'lc', lang: 'T', cat: 'Brochuras', format: 'NORMAL', title: 'A Vida — Teve um Criador?', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 1, img: 'https://cms-imgp.jw-cdn.org/img/p/lc/T/pt/lc_T_lg.jpg' },
    { code: 'lf', lang: 'T', cat: 'Brochuras', format: 'NORMAL', title: 'A Origem da Vida — Cinco Perguntas Que Merecem Resposta', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 1, img: 'https://cms-imgp.jw-cdn.org/img/p/lf/T/pt/lf_T_lg.jpg' },
    { code: 'ay', lang: 'T', cat: 'Brochuras', format: 'NORMAL', title: 'Aplique-se à Leitura e à Escrita', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 1, img: 'https://cms-imgp.jw-cdn.org/img/p/ay/T/pt/ay_T_lg.jpg' },

    { code: 'lff', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Seja Feliz para Sempre! — Curso da Bíblia', spc: false, ord: true, loc: 'b1-le-p1', qty: 18, avg: 6 },
    { code: 'lfb', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Aprenda com as Histórias da Bíblia', spc: false, ord: true, loc: 'b1-le-p1', qty: 5, avg: 2 },
    { code: 'scl', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Princípios Bíblicos para a Vida Cristã', spc: false, ord: true, loc: 'b1-le-p1', qty: 8, avg: 3 },
    { code: 'es26', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Examine as Escrituras Diariamente — 2026', spc: false, ord: true, loc: 'b1-le-p1', qty: 12, avg: 4 },
    { code: 'wcg', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Ande Corajosamente com Deus', spc: false, ord: true, loc: 'b1-le-p1', qty: 4, avg: 1 },
    { code: 'be', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Beneficie-se da Escola do Ministério Teocrático', spc: false, ord: true, loc: 'b1-le-p1', qty: 2, avg: 3 },
    { code: 'jy', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Jesus — o Caminho, a Verdade e a Vida', spc: false, ord: true, loc: 'b1-le-p1', qty: 6, avg: 2 },
    { code: 'od', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Organizados para Fazer a Vontade de Jeová', spc: true, ord: true, loc: 'b1-le-p1', qty: 3, avg: 1 },
    { code: 'rr', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'A Adoração Pura de Jeová É Restaurada!', spc: false, ord: true, loc: 'b1-le-p1', qty: 2, avg: 1 },
    { code: 'it', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Estudo Perspicaz das Escrituras', spc: true, ord: true, loc: 'b1-le-p1', qty: 1, avg: 0 },
    { code: 'kr', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'O Reino de Deus já Governa!', spc: false, ord: true, loc: 'b1-le-p1', qty: 3, avg: 1 },
    { code: 'bhs', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Você Pode Entender a Bíblia!', spc: false, ord: true, loc: 'b1-le-p1', qty: 4, avg: 2 },
    { code: 'ia', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Imite a Sua Fé', spc: false, ord: true, loc: 'b1-le-p1', qty: 2, avg: 1 },
    { code: 'mb', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Minhas Primeiras Lições da Bíblia', spc: false, ord: true, loc: 'b1-le-p1', qty: 5, avg: 2 },
    { code: 'yp1', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Os Jovens Perguntam — Respostas Práticas, Volume 1', spc: false, ord: true, loc: 'b1-le-p1', qty: 2, avg: 1 },
    { code: 'yp2', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Os Jovens Perguntam — Respostas Práticas, Volume 2', spc: false, ord: true, loc: 'b1-le-p1', qty: 1, avg: 1 },
    { code: 'bt', lang: 'T', cat: 'Livros', format: 'NORMAL', title: "'Dê Testemunho Cabal' sobre o Reino de Deus", spc: false, ord: true, loc: 'b1-le-p1', qty: 3, avg: 1 },
    { code: 'sfg', lang: 'T', cat: 'Livros', format: 'NORMAL', title: 'Pastoreiem o Rebanho de Deus', spc: true, ord: true, loc: 'b1-le-p1', qty: 3, avg: 0 },

    // ── Apostilas (Vida e Ministério) ──
    { code: 'mwb25.01', lang: 'T', cat: 'Apostilas', format: 'NORMAL', title: 'Apostila — Janeiro-Fevereiro 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'mwb25.03', lang: 'T', cat: 'Apostilas', format: 'NORMAL', title: 'Apostila — Março-Abril 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'mwb25.05', lang: 'T', cat: 'Apostilas', format: 'NORMAL', title: 'Apostila — Maio-Junho 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'mwb25.07', lang: 'T', cat: 'Apostilas', format: 'NORMAL', title: 'Apostila — Julho-Agosto 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'mwb25.09', lang: 'T', cat: 'Apostilas', format: 'NORMAL', title: 'Apostila — Setembro-Outubro 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'mwb25.11', lang: 'T', cat: 'Apostilas', format: 'NORMAL', title: 'Apostila — Novembro-Dezembro 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'mwb26.01', lang: 'T', cat: 'Apostilas', format: 'NORMAL', title: 'Apostila — Janeiro-Fevereiro 2026', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'mwb26.03', lang: 'T', cat: 'Apostilas', format: 'NORMAL', title: 'Apostila — Março-Abril 2026', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'mwb26.05', lang: 'T', cat: 'Apostilas', format: 'NORMAL', title: 'Apostila — Maio-Junho 2026', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'mwb26.07', lang: 'T', cat: 'Apostilas', format: 'NORMAL', title: 'Apostila — Julho-Agosto 2026', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },

    { code: 'ldstd-1', lang: 'E', cat: 'Equipamento', format: 'NORMAL', title: 'Display de publicações — Simples', spc: true, ord: true, loc: 'b1-le-p1', qty: 2, avg: 0 },
    { code: 'ldcrt-1', lang: 'E', cat: 'Equipamento', format: 'NORMAL', title: 'Carrinho de publicações', spc: true, ord: true, loc: 'b1-le-p1', qty: 1, avg: 0 },

    { code: 'mvpwp24.1', lang: 'T', cat: 'Arte', format: 'NORMAL', title: 'A Sentinela Nº1 2024 — Cartaz magnético', spc: false, ord: true, loc: 'b1-le-p1', qty: 1, avg: 0 },

    // ── Sentinela (público) ──
    { code: 'wp19.1', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (público) Nº1 2019', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'wp19.2', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (público) Nº2 2019', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'wp19.3', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (público) Nº3 2019', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'wp20.1', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (público) Nº1 2020', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'wp20.2', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (público) Nº2 2020', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'wp20.3', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (público) Nº3 2020', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'wp21.1', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (público) Nº1 2021', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'wp21.2', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (público) Nº2 2021', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'wp21.3', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (público) Nº3 2021', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'wp22.1', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (público) Nº1 2022', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'wp23.1', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (público) Nº1 2023', spc: false, ord: true, loc: 'b1-le-p1', qty: 1, avg: 5 },
    { code: 'wp24.1', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (público) Nº1 2024', spc: false, ord: true, loc: 'b1-le-p1', qty: 8, avg: 15 },

    // ── Despertai! ──
    { code: 'g19.1', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'Despertai! Nº1 2019', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'g19.2', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'Despertai! Nº2 2019', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'g19.3', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'Despertai! Nº3 2019', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'g20.1', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'Despertai! Nº1 2020', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'g20.2', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'Despertai! Nº2 2020', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'g20.3', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'Despertai! Nº3 2020', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'g21.1', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'Despertai! Nº1 2021', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'g21.2', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'Despertai! Nº2 2021', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'g21.3', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'Despertai! Nº3 2021', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'g22.1', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'Despertai! Nº1 2022', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 0 },
    { code: 'g23.1', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'Despertai! Nº1 2023', spc: false, ord: true, loc: 'b1-le-p1', qty: 1, avg: 5 },
    { code: 'g24.1', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'Despertai! Nº1 2024', spc: false, ord: true, loc: 'b1-le-p1', qty: 2, avg: 12 },

    { code: 'w24.01', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Janeiro 2024', spc: false, ord: true, loc: 'b1-le-p1', qty: 4, avg: 3 },
    { code: 'w24.02', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Fevereiro 2024', spc: false, ord: true, loc: 'b1-le-p1', qty: 3, avg: 3 },
    { code: 'w24.03', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Março 2024', spc: false, ord: true, loc: 'b1-le-p1', qty: 5, avg: 3 },
    { code: 'w24.04', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Abril 2024', spc: false, ord: true, loc: 'b1-le-p1', qty: 2, avg: 3 },
    { code: 'w24.05', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Maio 2024', spc: false, ord: true, loc: 'b1-le-p1', qty: 6, avg: 3 },
    { code: 'w24.06', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Junho 2024', spc: false, ord: true, loc: 'b1-le-p1', qty: 4, avg: 3 },
    { code: 'w24.07', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Julho 2024', spc: false, ord: true, loc: 'b1-le-p1', qty: 3, avg: 3 },
    { code: 'w24.08', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Agosto 2024', spc: false, ord: true, loc: 'b1-le-p1', qty: 5, avg: 3 },
    { code: 'w24.09', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Setembro 2024', spc: false, ord: true, loc: 'b1-le-p1', qty: 2, avg: 3 },
    { code: 'w24.10', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Outubro 2024', spc: false, ord: true, loc: 'b1-le-p1', qty: 4, avg: 3 },
    { code: 'w24.11', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Novembro 2024', spc: false, ord: true, loc: 'b1-le-p1', qty: 3, avg: 3 },
    { code: 'w24.12', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Dezembro 2024', spc: false, ord: true, loc: 'b1-le-p1', qty: 6, avg: 3 },

    // ── 2025 ──
    { code: 'wp25.1', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (público) Nº1 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 10, avg: 15 },
    { code: 'g25.1', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'Despertai! Nº1 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 5, avg: 12 },
    { code: 'w25.01', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Janeiro 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 4, avg: 3 },
    { code: 'w25.02', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Fevereiro 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 3, avg: 3 },
    { code: 'w25.03', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Março 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 5, avg: 3 },
    { code: 'w25.04', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Abril 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 2, avg: 3 },
    { code: 'w25.05', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Maio 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 6, avg: 3 },
    { code: 'w25.06', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Junho 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 4, avg: 3 },
    { code: 'w25.07', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Julho 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 3, avg: 3 },
    { code: 'w25.08', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Agosto 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 5, avg: 3 },
    { code: 'w25.09', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Setembro 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 2, avg: 3 },
    { code: 'w25.10', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Outubro 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 4, avg: 3 },
    { code: 'w25.11', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Novembro 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 3, avg: 3 },
    { code: 'w25.12', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Dezembro 2025', spc: false, ord: true, loc: 'b1-le-p1', qty: 6, avg: 3 },

    // ── 2026 (até o momento) ──
    { code: 'w26.01', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Janeiro 2026', spc: false, ord: true, loc: 'b1-le-p1', qty: 8, avg: 3 },
    { code: 'w26.02', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Fevereiro 2026', spc: false, ord: true, loc: 'b1-le-p1', qty: 6, avg: 3 },
    { code: 'w26.03', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Março 2026', spc: false, ord: true, loc: 'b1-le-p1', qty: 10, avg: 3 },
    { code: 'w26.04', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Abril 2026', spc: false, ord: true, loc: 'b1-le-p1', qty: 5, avg: 3 },
    { code: 'w26.05', lang: 'T', cat: 'Revistas', format: 'NORMAL', title: 'A Sentinela (estudo) — Maio 2026', spc: false, ord: true, loc: 'b1-le-p1', qty: 0, avg: 3 },
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
        imageUrl: (item as any).img || getUrl(item.code, cleanLang),
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
          locationId: 'b1-le-p1',
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
  const existingOrder = await prisma.order.findUnique({ where: { shipmentNumber: '7845321' } })
  if (existingOrder) {
    console.log('Remessa pendente já existe, pulando...')
    console.log('Seed concluído com sucesso!')
    return
  }
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

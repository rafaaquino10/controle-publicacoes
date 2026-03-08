const CDN_BASE = "https://b.jw-cdn.org/apis/cdh-pub-images/v1/images"
const CMS_CDN = "https://cms-imgp.jw-cdn.org/img/p"

// Publications that have no image anywhere
const NO_IMAGE_PREFIXES = ["ldstd", "ldcrt", "jwcd", "mvp", "sfg"]

// Sentinela público (wp): "YY.N" -> YYYYMM
// 2019-2021: 3/year (01, 05, 09) | 2022+: 1/year (varies)
const WP_ISSUES: Record<string, string> = {
  "19.1": "201901", "19.2": "201905", "19.3": "201909",
  "20.1": "202001", "20.2": "202005", "20.3": "202009",
  "21.1": "202101", "21.2": "202105", "21.3": "202109",
  "22.1": "202205", "23.1": "202305", "24.1": "202407", "25.1": "202509",
}

// Despertai (g): "YY.N" -> YYYYMM
// 2019-2021: 3/year (03, 07, 11) | 2022+: 1/year (varies)
const G_ISSUES: Record<string, string> = {
  "19.1": "201903", "19.2": "201907", "19.3": "201911",
  "20.1": "202003", "20.2": "202007", "20.3": "202011",
  "21.1": "202103", "21.2": "202107", "21.3": "202111",
  "22.1": "202207", "23.1": "202311", "24.1": "202411", "25.1": "202511",
}

// Language -> CMS locale path
const LOCALE: Record<string, string> = { T: "pt", E: "en" }

/**
 * Build an image URL for a JW publication.
 */
export function buildCdnImageUrl(pubCode: string, langCode: string): string | null {
  const code = pubCode.toLowerCase()

  if (NO_IMAGE_PREFIXES.some((prefix) => code.startsWith(prefix))) {
    return null
  }

  // Bibles (nwt*)
  if (code.startsWith("nwt")) {
    return `${CDN_BASE}?pub=nwt&lang=T`
  }

  // Sentinela de Estudo (w) — e.g. w24.01 -> cms-imgp CDN
  const wMatch = code.match(/^w(\d{2})\.(\d{2})$/)
  if (wMatch) {
    return buildCmsUrl("w", `20${wMatch[1]}${wMatch[2]}`, langCode)
  }

  // Sentinela público (wp) — e.g. wp24.1
  const wpMatch = code.match(/^wp(\d{2})\.(\d)$/)
  if (wpMatch) {
    const issue = WP_ISSUES[`${wpMatch[1]}.${wpMatch[2]}`]
    if (issue) return buildCmsUrl("wp", issue, langCode)
    return null
  }

  // Despertai (g) — e.g. g24.1
  const gMatch = code.match(/^g(\d{2})\.(\d)$/)
  if (gMatch) {
    const issue = G_ISSUES[`${gMatch[1]}.${gMatch[2]}`]
    if (issue) return buildCmsUrl("g", issue, langCode)
    return null
  }

  // Apostila Vida e Ministério (mwb) — e.g. mwb26.01 -> cms-imgp CDN
  const mwbMatch = code.match(/^mwb(\d{2})\.(\d{2})$/)
  if (mwbMatch) {
    return buildCmsUrl("mwb", `20${mwbMatch[1]}${mwbMatch[2]}`, langCode)
  }

  // All other publications — direct CDN
  return `${CDN_BASE}?pub=${pubCode}&lang=${langCode}`
}

function buildCmsUrl(pub: string, issue: string, langCode: string): string | null {
  const locale = LOCALE[langCode]
  if (!locale) return null
  return `${CMS_CDN}/${pub}/${issue}/${langCode}/${locale}/${pub}_${langCode}_${issue}_lg.jpg`
}

import { http } from './http'
import { loadJson, saveJson } from '../utils/storage'

const GDELT_DOC = 'https://api.gdeltproject.org/api/v2/doc/doc'
const LS_NEWS = 'crypto_cache_news_v1'

const DEFAULT_QUERY = '(bitcoin OR ethereum OR crypto OR cryptocurrency OR blockchain)'

export async function fetchCryptoNews({ max = 20, timespan = '1day' } = {}) {
  const cached = loadJson(LS_NEWS, null)
  if (cached?.expiresAt > Date.now()) return cached.data

  const { data } = await http.get(GDELT_DOC, {
    params: {
      query: DEFAULT_QUERY,
      mode: 'artlist',
      format: 'json',
      sort: 'datedesc',
      timespan,
      maxrecords: max
    }
  })

  const items = (data?.articles || []).map(a => ({
    title: a.title,
    url: a.url,
    domain: a.domain,
    sourceCountry: a.sourceCountry,
    language: a.language,
    publishedAt: a.seendate,
    image: a.socialimage
  }))

  saveJson(LS_NEWS, { expiresAt: Date.now() + 5 * 60_000, data: items })
  return items
}

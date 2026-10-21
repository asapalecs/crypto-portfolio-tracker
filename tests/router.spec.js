import { beforeEach, describe, expect, it } from 'vitest'
import router from '../src/router'
import store from '../src/store'

function setAuthed(on) {
  store.commit('user/SET_SESSION', on ? { userId: '1', email: 'a@b.c' } : null)
}

beforeEach(async () => {
  setAuthed(false)
  await router.push('/login')
})

describe('protectie autentificare', () => {
  it.each(['/', '/coins', '/coins/bitcoin', '/asset/new', '/asset/bitcoin/edit'])(
    'redirectioneaza %s la autentificare cand nu esti logat',
    async (path) => {
      await router.push(path)
      expect(router.currentRoute.value.name).toBe('login')
    }
  )

  it('permite accesul la inregistrare fara cont', async () => {
    await router.push('/register')
    expect(router.currentRoute.value.name).toBe('register')
  })

  it.each(['/login', '/register'])('trimite utilizatorii logati de pe %s la pagina principala', async (path) => {
    setAuthed(true)
    await router.push('/coins')
    await router.push(path)
    expect(router.currentRoute.value.name).toBe('home')
  })

  it('permite rutele protejate cand esti logat', async () => {
    setAuthed(true)
    await router.push('/asset/bitcoin/edit')
    expect(router.currentRoute.value.name).toBe('asset-edit')
    expect(router.currentRoute.value.params.id).toBe('bitcoin')
  })
})

describe('rute', () => {
  beforeEach(() => setAuthed(true))

  it('/coins/:id redirectioneaza la tab-ul de prezentare', async () => {
    await router.push('/coins/bitcoin')
    expect(router.currentRoute.value.name).toBe('coin-overview')
    expect(router.currentRoute.value.params.id).toBe('bitcoin')
  })

  it.each(['history', 'settings'])('gaseste tab-ul %s', async (tab) => {
    await router.push(`/coins/ethereum/${tab}`)
    expect(router.currentRoute.value.name).toBe(`coin-${tab}`)
  })

  it('rutele necunoscute duc la pagina principala', async () => {
    await router.push('/does/not/exist')
    expect(router.currentRoute.value.name).toBe('home')
  })
})

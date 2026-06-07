// Script de datos de prueba — crea autores y libros vía la API local.
// Requisito: el servidor debe estar corriendo (npm run dev) en BASE_URL.
// Uso:  node scripts/seed-demo.mjs

const BASE_URL = 'http://localhost:3000'

const authors = [
  {
    name: 'Gabriel García Márquez',
    email: 'gabo@example.com',
    nationality: 'Colombia',
    birthYear: 1927,
    bio: 'Premio Nobel de Literatura 1982, máximo exponente del realismo mágico.',
    books: [
      { title: 'Cien años de soledad', genre: 'Novela', publishedYear: 1967, pages: 471, isbn: '978-0307474728' },
      { title: 'El amor en los tiempos del cólera', genre: 'Novela', publishedYear: 1985, pages: 348, isbn: '978-0307389732' },
      { title: 'Crónica de una muerte anunciada', genre: 'Novela corta', publishedYear: 1981, pages: 122, isbn: '978-1400034956' },
    ],
  },
  {
    name: 'Isabel Allende',
    email: 'isabel.allende@example.com',
    nationality: 'Chile',
    birthYear: 1942,
    bio: 'Una de las autoras en español más leídas del mundo.',
    books: [
      { title: 'La casa de los espíritus', genre: 'Novela', publishedYear: 1982, pages: 433, isbn: '978-0525433452' },
      { title: 'Eva Luna', genre: 'Novela', publishedYear: 1987, pages: 318, isbn: '978-0140125809' },
      { title: 'Paula', genre: 'Memorias', publishedYear: 1994, pages: 330, isbn: '978-0060175533' },
    ],
  },
  {
    name: 'Jorge Luis Borges',
    email: 'borges@example.com',
    nationality: 'Argentina',
    birthYear: 1899,
    bio: 'Maestro del cuento y del ensayo, referente de la literatura fantástica.',
    books: [
      { title: 'Ficciones', genre: 'Cuento', publishedYear: 1944, pages: 203, isbn: '978-0802130303' },
      { title: 'El Aleph', genre: 'Cuento', publishedYear: 1949, pages: 192, isbn: '978-8420633149' },
    ],
  },
  {
    name: 'Mario Vargas Llosa',
    email: 'mvargasllosa@example.com',
    nationality: 'Perú',
    birthYear: 1936,
    bio: 'Premio Nobel de Literatura 2010.',
    books: [
      { title: 'La ciudad y los perros', genre: 'Novela', publishedYear: 1963, pages: 419, isbn: '978-8420471866' },
      { title: 'Conversación en La Catedral', genre: 'Novela', publishedYear: 1969, pages: 601, isbn: '978-8420471873' },
      { title: 'La fiesta del Chivo', genre: 'Novela histórica', publishedYear: 2000, pages: 438, isbn: '978-8420483707' },
    ],
  },
]

async function postJSON(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

async function main() {
  console.log(`Sembrando datos de prueba en ${BASE_URL} ...\n`)

  for (const { books, ...authorPayload } of authors) {
    const authorRes = await postJSON('/api/authors', authorPayload)

    let authorId
    if (authorRes.ok) {
      authorId = authorRes.data.id
      console.log(`✔ Autor creado: ${authorPayload.name} (${authorId})`)
    } else if (authorRes.status === 409) {
      console.log(`↷ Autor ya existe (email duplicado): ${authorPayload.name} — buscándolo...`)
      const list = await fetch(`${BASE_URL}/api/authors`).then((r) => r.json())
      const found = list.find((a) => a.email === authorPayload.email)
      authorId = found?.id
      if (!authorId) {
        console.log(`  ✘ No se pudo encontrar al autor existente, se omite.`)
        continue
      }
    } else {
      console.log(`  ✘ Error creando autor ${authorPayload.name}:`, authorRes.data.error || authorRes.status)
      continue
    }

    for (const book of books) {
      const bookRes = await postJSON('/api/books', { ...book, authorId })
      if (bookRes.ok) {
        console.log(`   ✔ Libro creado: ${book.title}`)
      } else if (bookRes.status === 409) {
        console.log(`   ↷ Libro ya existe (ISBN duplicado): ${book.title}`)
      } else {
        console.log(`   ✘ Error creando "${book.title}":`, bookRes.data.error || bookRes.status)
      }
    }
    console.log('')
  }

  console.log('Listo. Refresca el navegador para ver los datos.')
}

main().catch((err) => {
  console.error('Error inesperado:', err)
  process.exit(1)
})

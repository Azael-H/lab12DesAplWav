'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'

type Author = {
  id: string
  name: string
  email: string
}

type Book = {
  id: string
  title: string
  description: string | null
  isbn: string | null
  publishedYear: number | null
  genre: string | null
  pages: number | null
  authorId: string
  author: { id: string; name: string; email?: string }
}

type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

type BookFormState = {
  title: string
  description: string
  isbn: string
  publishedYear: string
  genre: string
  pages: string
  authorId: string
}

const EMPTY_FORM: BookFormState = {
  title: '',
  description: '',
  isbn: '',
  publishedYear: '',
  genre: '',
  pages: '',
  authorId: '',
}

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Fecha de creación' },
  { value: 'title', label: 'Título' },
  { value: 'publishedYear', label: 'Año de publicación' },
]

export default function BooksPage() {
  return (
    <Suspense fallback={<div className="p-12 text-zinc-500 dark:text-zinc-400">Cargando…</div>}>
      <BooksPageContent />
    </Suspense>
  )
}

function BooksPageContent() {
  const searchParams = useSearchParams()
  const preselectedAuthorId = searchParams.get('authorId')

  const [authors, setAuthors] = useState<Author[]>([])
  const [genres, setGenres] = useState<string[]>([])

  // Filtros / búsqueda
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [genre, setGenre] = useState('')
  const [authorFilter, setAuthorFilter] = useState('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'title' | 'publishedYear'>('createdAt')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const [books, setBooks] = useState<Book[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [form, setForm] = useState<BookFormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Cargar autores (para selectores) — una vez
  useEffect(() => {
    fetch('/api/authors')
      .then((res) => res.json())
      .then((data: Author[]) => {
        if (Array.isArray(data)) {
          setAuthors(data)
          if (preselectedAuthorId && data.some((a) => a.id === preselectedAuthorId)) {
            setForm((f) => ({ ...f, authorId: preselectedAuthorId }))
          }
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedAuthorId])

  // Búsqueda en tiempo real con debounce
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  // Cuando cambian filtros/orden, volver a la página 1
  useEffect(() => {
    setPage(1)
  }, [genre, authorFilter, sortBy, order])

  async function loadBooks() {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (genre) params.set('genre', genre)
      if (authorFilter) params.set('authorName', authorFilter)
      params.set('page', String(page))
      params.set('limit', '10')
      params.set('sortBy', sortBy)
      params.set('order', order)

      const res = await fetch(`/api/books/search?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al buscar libros')

      setBooks(data.data)
      setPagination(data.pagination)
      setGenres((prev) => {
        const set = new Set(prev)
        data.data.forEach((b: Book) => b.genre && set.add(b.genre))
        return Array.from(set).sort()
      })
    } catch (err: any) {
      setError(err.message || 'Error al buscar libros')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBooks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, genre, authorFilter, sortBy, order, page])

  // Lista combinada de géneros: los que vinieron en resultados + autores conocidos
  const genreOptions = useMemo(() => genres, [genres])

  function startEdit(book: Book) {
    setEditingId(book.id)
    setForm({
      title: book.title,
      description: book.description ?? '',
      isbn: book.isbn ?? '',
      publishedYear: book.publishedYear ? String(book.publishedYear) : '',
      genre: book.genre ?? '',
      pages: book.pages ? String(book.pages) : '',
      authorId: book.authorId,
    })
    setFormError(null)
    setNotice(null)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setNotice(null)

    if (!form.title.trim() || !form.authorId) {
      setFormError('Título y autor son requeridos')
      return
    }

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      isbn: form.isbn.trim() || null,
      publishedYear: form.publishedYear ? parseInt(form.publishedYear) : null,
      genre: form.genre.trim() || null,
      pages: form.pages ? parseInt(form.pages) : null,
      authorId: form.authorId,
    }

    setSubmitting(true)
    try {
      const url = editingId ? `/api/books/${editingId}` : '/api/books'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar libro')

      setNotice(editingId ? 'Libro actualizado correctamente' : 'Libro creado correctamente')
      cancelEdit()
      await loadBooks()
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar libro')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(book: Book) {
    if (!confirm(`¿Eliminar el libro "${book.title}"?`)) return
    setNotice(null)
    setError(null)
    try {
      const res = await fetch(`/api/books/${book.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar libro')
      setNotice('Libro eliminado correctamente')
      if (editingId === book.id) cancelEdit()
      await loadBooks()
    } catch (err: any) {
      setError(err.message || 'Error al eliminar libro')
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-12 sm:px-10">
        <header className="flex flex-col gap-2">
          <Link href="/" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
            ← Volver al panel de autores
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Libros de la biblioteca
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Crea, busca, filtra y administra los libros registrados.
          </p>
        </header>

        {/* Formulario crear / editar libro */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            {editingId ? 'Editar libro' : 'Crear nuevo libro'}
          </h2>

          {authors.length === 0 ? (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Primero crea al menos un autor desde el{' '}
              <Link href="/" className="underline">
                panel de autores
              </Link>{' '}
              para poder registrar libros.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Título *" full>
                <input
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Cien años de soledad"
                />
              </Field>
              <Field label="Autor *">
                <select
                  className="input"
                  value={form.authorId}
                  onChange={(e) => setForm((f) => ({ ...f, authorId: e.target.value }))}
                >
                  <option value="">Selecciona un autor…</option>
                  {authors.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Género">
                <input
                  className="input"
                  value={form.genre}
                  onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))}
                  placeholder="Novela"
                />
              </Field>
              <Field label="ISBN">
                <input
                  className="input"
                  value={form.isbn}
                  onChange={(e) => setForm((f) => ({ ...f, isbn: e.target.value }))}
                  placeholder="978-0307474728"
                />
              </Field>
              <Field label="Año de publicación">
                <input
                  className="input"
                  type="number"
                  value={form.publishedYear}
                  onChange={(e) => setForm((f) => ({ ...f, publishedYear: e.target.value }))}
                  placeholder="1967"
                />
              </Field>
              <Field label="Páginas">
                <input
                  className="input"
                  type="number"
                  value={form.pages}
                  onChange={(e) => setForm((f) => ({ ...f, pages: e.target.value }))}
                  placeholder="417"
                />
              </Field>
              <Field label="Descripción" full>
                <textarea
                  className="input min-h-[80px]"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Obra maestra del realismo mágico"
                />
              </Field>

              {formError && (
                <p className="sm:col-span-2 text-sm text-red-600 dark:text-red-400">{formError}</p>
              )}

              <div className="flex gap-3 sm:col-span-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-zinc-950 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  {submitting ? 'Guardando…' : editingId ? 'Actualizar libro' : 'Crear libro'}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-full border border-zinc-300 px-6 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          )}
        </section>

        {/* Notificaciones */}
        {notice && (
          <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {notice}
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        {/* Filtros y búsqueda */}
        <section className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Buscar por título">
              <input
                className="input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ej. soledad, amor…"
              />
            </Field>
            <Field label="Género">
              <select className="input" value={genre} onChange={(e) => setGenre(e.target.value)}>
                <option value="">Todos los géneros</option>
                {genreOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Autor">
              <select
                className="input"
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
              >
                <option value="">Todos los autores</option>
                {authors.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Ordenar por">
              <div className="flex gap-2">
                <select
                  className="input"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <select
                  className="input w-28 flex-none"
                  value={order}
                  onChange={(e) => setOrder(e.target.value as typeof order)}
                >
                  <option value="desc">Descendente</option>
                  <option value="asc">Ascendente</option>
                </select>
              </div>
            </Field>
          </div>
        </section>

        {/* Resultados */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              Resultados
              {pagination && (
                <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                  ({pagination.total} libro{pagination.total === 1 ? '' : 's'} encontrado
                  {pagination.total === 1 ? '' : 's'})
                </span>
              )}
            </h2>
          </div>

          {loading ? (
            <p className="text-zinc-500 dark:text-zinc-400">Buscando libros…</p>
          ) : books.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400">
              No se encontraron libros con los filtros actuales.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {books.map((book) => (
                <div
                  key={book.id}
                  className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    {book.title}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    de{' '}
                    <Link href={`/authors/${book.author.id}`} className="underline">
                      {book.author.name}
                    </Link>
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {[book.genre, book.publishedYear, book.pages ? `${book.pages} pág.` : null]
                      .filter(Boolean)
                      .join(' · ') || 'Sin más detalles'}
                  </p>
                  {book.description && (
                    <p className="line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {book.description}
                    </p>
                  )}

                  <div className="mt-auto flex flex-wrap gap-2 pt-3">
                    <button
                      onClick={() => startEdit(book)}
                      className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(book)}
                      className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginación */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrev}
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                ← Anterior
              </button>
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                Página {pagination.page} de {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNext}
                className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Siguiente →
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function Field({
  label,
  children,
  full,
}: {
  label: string
  children: React.ReactNode
  full?: boolean
}) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${full ? 'sm:col-span-2' : ''}`}>
      <span className="font-medium text-zinc-700 dark:text-zinc-300">{label}</span>
      {children}
    </label>
  )
}

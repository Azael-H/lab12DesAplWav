'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type Book = {
  id: string
  title: string
  description: string | null
  isbn: string | null
  publishedYear: number | null
  genre: string | null
  pages: number | null
}

type Author = {
  id: string
  name: string
  email: string
  bio: string | null
  nationality: string | null
  birthYear: number | null
  books: Book[]
  _count?: { books: number }
}

type Stats = {
  authorId: string
  authorName: string
  totalBooks: number
  firstBook: { title: string; year: number } | null
  latestBook: { title: string; year: number } | null
  averagePages: number
  genres: string[]
  longestBook: { title: string; pages: number } | null
  shortestBook: { title: string; pages: number } | null
}

type AuthorFormState = {
  name: string
  email: string
  bio: string
  nationality: string
  birthYear: string
}

export default function AuthorDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params?.id

  const [author, setAuthor] = useState<Author | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<AuthorFormState | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function loadAll() {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [authorRes, statsRes] = await Promise.all([
        fetch(`/api/authors/${id}`),
        fetch(`/api/authors/${id}/stats`),
      ])
      const authorData = await authorRes.json()
      const statsData = await statsRes.json()

      if (!authorRes.ok) throw new Error(authorData.error || 'Error al cargar autor')
      if (!statsRes.ok) throw new Error(statsData.error || 'Error al cargar estadísticas')

      setAuthor(authorData)
      setStats(statsData)
    } catch (err: any) {
      setError(err.message || 'Error al cargar la información del autor')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  function startEdit() {
    if (!author) return
    setForm({
      name: author.name,
      email: author.email,
      bio: author.bio ?? '',
      nationality: author.nationality ?? '',
      birthYear: author.birthYear ? String(author.birthYear) : '',
    })
    setFormError(null)
    setNotice(null)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setForm(null)
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form || !id) return
    setFormError(null)
    setNotice(null)

    if (!form.name.trim() || !form.email.trim()) {
      setFormError('Nombre y email son requeridos')
      return
    }

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      bio: form.bio.trim() || null,
      nationality: form.nationality.trim() || null,
      birthYear: form.birthYear ? parseInt(form.birthYear) : null,
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/authors/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al actualizar autor')

      setNotice('Autor actualizado correctamente')
      setEditing(false)
      setForm(null)
      await loadAll()
    } catch (err: any) {
      setFormError(err.message || 'Error al actualizar autor')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteAuthor() {
    if (!author) return
    if (
      !confirm(
        `¿Eliminar al autor "${author.name}"? Esto también eliminará todos sus libros (${author._count?.books ?? author.books.length}).`
      )
    ) {
      return
    }
    setNotice(null)
    setError(null)
    try {
      const res = await fetch(`/api/authors/${author.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar autor')
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Error al eliminar autor')
    }
  }

  async function handleDeleteBook(book: Book) {
    if (!confirm(`¿Eliminar el libro "${book.title}"?`)) return
    setNotice(null)
    setError(null)
    try {
      const res = await fetch(`/api/books/${book.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar libro')
      setNotice('Libro eliminado correctamente')
      await loadAll()
    } catch (err: any) {
      setError(err.message || 'Error al eliminar libro')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 p-12 dark:bg-black">
        <p className="text-zinc-500 dark:text-zinc-400">Cargando información del autor…</p>
      </div>
    )
  }

  if (error && !author) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 p-12 dark:bg-black">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <Link href="/" className="text-sm underline text-zinc-600 dark:text-zinc-400">
          ← Volver al panel de autores
        </Link>
      </div>
    )
  }

  if (!author) return null

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 sm:px-10">
        <header className="flex flex-col gap-2">
          <Link href="/" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
            ← Volver al panel de autores
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
                {author.name}
              </h1>
              <p className="text-zinc-600 dark:text-zinc-400">{author.email}</p>
              {(author.nationality || author.birthYear) && (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {[author.nationality, author.birthYear].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/books?authorId=${author.id}`}
                className="rounded-full bg-zinc-950 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                + Agregar libro a este autor
              </Link>
              <button
                onClick={startEdit}
                className="rounded-full border border-zinc-300 px-5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Editar autor
              </button>
              <button
                onClick={handleDeleteAuthor}
                className="rounded-full border border-red-300 px-5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
              >
                Eliminar autor
              </button>
            </div>
          </div>
          {author.bio && (
            <p className="max-w-3xl text-zinc-600 dark:text-zinc-400">{author.bio}</p>
          )}
        </header>

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

        {/* Formulario de edición */}
        {editing && form && (
          <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-4 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              Editar información del autor
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nombre *">
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm((f) => f && { ...f, name: e.target.value })}
                />
              </Field>
              <Field label="Email *">
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => f && { ...f, email: e.target.value })}
                />
              </Field>
              <Field label="Nacionalidad">
                <input
                  className="input"
                  value={form.nationality}
                  onChange={(e) => setForm((f) => f && { ...f, nationality: e.target.value })}
                />
              </Field>
              <Field label="Año de nacimiento">
                <input
                  className="input"
                  type="number"
                  value={form.birthYear}
                  onChange={(e) => setForm((f) => f && { ...f, birthYear: e.target.value })}
                />
              </Field>
              <Field label="Biografía" full>
                <textarea
                  className="input min-h-[80px]"
                  value={form.bio}
                  onChange={(e) => setForm((f) => f && { ...f, bio: e.target.value })}
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
                  {submitting ? 'Guardando…' : 'Guardar cambios'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="rounded-full border border-zinc-300 px-6 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Estadísticas */}
        {stats && (
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">Estadísticas</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Total de libros" value={stats.totalBooks} />
              <StatCard label="Promedio de páginas" value={stats.averagePages} />
              <StatCard label="Géneros" value={stats.genres.length} />
              <StatCard
                label="Primer libro"
                value={stats.firstBook ? `${stats.firstBook.title} (${stats.firstBook.year})` : '—'}
                small
              />
              <StatCard
                label="Último libro"
                value={stats.latestBook ? `${stats.latestBook.title} (${stats.latestBook.year})` : '—'}
                small
              />
              <StatCard
                label="Libro más extenso"
                value={
                  stats.longestBook
                    ? `${stats.longestBook.title} (${stats.longestBook.pages} pág.)`
                    : '—'
                }
                small
              />
              <StatCard
                label="Libro más breve"
                value={
                  stats.shortestBook
                    ? `${stats.shortestBook.title} (${stats.shortestBook.pages} pág.)`
                    : '—'
                }
                small
              />
              <StatCard
                label="Géneros que escribe"
                value={stats.genres.length ? stats.genres.join(', ') : '—'}
                small
              />
            </div>
          </section>
        )}

        {/* Lista de libros */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
              Libros ({author.books.length})
            </h2>
            <Link
              href={`/books?authorId=${author.id}`}
              className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              + Agregar libro
            </Link>
          </div>

          {author.books.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400">Este autor todavía no tiene libros registrados.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {author.books.map((book) => (
                <div
                  key={book.id}
                  className="flex flex-col gap-2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    {book.title}
                  </h3>
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
                    <Link
                      href={`/books?authorId=${author.id}`}
                      className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      Editar (en libros)
                    </Link>
                    <button
                      onClick={() => handleDeleteBook(book)}
                      className="rounded-full border border-red-300 px-4 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function StatCard({
  label,
  value,
  small,
}: {
  label: string
  value: string | number
  small?: boolean
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p
        className={
          small
            ? 'line-clamp-2 text-sm font-semibold text-zinc-950 dark:text-zinc-50'
            : 'text-2xl font-semibold text-zinc-950 dark:text-zinc-50'
        }
      >
        {value}
      </p>
      <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
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

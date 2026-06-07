'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Author = {
  id: string
  name: string
  email: string
  bio: string | null
  nationality: string | null
  birthYear: number | null
  books?: { id: string; genre: string | null }[]
  _count?: { books: number }
}

type AuthorFormState = {
  name: string
  email: string
  bio: string
  nationality: string
  birthYear: string
}

const EMPTY_FORM: AuthorFormState = {
  name: '',
  email: '',
  bio: '',
  nationality: '',
  birthYear: '',
}

export default function Home() {
  const [authors, setAuthors] = useState<Author[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [form, setForm] = useState<AuthorFormState>(EMPTY_FORM)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function loadAuthors() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/authors')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar autores')
      setAuthors(data)
    } catch (err: any) {
      setError(err.message || 'Error al cargar autores')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAuthors()
  }, [])

  const stats = useMemo(() => {
    const totalAuthors = authors.length
    const totalBooks = authors.reduce(
      (sum, a) => sum + (a._count?.books ?? a.books?.length ?? 0),
      0
    )
    const genreSet = new Set<string>()
    authors.forEach((a) => a.books?.forEach((b) => b.genre && genreSet.add(b.genre)))
    const avgBooksPerAuthor = totalAuthors ? (totalBooks / totalAuthors).toFixed(1) : '0'

    return {
      totalAuthors,
      totalBooks,
      totalGenres: genreSet.size,
      avgBooksPerAuthor,
    }
  }, [authors])

  function startEdit(author: Author) {
    setEditingId(author.id)
    setForm({
      name: author.name,
      email: author.email,
      bio: author.bio ?? '',
      nationality: author.nationality ?? '',
      birthYear: author.birthYear ? String(author.birthYear) : '',
    })
    setFormError(null)
    setNotice(null)
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
      const url = editingId ? `/api/authors/${editingId}` : '/api/authors'
      const method = editingId ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al guardar autor')

      setNotice(editingId ? 'Autor actualizado correctamente' : 'Autor creado correctamente')
      cancelEdit()
      await loadAuthors()
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar autor')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(author: Author) {
    if (!confirm(`¿Eliminar al autor "${author.name}"? Esto también eliminará sus libros.`)) {
      return
    }
    setNotice(null)
    setError(null)
    try {
      const res = await fetch(`/api/authors/${author.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al eliminar autor')
      setNotice('Autor eliminado correctamente')
      if (editingId === author.id) cancelEdit()
      await loadAuthors()
    } catch (err: any) {
      setError(err.message || 'Error al eliminar autor')
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12 sm:px-10">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            Biblioteca — Panel de autores
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Gestiona autores, revisa estadísticas generales y navega a sus libros.
          </p>
          <nav className="mt-2">
            <Link
              href="/books"
              className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Ir a búsqueda de libros →
            </Link>
          </nav>
        </header>

        {/* Estadísticas generales */}
        <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Autores" value={stats.totalAuthors} />
          <StatCard label="Libros" value={stats.totalBooks} />
          <StatCard label="Géneros distintos" value={stats.totalGenres} />
          <StatCard label="Libros / autor (prom.)" value={stats.avgBooksPerAuthor} />
        </section>

        {/* Formulario crear / editar autor */}
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            {editingId ? 'Editar autor' : 'Crear nuevo autor'}
          </h2>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nombre *">
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Gabriel García Márquez"
              />
            </Field>
            <Field label="Email *">
              <input
                className="input"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="gabo@example.com"
              />
            </Field>
            <Field label="Nacionalidad">
              <input
                className="input"
                value={form.nationality}
                onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
                placeholder="Colombia"
              />
            </Field>
            <Field label="Año de nacimiento">
              <input
                className="input"
                type="number"
                value={form.birthYear}
                onChange={(e) => setForm((f) => ({ ...f, birthYear: e.target.value }))}
                placeholder="1927"
              />
            </Field>
            <Field label="Biografía" full>
              <textarea
                className="input min-h-[80px]"
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                placeholder="Premio Nobel de Literatura 1982"
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
                {submitting ? 'Guardando…' : editingId ? 'Actualizar autor' : 'Crear autor'}
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

        {/* Lista de autores */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">
            Autores ({authors.length})
          </h2>

          {loading ? (
            <p className="text-zinc-500 dark:text-zinc-400">Cargando autores…</p>
          ) : authors.length === 0 ? (
            <p className="text-zinc-500 dark:text-zinc-400">Aún no hay autores registrados.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {authors.map((author) => (
                <div
                  key={author.id}
                  className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                      {author.name}
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{author.email}</p>
                    {(author.nationality || author.birthYear) && (
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {[author.nationality, author.birthYear].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    {author.bio && (
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {author.bio}
                      </p>
                    )}
                    <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {author._count?.books ?? author.books?.length ?? 0} libro(s)
                    </p>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 pt-2">
                    <Link
                      href={`/authors/${author.id}`}
                      className="rounded-full bg-zinc-950 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                      Ver libros y estadísticas
                    </Link>
                    <button
                      onClick={() => startEdit(author)}
                      className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(author)}
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{value}</p>
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

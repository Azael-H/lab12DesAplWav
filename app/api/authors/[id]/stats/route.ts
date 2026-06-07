import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type RouteContext = { params: Promise<{ id: string }> }

// GET - Estadísticas completas de un autor
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params

    const author = await prisma.author.findUnique({
      where: { id },
      include: { books: true },
    })

    if (!author) {
      return NextResponse.json(
        { error: 'Autor no encontrado' },
        { status: 404 }
      )
    }

    const { books } = author
    const totalBooks = books.length

    if (totalBooks === 0) {
      return NextResponse.json({
        authorId: author.id,
        authorName: author.name,
        totalBooks: 0,
        firstBook: null,
        latestBook: null,
        averagePages: 0,
        genres: [],
        longestBook: null,
        shortestBook: null,
      })
    }

    // Libros con año de publicación conocido, ordenados cronológicamente
    const booksWithYear = books.filter(
      (b): b is typeof b & { publishedYear: number } => b.publishedYear != null
    )
    const sortedByYear = [...booksWithYear].sort(
      (a, b) => a.publishedYear - b.publishedYear
    )
    const firstBook = sortedByYear[0]
      ? { title: sortedByYear[0].title, year: sortedByYear[0].publishedYear }
      : null
    const latestBook = sortedByYear[sortedByYear.length - 1]
      ? {
          title: sortedByYear[sortedByYear.length - 1].title,
          year: sortedByYear[sortedByYear.length - 1].publishedYear,
        }
      : null

    // Promedio de páginas (solo libros con páginas registradas)
    const booksWithPages = books.filter(
      (b): b is typeof b & { pages: number } => b.pages != null
    )
    const averagePages = booksWithPages.length
      ? Math.round(
          booksWithPages.reduce((sum, b) => sum + b.pages, 0) / booksWithPages.length
        )
      : 0

    // Géneros únicos
    const genres = Array.from(
      new Set(books.map((b) => b.genre).filter((g): g is string => !!g))
    )

    // Libro más largo / más corto
    const sortedByPages = [...booksWithPages].sort((a, b) => b.pages - a.pages)
    const longestBook = sortedByPages[0]
      ? { title: sortedByPages[0].title, pages: sortedByPages[0].pages }
      : null
    const shortestBook = sortedByPages[sortedByPages.length - 1]
      ? {
          title: sortedByPages[sortedByPages.length - 1].title,
          pages: sortedByPages[sortedByPages.length - 1].pages,
        }
      : null

    return NextResponse.json({
      authorId: author.id,
      authorName: author.name,
      totalBooks,
      firstBook,
      latestBook,
      averagePages,
      genres,
      longestBook,
      shortestBook,
    })
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas del autor' },
      { status: 500 }
    )
  }
}

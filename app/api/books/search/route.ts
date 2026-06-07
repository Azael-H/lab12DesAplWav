import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@/app/generated/prisma/client'

const ALLOWED_SORT_FIELDS = ['title', 'publishedYear', 'createdAt'] as const
type SortField = (typeof ALLOWED_SORT_FIELDS)[number]

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 10
const DEFAULT_PAGE = 1

// GET - Buscar libros con filtros, orden y paginación
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search')?.trim() || undefined
    const genre = searchParams.get('genre')?.trim() || undefined
    const authorName = searchParams.get('authorName')?.trim() || undefined

    let page = parseInt(searchParams.get('page') ?? '')
    if (!Number.isFinite(page) || page < 1) page = DEFAULT_PAGE

    let limit = parseInt(searchParams.get('limit') ?? '')
    if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT
    if (limit > MAX_LIMIT) limit = MAX_LIMIT

    const sortByParam = searchParams.get('sortBy')
    const sortBy: SortField = ALLOWED_SORT_FIELDS.includes(sortByParam as SortField)
      ? (sortByParam as SortField)
      : 'createdAt'

    const orderParam = searchParams.get('order')
    const order: Prisma.SortOrder = orderParam === 'asc' ? 'asc' : 'desc'

    const where: Prisma.BookWhereInput = {
      ...(search && {
        title: { contains: search, mode: 'insensitive' },
      }),
      ...(genre && { genre }),
      ...(authorName && {
        author: {
          name: { contains: authorName, mode: 'insensitive' },
        },
      }),
    }

    const [total, books] = await Promise.all([
      prisma.book.count({ where }),
      prisma.book.findMany({
        where,
        include: {
          author: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { [sortBy]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    const totalPages = Math.max(Math.ceil(total / limit), 1)

    return NextResponse.json({
      data: books,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.log(error)
    return NextResponse.json(
      { error: 'Error al buscar libros' },
      { status: 500 }
    )
  }
}

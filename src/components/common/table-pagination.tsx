'use client'

import { Pagination } from '@heroui/react'
import { useMemo } from 'react'

/** 生成页码序列：当前页前后 2 页 + 首尾，空缺用省略号 */
function getPageItems(page: number, totalPages: number): (number | 'ellipsis')[] {
  const pages = new Set<number>([1, totalPages])
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i++)
    pages.add(i)
  const sorted = [...pages].sort((a, b) => a - b)
  const items: (number | 'ellipsis')[] = []
  let prev = 0
  for (const p of sorted) {
    if (p - prev > 1)
      items.push('ellipsis')
    items.push(p)
    prev = p
  }
  return items
}

/** 表格分页：HeroUI Pagination（Previous / 页码 / Next + 省略号） */
export function TablePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  const items = useMemo(() => getPageItems(page, totalPages), [page, totalPages])

  return (
    <Pagination.Root size="sm" aria-label="Pagination">
      <Pagination.Content>
        <Pagination.Item>
          <Pagination.Previous
            isDisabled={page <= 1}
            onPress={() => onPageChange(Math.max(page - 1, 1))}
          >
            <Pagination.PreviousIcon />
          </Pagination.Previous>
        </Pagination.Item>
        {items.map((p, i) =>
          p === 'ellipsis'
            ? <Pagination.Ellipsis key={`e-${items[i - 1] as number}`} />
            : (
                <Pagination.Item key={p}>
                  <Pagination.Link isActive={p === page} onPress={() => onPageChange(p)}>
                    {p}
                  </Pagination.Link>
                </Pagination.Item>
              ),
        )}
        <Pagination.Item>
          <Pagination.Next
            isDisabled={page >= totalPages}
            onPress={() => onPageChange(Math.min(page + 1, totalPages))}
          >
            <Pagination.NextIcon />
          </Pagination.Next>
        </Pagination.Item>
      </Pagination.Content>
    </Pagination.Root>
  )
}

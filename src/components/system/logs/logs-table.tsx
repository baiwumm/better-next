'use client'

import { Button, Card, Form, Input, Table, TextField } from '@heroui/react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useState } from 'react'
import { TablePagination } from '@/components/common/table-pagination'
import { useT } from '@/store/i18n'

interface LogRow {
  id: string
  username: string | null
  module?: string
  action?: string
  type?: string
  method?: string
  path?: string
  status: string
  ip?: string | null
  detail?: string | null
  createdAt: string
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

const typeLabelKeys: Record<string, string> = {
  login: 'login',
  logout: 'logout',
  register: 'register',
}

const actionLabelKeys: Record<string, string> = {
  'create': 'create',
  'update': 'update',
  'delete': 'delete',
  'assign-permission': 'assignPermission',
  'assign-role': 'assignRole',
  'disable': 'disable',
  'enable': 'enable',
  'reset-password': 'resetPassword',
  'create-data': 'createData',
  'update-data': 'updateData',
  'delete-data': 'deleteData',
}

export function LogsTable({ kind }: { kind: 'operation' | 'login' }) {
  const t = useT()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const isOperation = kind === 'operation'
  const apiPath = isOperation ? '/api/system/logs' : '/api/system/login-logs'

  const { data, isLoading } = useQuery({
    queryKey: [kind, search, page],
    queryFn: async () => {
      const res = await fetch(`${apiPath}?search=${encodeURIComponent(search)}&page=${page}&pageSize=10`)
      if (!res.ok)
        throw new Error('加载日志失败')
      return res.json() as Promise<{ rows: LogRow[], total: number }>
    },
  })

  const totalPages = Math.max(Math.ceil((data?.total ?? 0) / 10), 1)

  return (
    <Card className="gap-0 overflow-hidden">
      {/* 标题栏 + 工具栏 */}
      <Card.Header className="flex flex-col items-stretch justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center">
        <Card.Title className="text-base font-semibold">
          {isOperation ? t('page.logs') : t('page.loginLogs')}
        </Card.Title>
        <Form
          className="flex w-full items-center gap-2 sm:w-auto"
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            setSearch((formData.get('search') as string) ?? '')
            setPage(1)
          }}
        >
          <TextField name="search" className="flex-1 sm:w-64" aria-label={t('common.search')}>
            <Input placeholder={t('log.searchPlaceholder')} variant="secondary" />
          </TextField>
          <Button type="submit" size="sm" variant="secondary" isIconOnly aria-label={t('common.search')}>
            <Search size={14} />
          </Button>
        </Form>
      </Card.Header>
      <Card.Content className="p-0">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="日志列表">
              <Table.Header>
                <Table.Column id="user" isRowHeader>{t('log.user')}</Table.Column>
                {isOperation
                  ? (
                      <>
                        <Table.Column id="module">{t('log.module')}</Table.Column>
                        <Table.Column id="action">{t('log.action')}</Table.Column>
                        <Table.Column id="path">{t('log.path')}</Table.Column>
                      </>
                    )
                  : (
                      <Table.Column id="type">类型</Table.Column>
                    )}
                <Table.Column id="status">{t('log.result')}</Table.Column>
                <Table.Column id="detail">{t('log.detail')}</Table.Column>
                <Table.Column id="time">{t('log.time')}</Table.Column>
              </Table.Header>
              <Table.Body>
                {(data?.rows ?? []).map(log => (
                  <Table.Row key={log.id} id={log.id} className="border-b border-default-100">
                    <Table.Cell className="py-3 text-sm">{log.username ?? '-'}</Table.Cell>
                    {isOperation
                      ? (
                          <>
                            <Table.Cell className="py-3">
                              <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs">{log.module}</span>
                            </Table.Cell>
                            <Table.Cell className="py-3 text-sm">{log.action ? t(`log.${actionLabelKeys[log.action] ?? log.action}`) : '-'}</Table.Cell>
                            <Table.Cell className="py-3">
                              <code className="text-xs text-foreground/60">
                                {log.method}
                                {' '}
                                {log.path}
                              </code>
                            </Table.Cell>
                          </>
                        )
                      : (
                          <Table.Cell className="py-3">
                            <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs">
                              {log.type ? t(`log.${typeLabelKeys[log.type] ?? log.type}`) : '-'}
                            </span>
                          </Table.Cell>
                        )}
                    <Table.Cell className="py-3">
                      <span className={`text-xs ${log.status === 'success' ? 'text-success' : 'text-danger'}`}>
                        {log.status === 'success' ? t('log.success') : t('log.failed')}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="max-w-[240px] truncate py-3 text-xs text-foreground/50">
                      {log.detail ?? '-'}
                    </Table.Cell>
                    <Table.Cell className="py-3 text-sm text-foreground/60">{formatDate(log.createdAt)}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
        {isLoading && <p className="p-6 text-center text-sm text-foreground/60">{t('common.loading')}</p>}
        {!isLoading && (data?.rows.length ?? 0) === 0 && (
          <p className="p-6 text-center text-sm text-foreground/60">{t('common.empty')}</p>
        )}
      </Card.Content>
      <Card.Footer className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-foreground/60">
          {t('common.total', { count: data?.total ?? 0 })}
        </span>
        <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </Card.Footer>
    </Card>
  )
}

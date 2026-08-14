'use client'

import {
  Button,
  Card,
  Form,
  Input,
  Label,
  Modal,
  Switch,
  Table,
  TextField,
} from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { errMsg, useT } from '@/store/i18n'

interface I18nRow {
  id: string
  key: string
  zh: string | null
  en: string | null
  module: string | null
  status: string
  createdAt: string
}

export function I18nTable({ permissions }: { permissions: string[] }) {
  const t = useT()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<I18nRow | null>(null)
  const [deleting, setDeleting] = useState<I18nRow | null>(null)

  const can = (perm: string) => permissions.includes('*') || permissions.includes(perm)

  const { data, isLoading } = useQuery({
    queryKey: ['system-i18n', search],
    queryFn: async () => {
      const res = await fetch(`/api/system/i18n?search=${encodeURIComponent(search)}`)
      if (!res.ok)
        throw new Error('加载词条失败')
      return res.json() as Promise<{ rows: I18nRow[] }>
    },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['system-i18n'] })
    // 前端动态词条缓存也失效（下次进入页面重新拉取）
    queryClient.invalidateQueries({ queryKey: ['i18n'] })
  }

  const saveMutation = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<I18nRow> & { id?: string }) => {
      const res = await fetch(id ? `/api/system/i18n/${id}` : '/api/system/i18n', {
        method: id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok)
        throw new Error(body.error ?? 'E_SAVE_FAILED')
      return body
    },
    onSuccess: () => {
      setCreating(false)
      setEditing(null)
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/system/i18n/${id}`, { method: 'DELETE' })
      const body = await res.json()
      if (!res.ok)
        throw new Error(body.error ?? 'E_DELETE_FAILED')
      return body
    },
    onSuccess: () => {
      setDeleting(null)
      invalidate()
    },
  })

  return (
    <Card className="gap-0 overflow-hidden">
      <Card.Header className="flex flex-col items-stretch justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center">
        <Card.Title className="text-base font-semibold">{t('page.i18n')}</Card.Title>
        <div className="flex items-center gap-2">
          <Form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              setSearch((formData.get('search') as string) ?? '')
            }}
          >
            <TextField name="search" className="flex-1 sm:w-48" aria-label={t('common.search')}>
              <Input placeholder={t('i18n.searchPlaceholder')} variant="secondary" />
            </TextField>
            <Button type="submit" size="sm" variant="secondary" isIconOnly aria-label={t('common.search')}>
              <Search size={14} />
            </Button>
          </Form>
          {can('system:i18n:create') && (
            <Button size="sm" onPress={() => setCreating(true)}>
              <Plus size={14} />
              {t('i18n.create')}
            </Button>
          )}
        </div>
      </Card.Header>
      <Card.Content className="p-0">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="i18n-entries">
              <Table.Header>
                <Table.Column id="key" isRowHeader>key</Table.Column>
                <Table.Column id="zh">{t('i18n.zh')}</Table.Column>
                <Table.Column id="en">English</Table.Column>
                <Table.Column id="module">{t('i18n.module')}</Table.Column>
                <Table.Column id="status">{t('common.status')}</Table.Column>
                <Table.Column id="actions">{t('common.actions')}</Table.Column>
              </Table.Header>
              <Table.Body>
                {(data?.rows ?? []).map(item => (
                  <Table.Row key={item.id} id={item.id} className="border-b border-default-100">
                    <Table.Cell className="py-3"><code className="text-xs text-accent">{item.key}</code></Table.Cell>
                    <Table.Cell className="py-3 text-sm">{item.zh || '-'}</Table.Cell>
                    <Table.Cell className="py-3 text-sm text-foreground/70">{item.en || '-'}</Table.Cell>
                    <Table.Cell className="py-3">
                      <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-xs text-foreground/60">
                        {item.module ?? 'common'}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="py-3">
                      <span className={`text-xs ${item.status === 'active' ? 'text-success' : 'text-danger'}`}>
                        {item.status === 'active' ? t('common.enabled') : t('common.disabled')}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="py-3">
                      <div className="flex gap-1">
                        {can('system:i18n:update') && (
                          <Button size="sm" variant="ghost" onPress={() => setEditing(item)}>{t('common.edit')}</Button>
                        )}
                        {can('system:i18n:delete') && (
                          <Button size="sm" variant="ghost" className="text-danger" onPress={() => setDeleting(item)}>{t('common.delete')}</Button>
                        )}
                      </div>
                    </Table.Cell>
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

      {(creating || editing) && (
        <Modal.Backdrop
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              setCreating(false)
              setEditing(null)
            }
          }}
        >
          <Modal.Container size="md">
            <Modal.Dialog>
              <I18nForm
                item={editing}
                isPending={saveMutation.isPending}
                error={errMsg(t, saveMutation.error)}
                onSubmit={(payload) => {
                  if (editing)
                    saveMutation.mutate({ ...payload, id: editing.id })
                  else
                    saveMutation.mutate(payload)
                }}
                onCancel={() => {
                  setCreating(false)
                  setEditing(null)
                }}
              />
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}

      {deleting && (
        <Modal.Backdrop
          isOpen
          onOpenChange={(open) => {
            if (!open)
              setDeleting(null)
          }}
        >
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header><Modal.Heading>{t('common.confirmDelete')}</Modal.Heading></Modal.Header>
              <Modal.Body>
                <p className="text-sm text-foreground/70">
                  {t('common.confirmDeleteText', { name: deleting.key })}
                  {deleting.key}
                  」吗？
                </p>
                {deleteMutation.error && <p className="text-sm text-danger">{errMsg(t, deleteMutation.error)}</p>}
              </Modal.Body>
              <Modal.Footer className="flex justify-end gap-2">
                <Button variant="secondary" onPress={() => setDeleting(null)}>{t('common.cancel')}</Button>
                <Button variant="danger" isPending={deleteMutation.isPending} onPress={() => deleteMutation.mutate(deleting.id)}>{t('common.delete')}</Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}
    </Card>
  )
}

function I18nForm({
  item,
  isPending,
  error,
  onSubmit,
  onCancel,
}: {
  item: I18nRow | null
  isPending: boolean
  error?: string
  onSubmit: (payload: Partial<I18nRow>) => void
  onCancel: () => void
}) {
  const t = useT()
  const [enabled, setEnabled] = useState(item?.status !== 'disabled')

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        onSubmit({
          key: (formData.get('key') as string) ?? '',
          zh: (formData.get('zh') as string) ?? '',
          en: (formData.get('en') as string) ?? '',
          module: (formData.get('module') as string) ?? 'common',
          status: enabled ? 'active' : 'disabled',
        })
      }}
    >
      <Modal.Header><Modal.Heading>{item ? t('i18n.edit') : t('i18n.create')}</Modal.Heading></Modal.Header>
      <Modal.Body className="flex flex-col gap-4">
        <TextField name="key" isRequired isReadOnly={!!item} defaultValue={item?.key} validate={value => (!value ? t('i18n.keyRequired') : undefined)}>
          <Label>{t('i18n.key')}</Label>
          <Input placeholder={t('i18n.keyPlaceholder')} variant="secondary" />
        </TextField>
        <TextField name="zh" defaultValue={item?.zh ?? ''}>
          <Label>{t('i18n.zh')}</Label>
          <Input placeholder={t('i18n.zhPlaceholder')} variant="secondary" />
        </TextField>
        <TextField name="en" defaultValue={item?.en ?? ''}>
          <Label>{t('i18n.en')}</Label>
          <Input placeholder="English text" variant="secondary" />
        </TextField>
        <TextField name="module" defaultValue={item?.module ?? 'common'}>
          <Label>{t('i18n.moduleGroup')}</Label>
          <Input placeholder={t('i18n.modulePlaceholder')} variant="secondary" />
        </TextField>
        <Switch isSelected={enabled} onChange={setEnabled}>
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
            {enabled ? t('common.enabled') : t('common.disabled')}
          </Switch.Content>
        </Switch>
        {error && <p className="text-sm text-danger">{error}</p>}
      </Modal.Body>
      <Modal.Footer className="flex justify-end gap-2">
        <Button variant="secondary" onPress={onCancel}>{t('common.cancel')}</Button>
        <Button type="submit" isPending={isPending}>{t('common.save')}</Button>
      </Modal.Footer>
    </Form>
  )
}

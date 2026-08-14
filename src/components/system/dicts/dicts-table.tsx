'use client'

import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Label,
  Modal,
  Switch,
  Table,
  TextArea,
  TextField,
} from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Database, Plus, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { errMsg, useT } from '@/store/i18n'

interface DictTypeRow {
  id: string
  code: string
  name: string
  status: string
  remark: string | null
  createdAt: string
  dataCount: number
}

interface DictDataRow {
  id: string
  typeId: string
  label: string
  value: string
  sort: number
  isDefault: boolean
  status: string
}

export function DictsTable({ permissions }: { permissions: string[] }) {
  const t = useT()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<DictTypeRow | null>(null)
  const [deleting, setDeleting] = useState<DictTypeRow | null>(null)
  const [managing, setManaging] = useState<DictTypeRow | null>(null)

  const can = (perm: string) => permissions.includes('*') || permissions.includes(perm)

  const { data, isLoading } = useQuery({
    queryKey: ['dicts'],
    queryFn: async () => {
      const res = await fetch('/api/system/dicts')
      if (!res.ok)
        throw new Error('加载字典失败')
      return res.json() as Promise<{ rows: DictTypeRow[] }>
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['dicts'] })

  const saveMutation = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<DictTypeRow> & { id?: string }) => {
      const res = await fetch(id ? `/api/system/dicts/${id}` : '/api/system/dicts', {
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
      const res = await fetch(`/api/system/dicts/${id}`, { method: 'DELETE' })
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
      <Card.Header className="flex items-center justify-between gap-4 px-5 py-4">
        <Card.Title className="text-base font-semibold">{t('page.dicts')}</Card.Title>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" isIconOnly aria-label={t('common.refresh')} onPress={() => invalidate()}>
            <RefreshCw size={14} />
          </Button>
          {can('system:dict:create') && (
            <Button size="sm" onPress={() => setCreating(true)}>
              <Plus size={14} />
              {t('dict.create')}
            </Button>
          )}
        </div>
      </Card.Header>
      <Card.Content className="p-0">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="dict-types">
              <Table.Header>
                <Table.Column id="code" isRowHeader>{t('dict.code')}</Table.Column>
                <Table.Column id="name">{t('dict.name')}</Table.Column>
                <Table.Column id="dataCount">{t('dict.dataCount')}</Table.Column>
                <Table.Column id="status">{t('common.status')}</Table.Column>
                <Table.Column id="remark">{t('dict.remark')}</Table.Column>
                <Table.Column id="actions">{t('common.actions')}</Table.Column>
              </Table.Header>
              <Table.Body>
                {(data?.rows ?? []).map(dict => (
                  <Table.Row key={dict.id} id={dict.id} className="border-b border-default-100">
                    <Table.Cell className="py-3"><code className="text-sm">{dict.code}</code></Table.Cell>
                    <Table.Cell className="py-3"><span className="font-medium">{dict.name}</span></Table.Cell>
                    <Table.Cell className="py-3"><span className="text-sm text-foreground/60">{dict.dataCount}</span></Table.Cell>
                    <Table.Cell className="py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${dict.status === 'active' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
                        {dict.status === 'active' ? t('common.enabled') : t('common.disabled')}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="py-3 text-sm text-foreground/60">{dict.remark ?? '-'}</Table.Cell>
                    <Table.Cell className="py-3">
                      <div className="flex gap-1">
                        {can('system:dict:update') && (
                          <Button size="sm" variant="ghost" onPress={() => setManaging(dict)}>
                            <Database size={13} />
                            {t('dict.data')}
                          </Button>
                        )}
                        {can('system:dict:update') && (
                          <Button size="sm" variant="ghost" onPress={() => setEditing(dict)}>{t('common.edit')}</Button>
                        )}
                        {can('system:dict:delete') && (
                          <Button size="sm" variant="ghost" className="text-danger" onPress={() => setDeleting(dict)}>{t('common.delete')}</Button>
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

      {/* 新增 / 编辑类型 */}
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
              <DictTypeForm
                dict={editing}
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

      {/* 删除确认 */}
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
              <Modal.Header>
                <Modal.Heading>{t('common.confirmDelete')}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-foreground/70">
                  {t('common.confirmDeleteText', { name: deleting.name })}
                  {' '}
                  {t('dict.deleteCascade', { count: deleting.dataCount ?? 0 })}
                </p>
                {deleteMutation.error && <p className="text-sm text-danger">{errMsg(t, deleteMutation.error)}</p>}
              </Modal.Body>
              <Modal.Footer className="flex justify-end gap-2">
                <Button variant="secondary" onPress={() => setDeleting(null)}>{t('common.cancel')}</Button>
                <Button variant="danger" isPending={deleteMutation.isPending} onPress={() => deleteMutation.mutate(deleting.id)}>
                  {t('common.delete')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}

      {/* 数据管理 */}
      {managing && (
        <Modal.Backdrop
          isOpen
          onOpenChange={(open) => {
            if (!open)
              setManaging(null)
          }}
        >
          <Modal.Container size="lg">
            <Modal.Dialog>
              <DictDataManager
                dict={managing}
                permissions={permissions}
                onClose={() => setManaging(null)}
                onChanged={() => invalidate()}
              />
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}
    </Card>
  )
}

function DictTypeForm({
  dict,
  isPending,
  error,
  onSubmit,
  onCancel,
}: {
  dict: DictTypeRow | null
  isPending: boolean
  error?: string
  onSubmit: (payload: Partial<DictTypeRow>) => void
  onCancel: () => void
}) {
  const t = useT()
  const [enabled, setEnabled] = useState(dict?.status !== 'disabled')

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        onSubmit({
          code: (formData.get('code') as string) ?? '',
          name: (formData.get('name') as string) ?? '',
          remark: (formData.get('remark') as string) ?? '',
          status: enabled ? 'active' : 'disabled',
        })
      }}
    >
      <Modal.Header>
        <Modal.Heading>{dict ? t('dict.edit') : t('dict.create')}</Modal.Heading>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-4">
        <TextField name="code" isRequired isReadOnly={!!dict} defaultValue={dict?.code} validate={value => (!value ? t('dict.codeRequired') : undefined)}>
          <Label>{t('dict.code')}</Label>
          <Input placeholder={t('dict.codePlaceholder')} variant="secondary" />
        </TextField>
        <TextField name="name" isRequired defaultValue={dict?.name} validate={value => (!value ? t('dict.nameRequired') : undefined)}>
          <Label>{t('dict.name')}</Label>
          <Input placeholder={t('dict.namePlaceholder')} variant="secondary" />
        </TextField>
        <TextField name="remark" defaultValue={dict?.remark ?? ''}>
          <Label>{t('dict.remark')}</Label>
          <TextArea placeholder={t('dict.remarkPlaceholder')} variant="secondary" />
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

function DictDataManager({
  dict,
  permissions,
  onClose,
  onChanged,
}: {
  dict: DictTypeRow
  permissions: string[]
  onClose: () => void
  onChanged: () => void
}) {
  const t = useT()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<DictDataRow | null>(null)
  const [deleting, setDeleting] = useState<DictDataRow | null>(null)
  const can = (perm: string) => permissions.includes('*') || permissions.includes(perm)

  const { data, isLoading } = useQuery({
    queryKey: ['dict-data', dict.id],
    queryFn: async () => {
      const res = await fetch(`/api/system/dicts/${dict.id}/data`)
      if (!res.ok)
        throw new Error('加载字典数据失败')
      return res.json() as Promise<{ rows: DictDataRow[] }>
    },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['dict-data', dict.id] })
    onChanged()
  }

  const saveMutation = useMutation({
    mutationFn: async ({ dataId, ...payload }: Partial<DictDataRow> & { dataId?: string }) => {
      const url = dataId ? `/api/system/dicts/data/${dataId}` : `/api/system/dicts/${dict.id}/data`
      const res = await fetch(url, {
        method: dataId ? 'PUT' : 'POST',
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
    mutationFn: async (dataId: string) => {
      const res = await fetch(`/api/system/dicts/data/${dataId}`, { method: 'DELETE' })
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
    <div className="flex flex-col">
      <Modal.Header className="flex items-center justify-between">
        <Modal.Heading>{t('dict.dataFor', { name: dict.name })}</Modal.Heading>
        {can('system:dict:create') && (
          <Button size="sm" onPress={() => setCreating(true)}>
            <Plus size={14} />
            {t('dict.createData')}
          </Button>
        )}
      </Modal.Header>
      <Modal.Body className="max-h-[50vh] overflow-auto p-0">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="dict-data">
              <Table.Header>
                <Table.Column id="label" isRowHeader>{t('dict.dataLabel')}</Table.Column>
                <Table.Column id="value">{t('dict.dataValue')}</Table.Column>
                <Table.Column id="sort">{t('menu.sort')}</Table.Column>
                <Table.Column id="isDefault">{t('dict.dataDefault')}</Table.Column>
                <Table.Column id="status">{t('common.status')}</Table.Column>
                <Table.Column id="actions">{t('common.actions')}</Table.Column>
              </Table.Header>
              <Table.Body>
                {(data?.rows ?? []).map(item => (
                  <Table.Row key={item.id} id={item.id} className="border-b border-default-100">
                    <Table.Cell className="py-3">{item.label}</Table.Cell>
                    <Table.Cell className="py-3"><code className="text-sm text-foreground/70">{item.value}</code></Table.Cell>
                    <Table.Cell className="py-3 text-sm text-foreground/60">{item.sort}</Table.Cell>
                    <Table.Cell className="py-3">{item.isDefault ? '✓' : '-'}</Table.Cell>
                    <Table.Cell className="py-3">
                      <span className={`text-xs ${item.status === 'active' ? 'text-success' : 'text-danger'}`}>
                        {item.status === 'active' ? t('common.enabled') : t('common.disabled')}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="py-3">
                      <div className="flex gap-1">
                        {can('system:dict:update') && (
                          <Button size="sm" variant="ghost" onPress={() => setEditing(item)}>{t('common.edit')}</Button>
                        )}
                        {can('system:dict:delete') && (
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
        {isLoading && <p className="p-3 text-center text-sm text-foreground/60">{t('common.loading')}</p>}
        {!isLoading && (data?.rows.length ?? 0) === 0 && (
          <p className="p-3 text-center text-sm text-foreground/60">{t('common.empty')}</p>
        )}
      </Modal.Body>
      <Modal.Footer className="flex justify-end">
        <Button variant="secondary" onPress={onClose}>{t('common.close')}</Button>
      </Modal.Footer>

      {/* 数据表单 */}
      {(creating || editing) && (
        <DictDataForm
          item={editing}
          isPending={saveMutation.isPending}
          error={errMsg(t, saveMutation.error)}
          onSubmit={(payload) => {
            if (editing)
              saveMutation.mutate({ ...payload, dataId: editing.id })
            else
              saveMutation.mutate(payload)
          }}
          onCancel={() => {
            setCreating(false)
            setEditing(null)
          }}
        />
      )}

      {/* 数据删除确认 */}
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
                  {t('common.confirmDeleteText', { name: deleting.label })}
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
    </div>
  )
}

function DictDataForm({
  item,
  isPending,
  error,
  onSubmit,
  onCancel,
}: {
  item: DictDataRow | null
  isPending: boolean
  error?: string
  onSubmit: (payload: Partial<DictDataRow>) => void
  onCancel: () => void
}) {
  const t = useT()
  const [enabled, setEnabled] = useState(item?.status !== 'disabled')
  const [isDefault, setIsDefault] = useState(item?.isDefault ?? false)

  return (
    <Modal.Backdrop
      isOpen
      onOpenChange={(open) => {
        if (!open)
          onCancel()
      }}
    >
      <Modal.Container size="sm">
        <Modal.Dialog>
          <Form
            onSubmit={(e) => {
              e.preventDefault()
              const formData = new FormData(e.currentTarget)
              onSubmit({
                label: (formData.get('label') as string) ?? '',
                value: (formData.get('value') as string) ?? '',
                sort: Number(formData.get('sort') ?? 0),
                isDefault,
                status: enabled ? 'active' : 'disabled',
              })
            }}
          >
            <Modal.Header>
              <Modal.Heading>{item ? t('dict.editData') : t('dict.createData')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-4">
              <TextField name="label" isRequired defaultValue={item?.label} validate={value => (!value ? t('dict.dataLabelRequired') : undefined)}>
                <Label>{t('dict.dataLabel')}</Label>
                <Input placeholder={t('dict.dataLabelPlaceholder')} variant="secondary" />
              </TextField>
              <TextField name="value" isRequired defaultValue={item?.value} validate={value => (!value ? t('dict.dataValueRequired') : undefined)}>
                <Label>{t('dict.dataValue')}</Label>
                <Input placeholder={t('dict.dataValuePlaceholder')} variant="secondary" />
              </TextField>
              <TextField name="sort" defaultValue={String(item?.sort ?? 0)}>
                <Label>{t('menu.sort')}</Label>
                <Input type="number" variant="secondary" />
              </TextField>
              <div className="flex gap-6">
                <Checkbox isSelected={isDefault} onChange={setIsDefault}>
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    {t('dict.setDefault')}
                  </Checkbox.Content>
                </Checkbox>
                <Switch isSelected={enabled} onChange={setEnabled}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    {enabled ? t('common.enabled') : t('common.disabled')}
                  </Switch.Content>
                </Switch>
              </div>
              {error && <p className="text-sm text-danger">{error}</p>}
            </Modal.Body>
            <Modal.Footer className="flex justify-end gap-2">
              <Button variant="secondary" onPress={onCancel}>{t('common.cancel')}</Button>
              <Button type="submit" isPending={isPending}>{t('common.save')}</Button>
            </Modal.Footer>
          </Form>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}

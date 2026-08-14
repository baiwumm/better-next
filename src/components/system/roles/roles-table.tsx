'use client'

import type { SortingState } from '@tanstack/react-table'
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
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,

  useReactTable,
} from '@tanstack/react-table'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { errMsg, useT } from '@/store/i18n'

interface Role {
  id: string
  code: string
  name: string
  description: string | null
  builtin: boolean
  status: string
  createdAt: string
  updatedAt: string
}

interface MenuNode {
  id: string
  name: string
  type: 'dir' | 'menu' | 'button'
  children: MenuNode[]
}

const columnHelper = createColumnHelper<Role>()

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

export function RolesTable({ permissions }: { permissions: string[] }) {
  const t = useT()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Role | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Role | null>(null)
  const [assigning, setAssigning] = useState<Role | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])

  const can = (perm: string) => permissions.includes('*') || permissions.includes(perm)

  const { data, isLoading } = useQuery({
    queryKey: ['roles', search],
    queryFn: async () => {
      const res = await fetch(`/api/system/roles?search=${encodeURIComponent(search)}`)
      if (!res.ok)
        throw new Error('加载角色失败')
      return res.json() as Promise<{ rows: Role[], total: number }>
    },
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['roles'] })

  const createMutation = useMutation({
    mutationFn: async (payload: Partial<Role>) => {
      const res = await fetch('/api/system/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok)
        throw new Error(body.error ?? 'E_CREATE_FAILED')
      return body
    },
    onSuccess: () => {
      setCreating(false)
      invalidate()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }: Partial<Role> & { id: string }) => {
      const res = await fetch(`/api/system/roles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = await res.json()
      if (!res.ok)
        throw new Error(body.error ?? '更新失败')
      return body
    },
    onSuccess: () => {
      setEditing(null)
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/system/roles/${id}`, { method: 'DELETE' })
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

  const assignMutation = useMutation({
    mutationFn: async ({ id, menuIds }: { id: string, menuIds: string[] }) => {
      const res = await fetch(`/api/system/roles/${id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuIds }),
      })
      const body = await res.json()
      if (!res.ok)
        throw new Error(body.error ?? '分配失败')
      return body
    },
    onSuccess: () => {
      setAssigning(null)
      invalidate()
    },
  })

  const columns = [
    columnHelper.accessor('name', {
      header: t('role.name'),
      cell: info => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('code', {
      header: t('role.code'),
      cell: info => <code className="text-sm text-foreground/70">{info.getValue()}</code>,
    }),
    columnHelper.accessor('builtin', {
      header: t('menu.type'),
      cell: info => (
        <span className={`rounded-full px-2 py-0.5 text-xs ${info.getValue() ? 'bg-accent/15 text-accent' : 'bg-foreground/5 text-foreground/60'}`}>
          {info.getValue() ? t('role.builtin') : t('role.custom')}
        </span>
      ),
    }),
    columnHelper.accessor('status', {
      header: t('common.status'),
      cell: info => (
        <span className={`rounded-full px-2 py-0.5 text-xs ${info.getValue() === 'active' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
          {info.getValue() === 'active' ? t('common.enabled') : t('common.disabled')}
        </span>
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: t('common.createdAt'),
      cell: info => <span className="text-sm text-foreground/60">{formatDate(info.getValue())}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: t('common.actions'),
      cell: info => (
        <div className="flex flex-wrap gap-1">
          {can('system:role:update') && (
            <Button size="sm" variant="ghost" onPress={() => setEditing(info.row.original)}>
              {t('common.edit')}
            </Button>
          )}
          {can('system:role:assign-permission') && (
            <Button size="sm" variant="ghost" onPress={() => setAssigning(info.row.original)}>
              {t('role.assignPermission')}
            </Button>
          )}
          {can('system:role:delete') && (
            <Button size="sm" variant="ghost" className="text-danger" onPress={() => setDeleting(info.row.original)}>
              {t('common.delete')}
            </Button>
          )}
        </div>
      ),
    }),
  ]

  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <Card className="gap-0 overflow-hidden">
      {/* 标题栏：左标题 + 右主操作 */}
      <Card.Header className="flex items-center justify-between gap-4 px-5 py-4">
        <Card.Title className="text-base font-semibold">{t('page.roles')}</Card.Title>
        <div className="flex items-center gap-2">
          {can('system:role:create') && (
            <Button size="sm" onPress={() => setCreating(true)}>
              <Plus size={14} />
              {t('role.create')}
            </Button>
          )}
        </div>
      </Card.Header>

      {/* 工具栏：搜索（左对齐） */}
      <div className="flex flex-col gap-3 border-t border-default-200 bg-default-50/50 px-5 py-3 sm:flex-row sm:items-center">
        <Form
          className="flex w-full items-center gap-2 sm:w-auto"
          onSubmit={(e) => {
            e.preventDefault()
            const formData = new FormData(e.currentTarget)
            setSearch((formData.get('search') as string) ?? '')
          }}
        >
          <TextField name="search" className="flex-1 sm:w-64" aria-label={t('common.search')}>
            <Input placeholder={t('role.searchPlaceholder')} variant="secondary" />
          </TextField>
          <Button type="submit" size="sm" variant="secondary" isIconOnly aria-label="搜索">
            <Search size={14} />
          </Button>
        </Form>
        <div className="text-sm text-foreground/50 sm:ml-auto">
          {t('common.total', { count: data?.total ?? 0 })}
        </div>
      </div>

      {/* 表格 */}
      <Card.Content className="p-0">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="角色列表">
              <Table.Header>
                {table.getHeaderGroups().flatMap(hg =>
                  hg.headers.map(header => (
                    <Table.Column key={header.id} id={header.id} isRowHeader allowsSorting={header.column.getCanSort()}>
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </Table.Column>
                  )),
                )}
              </Table.Header>
              <Table.Body>
                {table.getRowModel().rows.map(row => (
                  <Table.Row key={row.id} id={row.id} className="border-b border-default-100">
                    {row.getVisibleCells().map(cell => (
                      <Table.Cell key={cell.id} className="py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
        {isLoading && <p className="p-6 text-center text-sm text-foreground/60">加载中...</p>}
        {!isLoading && table.getRowModel().rows.length === 0 && (
          <p className="p-6 text-center text-sm text-foreground/60">{t('common.empty')}</p>
        )}
      </Card.Content>

      {/* 新建 / 编辑 */}
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
          <Modal.Container>
            <Modal.Dialog>
              <RoleForm
                role={editing}
                isPending={createMutation.isPending || updateMutation.isPending}
                error={errMsg(t, createMutation.error) ?? errMsg(t, updateMutation.error)}
                onSubmit={(payload) => {
                  if (editing)
                    updateMutation.mutate({ id: editing.id, ...payload })
                  else
                    createMutation.mutate(payload)
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
                </p>
                {deleteMutation.error && (
                  <p className="text-sm text-danger">{errMsg(t, deleteMutation.error)}</p>
                )}
              </Modal.Body>
              <Modal.Footer className="flex justify-end gap-2">
                <Button variant="secondary" onPress={() => setDeleting(null)}>{t('common.cancel')}</Button>
                <Button
                  variant="danger"
                  isPending={deleteMutation.isPending}
                  onPress={() => deleteMutation.mutate(deleting.id)}
                >
                  {t('common.delete')}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}

      {/* 分配权限 */}
      {assigning && (
        <Modal.Backdrop
          isOpen
          onOpenChange={(open) => {
            if (!open)
              setAssigning(null)
          }}
        >
          <Modal.Container size="lg">
            <Modal.Dialog>
              <PermissionAssigner
                role={assigning}
                isPending={assignMutation.isPending}
                error={errMsg(t, assignMutation.error)}
                onSave={menuIds => assignMutation.mutate({ id: assigning.id, menuIds })}
                onCancel={() => setAssigning(null)}
              />
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}
    </Card>
  )
}

function RoleForm({
  role,
  isPending,
  error,
  onSubmit,
  onCancel,
}: {
  role: Role | null
  isPending: boolean
  error?: string
  onSubmit: (payload: Partial<Role>) => void
  onCancel: () => void
}) {
  const t = useT()
  const [enabled, setEnabled] = useState(role?.status !== 'disabled')

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        onSubmit({
          code: (formData.get('code') as string) ?? '',
          name: (formData.get('name') as string) ?? '',
          description: (formData.get('description') as string) ?? '',
          status: enabled ? 'active' : 'disabled',
        })
      }}
    >
      <Modal.Header>
        <Modal.Heading>{role ? t('role.edit') : t('role.create')}</Modal.Heading>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-4">
        <TextField
          name="code"
          isRequired
          isReadOnly={!!role}
          defaultValue={role?.code}
          validate={value => (!value ? t('role.codeRequired') : undefined)}
        >
          <Label>{t('role.code')}</Label>
          <Input placeholder={t('role.codePlaceholder')} variant="secondary" />
          <span className="text-xs text-foreground/50">{t('role.codeImmutable')}</span>
        </TextField>

        <TextField
          name="name"
          isRequired
          defaultValue={role?.name}
          validate={value => (!value ? t('role.nameRequired') : undefined)}
        >
          <Label>{t('role.name')}</Label>
          <Input placeholder={t('role.namePlaceholder')} variant="secondary" />
        </TextField>

        <TextField name="description" defaultValue={role?.description ?? ''}>
          <Label>{t('role.description')}</Label>
          <TextArea placeholder={t('role.descriptionPlaceholder')} variant="secondary" />
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

function PermissionAssigner({
  role,
  isPending,
  error,
  onSave,
  onCancel,
}: {
  role: Role
  isPending: boolean
  error?: string
  onSave: (menuIds: string[]) => void
  onCancel: () => void
}) {
  const t = useT()
  const [selected, setSelected] = useState<Set<string>>(() => new Set())

  const { data: menuTree, isLoading } = useQuery({
    queryKey: ['menus', 'tree'],
    queryFn: async () => {
      const res = await fetch('/api/system/menus')
      if (!res.ok)
        throw new Error('加载菜单失败')
      return res.json() as Promise<MenuNode[]>
    },
  })

  const { data: assigned } = useQuery({
    queryKey: ['role-permissions', role.id],
    queryFn: async () => {
      const res = await fetch(`/api/system/roles/${role.id}/permissions`)
      if (!res.ok)
        throw new Error('加载已分配权限失败')
      return res.json() as Promise<{ menuIds: string[] }>
    },
  })

  const [initialized, setInitialized] = useState(false)
  if (assigned && !initialized) {
    setSelected(new Set(assigned.menuIds))
    setInitialized(true)
  }

  const collectIds = (nodes: MenuNode[]): string[] => nodes.flatMap(n => [n.id, ...collectIds(n.children)])

  const toggle = (node: MenuNode, checked: boolean) => {
    const ids = node.type === 'button' ? [node.id] : [node.id, ...collectIds(node.children)]
    setSelected((prev) => {
      const next = new Set(prev)
      for (const id of ids) {
        if (checked)
          next.add(id)
        else
          next.delete(id)
      }
      return next
    })
  }

  const renderNode = (node: MenuNode) => {
    const nodeIds = node.type === 'button' ? [node.id] : [node.id, ...collectIds(node.children)]
    const allChecked = nodeIds.every(id => selected.has(id))
    const someChecked = nodeIds.some(id => selected.has(id))

    return (
      <div key={node.id} className="flex flex-col gap-1">
        <Checkbox
          isSelected={allChecked || (someChecked && !allChecked)}
          isIndeterminate={someChecked && !allChecked}
          onChange={checked => toggle(node, checked)}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            <span className="text-sm">{node.name}</span>
          </Checkbox.Content>
        </Checkbox>
        {node.children.length > 0 && (
          <div className="ml-6 flex flex-col gap-1 border-l border-default-200 pl-3">
            {node.children.map(renderNode)}
          </div>
        )}
      </div>
    )
  }

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault()
        onSave([...selected])
      }}
    >
      <Modal.Header>
        <Modal.Heading>{t('role.assignPermissionTo', { name: role.name })}</Modal.Heading>
      </Modal.Header>
      <Modal.Body className="max-h-[50vh] overflow-auto">
        {isLoading && <p className="text-sm text-foreground/60">{t('common.loading')}</p>}
        {menuTree?.map(renderNode)}
        {error && <p className="text-sm text-danger">{error}</p>}
      </Modal.Body>
      <Modal.Footer className="flex justify-end gap-2">
        <Button variant="secondary" onPress={onCancel}>{t('common.cancel')}</Button>
        <Button type="submit" isPending={isPending}>{t('common.save')}</Button>
      </Modal.Footer>
    </Form>
  )
}

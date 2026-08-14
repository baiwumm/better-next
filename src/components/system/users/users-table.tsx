'use client'

import {
  Button,
  Card,
  Checkbox,
  Form,
  Input,
  Label,
  Modal,
  Table,
  TextField,
} from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { useState } from 'react'
import { TablePagination } from '@/components/common/table-pagination'
import { errMsg, useT } from '@/store/i18n'

interface RoleInfo {
  id: string
  code: string
  name: string
  builtin: boolean
}

interface UserRow {
  id: string
  name: string
  email: string
  emailVerified: boolean
  banned: boolean
  role: string | null
  createdAt: string
  roles: { code: string, name: string }[]
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}

export function UsersTable({ permissions }: { permissions: string[] }) {
  const t = useT()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)
  const [resetting, setResetting] = useState<UserRow | null>(null)
  const [assigning, setAssigning] = useState<UserRow | null>(null)
  const [deleting, setDeleting] = useState<UserRow | null>(null)

  const can = (perm: string) => permissions.includes('*') || permissions.includes(perm)

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, page],
    queryFn: async () => {
      const res = await fetch(`/api/system/users?search=${encodeURIComponent(search)}&page=${page}&pageSize=10`)
      if (!res.ok)
        throw new Error('加载用户失败')
      return res.json() as Promise<{ rows: UserRow[], total: number }>
    },
  })

  const { data: roleOptions } = useQuery({
    queryKey: ['roles', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/system/roles?pageSize=100')
      if (!res.ok)
        throw new Error('加载角色失败')
      return res.json() as Promise<{ rows: RoleInfo[] }>
    },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] })
  }

  const createMutation = useMutation({
    mutationFn: async (payload: { email: string, password: string, name: string, roleIds: string[] }) => {
      const res = await fetch('/api/system/users', {
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
    mutationFn: async ({ id, ...payload }: { id: string, name?: string, newPassword?: string, banned?: boolean, banReason?: string }) => {
      const res = await fetch(`/api/system/users/${id}`, {
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
      setResetting(null)
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/system/users/${id}`, { method: 'DELETE' })
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
    mutationFn: async ({ id, roleIds }: { id: string, roleIds: string[] }) => {
      const res = await fetch(`/api/system/users/${id}/roles`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleIds }),
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

  const toggleBan = (user: UserRow) => {
    updateMutation.mutate({
      id: user.id,
      banned: !user.banned,
      banReason: !user.banned ? '手动禁用' : null as unknown as undefined,
    })
  }

  const totalPages = Math.max(Math.ceil((data?.total ?? 0) / 10), 1)

  return (
    <Card className="gap-0 overflow-hidden">
      {/* 标题栏：左标题 + 右主操作 */}
      <Card.Header className="flex items-center justify-between gap-4 px-5 py-4">
        <Card.Title className="text-base font-semibold">{t('page.users')}</Card.Title>
        <div className="flex items-center gap-2">
          {can('system:user:create') && (
            <Button size="sm" onPress={() => setCreating(true)}>
              <Plus size={14} />
              {t('user.create')}
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
            setPage(1)
          }}
        >
          <TextField name="search" className="flex-1 sm:w-64" aria-label={t('common.search')}>
            <Input placeholder={t('user.searchPlaceholder')} variant="secondary" />
          </TextField>
          <Button type="submit" size="sm" variant="secondary" isIconOnly aria-label="搜索">
            <Search size={14} />
          </Button>
        </Form>
      </div>

      {/* 表格 */}
      <Card.Content className="p-0">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="用户列表">
              <Table.Header>
                <Table.Column id="name" isRowHeader>{t('user.name')}</Table.Column>
                <Table.Column id="email">{t('user.email')}</Table.Column>
                <Table.Column id="roles">{t('user.roles')}</Table.Column>
                <Table.Column id="verified">{t('user.verified')}</Table.Column>
                <Table.Column id="status">{t('common.status')}</Table.Column>
                <Table.Column id="createdAt">{t('common.createdAt')}</Table.Column>
                <Table.Column id="actions">{t('common.actions')}</Table.Column>
              </Table.Header>
              <Table.Body>
                {(data?.rows ?? []).map(user => (
                  <Table.Row key={user.id} id={user.id} className="border-b border-default-100">
                    <Table.Cell className="py-3">
                      <span className="font-medium">{user.name}</span>
                    </Table.Cell>
                    <Table.Cell className="py-3 text-sm text-foreground/70">{user.email}</Table.Cell>
                    <Table.Cell className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 && <span className="text-foreground/40">-</span>}
                        {user.roles.map(r => (
                          <span key={r.code} className={`rounded-full px-2 py-0.5 text-xs ${r.code === 'admin' ? 'bg-accent/15 text-accent' : 'bg-foreground/5 text-foreground/60'}`}>
                            {r.name}
                          </span>
                        ))}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="py-3">
                      <span className={`text-xs ${user.emailVerified ? 'text-success' : 'text-warning'}`}>
                        {user.emailVerified ? t('user.verifiedYes') : t('user.verifiedNo')}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${user.banned ? 'bg-danger/15 text-danger' : 'bg-success/15 text-success'}`}>
                        {user.banned ? t('user.banned') : t('user.normal')}
                      </span>
                    </Table.Cell>
                    <Table.Cell className="py-3 text-sm text-foreground/60">{formatDate(user.createdAt)}</Table.Cell>
                    <Table.Cell className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {can('system:user:update') && (
                          <Button size="sm" variant="ghost" onPress={() => setEditing(user)}>{t('common.edit')}</Button>
                        )}
                        {can('system:user:assign-role') && (
                          <Button size="sm" variant="ghost" onPress={() => setAssigning(user)}>{t('user.assignRole')}</Button>
                        )}
                        {can('system:user:update') && (
                          <Button size="sm" variant="ghost" onPress={() => setResetting(user)}>{t('user.resetPassword')}</Button>
                        )}
                        {can('system:user:update') && (
                          <Button size="sm" variant="ghost" className={user.banned ? 'text-success' : 'text-warning'} onPress={() => toggleBan(user)}>
                            {user.banned ? t('common.enabled') : t('common.disabled')}
                          </Button>
                        )}
                        {can('system:user:delete') && (
                          <Button size="sm" variant="ghost" className="text-danger" onPress={() => setDeleting(user)}>{t('common.delete')}</Button>
                        )}
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
        {isLoading && <p className="p-6 text-center text-sm text-foreground/60">加载中...</p>}
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

      {/* 新建用户 */}
      {creating && (
        <Modal.Backdrop
          isOpen
          onOpenChange={(open) => {
            if (!open)
              setCreating(false)
          }}
        >
          <Modal.Container size="lg">
            <Modal.Dialog>
              <UserForm
                roleOptions={roleOptions?.rows ?? []}
                isPending={createMutation.isPending}
                error={errMsg(t, createMutation.error)}
                onSubmit={payload => createMutation.mutate(payload)}
                onCancel={() => setCreating(false)}
              />
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}

      {/* 编辑 */}
      {editing && (
        <Modal.Backdrop
          isOpen
          onOpenChange={(open) => {
            if (!open)
              setEditing(null)
          }}
        >
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  updateMutation.mutate({ id: editing.id, name: (formData.get('name') as string) ?? '' })
                }}
              >
                <Modal.Header>
                  <Modal.Heading>{t('user.edit')}</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="flex flex-col gap-4">
                  <TextField name="name" isRequired defaultValue={editing.name}>
                    <Label>{t('user.name')}</Label>
                    <Input variant="secondary" />
                  </TextField>
                  <p className="text-sm text-foreground/60">
                    {t('user.emailOf', { email: editing.email })}
                    {editing.email}
                  </p>
                  {updateMutation.error && <p className="text-sm text-danger">{errMsg(t, updateMutation.error)}</p>}
                </Modal.Body>
                <Modal.Footer className="flex justify-end gap-2">
                  <Button variant="secondary" onPress={() => setEditing(null)}>{t('common.cancel')}</Button>
                  <Button type="submit" isPending={updateMutation.isPending}>{t('common.save')}</Button>
                </Modal.Footer>
              </Form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}

      {/* 重置密码 */}
      {resetting && (
        <Modal.Backdrop
          isOpen
          onOpenChange={(open) => {
            if (!open)
              setResetting(null)
          }}
        >
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  const pw = (formData.get('newPassword') as string) ?? ''
                  updateMutation.mutate({ id: resetting.id, newPassword: pw })
                }}
              >
                <Modal.Header>
                  <Modal.Heading>
                    {t('user.resetPasswordFor', { name: resetting.name })}
                    {resetting.name}
                  </Modal.Heading>
                </Modal.Header>
                <Modal.Body className="flex flex-col gap-4">
                  <TextField name="newPassword" type="password" isRequired validate={value => (!value || value.length < 8 ? t('user.passwordMin') : undefined)}>
                    <Label>{t('user.newPassword')}</Label>
                    <Input variant="secondary" placeholder="至少 8 位" />
                  </TextField>
                  {updateMutation.error && <p className="text-sm text-danger">{errMsg(t, updateMutation.error)}</p>}
                </Modal.Body>
                <Modal.Footer className="flex justify-end gap-2">
                  <Button variant="secondary" onPress={() => setResetting(null)}>{t('common.cancel')}</Button>
                  <Button type="submit" isPending={updateMutation.isPending}>{t('user.resetPassword')}</Button>
                </Modal.Footer>
              </Form>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}

      {/* 分配角色 */}
      {assigning && (
        <Modal.Backdrop
          isOpen
          onOpenChange={(open) => {
            if (!open)
              setAssigning(null)
          }}
        >
          <Modal.Container size="md">
            <Modal.Dialog>
              <RoleAssigner
                user={assigning}
                roleOptions={roleOptions?.rows ?? []}
                isPending={assignMutation.isPending}
                error={errMsg(t, assignMutation.error)}
                onSave={roleIds => assignMutation.mutate({ id: assigning.id, roleIds })}
                onCancel={() => setAssigning(null)}
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
                  {t('common.confirmDeleteText', { name: deleting.email })}
                  {deleting.name}
                  」（
                  {deleting.email}
                  ）吗？此操作不可恢复。
                </p>
                {deleteMutation.error && <p className="text-sm text-danger">{errMsg(t, deleteMutation.error)}</p>}
              </Modal.Body>
              <Modal.Footer className="flex justify-end gap-2">
                <Button variant="secondary" onPress={() => setDeleting(null)}>{t('common.cancel')}</Button>
                <Button variant="danger" isPending={deleteMutation.isPending} onPress={() => deleteMutation.mutate(deleting.id)}>
                  删除
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      )}
    </Card>
  )
}

function UserForm({
  roleOptions,
  isPending,
  error,
  onSubmit,
  onCancel,
}: {
  roleOptions: RoleInfo[]
  isPending: boolean
  error?: string
  onSubmit: (payload: { email: string, password: string, name: string, roleIds: string[] }) => void
  onCancel: () => void
}) {
  const t = useT()
  const [roleIds, setRoleIds] = useState<Set<string>>(() => new Set())

  const toggleRole = (id: string, checked: boolean) => {
    setRoleIds((prev) => {
      const next = new Set(prev)
      if (checked)
        next.add(id)
      else
        next.delete(id)
      return next
    })
  }

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        onSubmit({
          email: (formData.get('email') as string) ?? '',
          password: (formData.get('password') as string) ?? '',
          name: (formData.get('name') as string) ?? '',
          roleIds: [...roleIds],
        })
      }}
    >
      <Modal.Header>
        <Modal.Heading>新增用户</Modal.Heading>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-4">
        <TextField name="email" type="email" isRequired validate={value => (!value || !/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(value) ? t('user.emailInvalid') : undefined)}>
          <Label>{t('user.email')}</Label>
          <Input variant="secondary" placeholder="user@example.com" />
        </TextField>
        <TextField name="name" isRequired>
          <Label>{t('user.name')}</Label>
          <Input variant="secondary" />
        </TextField>
        <TextField name="password" type="password" isRequired validate={value => (!value || value.length < 8 ? t('user.passwordMin') : undefined)}>
          <Label>{t('user.password')}</Label>
          <Input variant="secondary" placeholder="至少 8 位" />
        </TextField>
        <div className="flex flex-col gap-1">
          <Label>{t('user.assignRole')}</Label>
          <div className="flex flex-col gap-2">
            {roleOptions.map(r => (
              <Checkbox key={r.id} isSelected={roleIds.has(r.id)} onChange={checked => toggleRole(r.id, checked)}>
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  {r.name}
                  （
                  {r.code}
                  ）
                </Checkbox.Content>
              </Checkbox>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </Modal.Body>
      <Modal.Footer className="flex justify-end gap-2">
        <Button variant="secondary" onPress={onCancel}>{t('common.cancel')}</Button>
        <Button type="submit" isPending={isPending}>{t('user.create')}</Button>
      </Modal.Footer>
    </Form>
  )
}

function RoleAssigner({
  user,
  roleOptions,
  isPending,
  error,
  onSave,
  onCancel,
}: {
  user: UserRow
  roleOptions: RoleInfo[]
  isPending: boolean
  error?: string
  onSave: (roleIds: string[]) => void
  onCancel: () => void
}) {
  const t = useT()
  const [selected, setSelected] = useState<Set<string>>(() => {
    const codes = new Set(user.roles.map(r => r.code))
    return new Set(roleOptions.filter(r => codes.has(r.code)).map(r => r.id))
  })

  const { data: assigned } = useQuery({
    queryKey: ['user-roles', user.id],
    queryFn: async () => {
      const res = await fetch(`/api/system/users/${user.id}/roles`)
      if (!res.ok)
        throw new Error('加载角色失败')
      return res.json() as Promise<{ roleIds: string[] }>
    },
  })

  const [initialized, setInitialized] = useState(false)
  if (assigned && !initialized) {
    setSelected(new Set(assigned.roleIds))
    setInitialized(true)
  }

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault()
        onSave([...selected])
      }}
    >
      <Modal.Header>
        <Modal.Heading>{t('user.assignRoleTo', { name: user.name })}</Modal.Heading>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-2">
        {roleOptions.map(r => (
          <Checkbox
            key={r.id}
            isSelected={selected.has(r.id)}
            onChange={(checked) => {
              const next = new Set(selected)
              if (checked)
                next.add(r.id)
              else
                next.delete(r.id)
              setSelected(next)
            }}
          >
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              {r.name}
              （
              {r.code}
              ）
            </Checkbox.Content>
          </Checkbox>
        ))}
        {error && <p className="text-sm text-danger">{error}</p>}
      </Modal.Body>
      <Modal.Footer className="flex justify-end gap-2">
        <Button variant="secondary" onPress={onCancel}>{t('common.cancel')}</Button>
        <Button type="submit" isPending={isPending}>{t('common.save')}</Button>
      </Modal.Footer>
    </Form>
  )
}

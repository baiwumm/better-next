'use client'

import type { MenuTreeNode } from '@/server/menu-tree'
import {
  Button,
  Card,
  Form,
  Input,
  Label,
  ListBox,
  Modal,
  Radio,
  RadioGroup,
  Select,
  Switch,
  Table,
  TextField,
} from '@heroui/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, RefreshCw } from 'lucide-react'
import { Fragment, useState } from 'react'
import { errMsg, useT } from '@/store/i18n'

interface MenuFormValues {
  name: string
  type: string
  parentId: string | null
  path: string
  icon: string
  permission: string
  sort: number
  visible: boolean
  status: string
  i18nKey: string
}

export function MenusTable({ permissions }: { permissions: string[] }) {
  const t = useT()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<MenuTreeNode | null>(null)
  const [creating, setCreating] = useState<{ parentId: string | null } | null>(null)
  const [deleting, setDeleting] = useState<MenuTreeNode | null>(null)

  const can = (perm: string) => permissions.includes('*') || permissions.includes(perm)

  const typeLabels: Record<string, string> = {
    dir: t('menu.type.directory'),
    menu: t('menu.type.menu'),
    button: t('menu.type.button'),
  }

  const { data: tree, isLoading } = useQuery({
    queryKey: ['menus', 'tree'],
    queryFn: async () => {
      const res = await fetch('/api/system/menus')
      if (!res.ok)
        throw new Error('加载菜单失败')
      return res.json() as Promise<MenuTreeNode[]>
    },
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['menus', 'tree'] })
    queryClient.invalidateQueries({ queryKey: ['roles'] })
  }

  const saveMutation = useMutation({
    mutationFn: async ({ id, ...payload }: MenuFormValues & { id?: string }) => {
      const res = await fetch(id ? `/api/system/menus/${id}` : '/api/system/menus', {
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
      setEditing(null)
      setCreating(null)
      invalidate()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/system/menus/${id}`, { method: 'DELETE' })
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

  const renderRows = (nodes: MenuTreeNode[], depth = 0) =>
    nodes.map(node => (
      <Fragment key={node.id}>
        <Table.Row id={node.id} className="border-b border-default-100">
          <Table.Cell className="py-3">
            <span className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
              {node.type === 'dir' ? '📁' : node.type === 'button' ? '🔘' : '📄'}
              {node.name}
            </span>
          </Table.Cell>
          <Table.Cell className="py-3">
            <span className={`rounded-full px-2 py-0.5 text-xs ${node.type === 'button' ? 'bg-foreground/5 text-foreground/60' : 'bg-accent/15 text-accent'}`}>
              {typeLabels[node.type]}
            </span>
          </Table.Cell>
          <Table.Cell className="py-3 text-sm text-foreground/70">{node.path ?? '-'}</Table.Cell>
          <Table.Cell className="py-3">
            {node.permission
              ? <code className="text-xs text-foreground/70">{node.permission}</code>
              : <span className="text-foreground/40">-</span>}
          </Table.Cell>
          <Table.Cell className="py-3 text-sm text-foreground/60">{node.sort}</Table.Cell>
          <Table.Cell className="py-3">
            <span className={`rounded-full px-2 py-0.5 text-xs ${node.status === 'active' ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'}`}>
              {node.status === 'active' ? t('common.enabled') : t('common.disabled')}
            </span>
          </Table.Cell>
          <Table.Cell className="py-3">
            <div className="flex flex-wrap gap-1">
              {can('system:menu:create') && (
                <Button size="sm" variant="ghost" onPress={() => setCreating({ parentId: node.id })}>
                  {t('menu.addChild')}
                </Button>
              )}
              {can('system:menu:update') && (
                <Button size="sm" variant="ghost" onPress={() => setEditing(node)}>
                  {t('common.edit')}
                </Button>
              )}
              {can('system:menu:delete') && (
                <Button size="sm" variant="ghost" className="text-danger" onPress={() => setDeleting(node)}>
                  {t('common.delete')}
                </Button>
              )}
            </div>
          </Table.Cell>
        </Table.Row>
        {node.children.length > 0 && renderRows(node.children, depth + 1)}
      </Fragment>
    ))

  return (
    <Card className="gap-0 overflow-hidden">
      {/* 标题栏：左标题 + 右主操作 */}
      <Card.Header className="flex items-center justify-between gap-4 px-5 py-4">
        <Card.Title className="text-base font-semibold">{t('page.menus')}</Card.Title>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            isIconOnly
            aria-label={t('common.refresh')}
            onPress={() => invalidate()}
          >
            <RefreshCw size={14} />
          </Button>
          {can('system:menu:create') && (
            <Button size="sm" onPress={() => setCreating({ parentId: null })}>
              <Plus size={14} />
              {t('menu.create')}
            </Button>
          )}
        </div>
      </Card.Header>
      <Card.Content className="p-0">
        <Table>
          <Table.ScrollContainer>
            <Table.Content aria-label="菜单列表">
              <Table.Header>
                <Table.Column id="name" isRowHeader>{t('menu.name')}</Table.Column>
                <Table.Column id="type">{t('menu.type')}</Table.Column>
                <Table.Column id="path">{t('menu.path')}</Table.Column>
                <Table.Column id="permission">{t('menu.permission')}</Table.Column>
                <Table.Column id="sort">{t('menu.sort')}</Table.Column>
                <Table.Column id="status">{t('common.status')}</Table.Column>
                <Table.Column id="actions">{t('common.actions')}</Table.Column>
              </Table.Header>
              <Table.Body>
                {tree ? renderRows(tree) : null}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
        {isLoading && <p className="p-6 text-center text-sm text-foreground/60">{t('common.loading')}</p>}
        {!isLoading && (!tree || tree.length === 0) && (
          <p className="p-6 text-center text-sm text-foreground/60">{t('common.empty')}</p>
        )}
      </Card.Content>

      {/* 新增 / 编辑 */}
      {(creating || editing) && (
        <Modal.Backdrop
          isOpen
          onOpenChange={(open) => {
            if (!open) {
              setCreating(null)
              setEditing(null)
            }
          }}
        >
          <Modal.Container size="lg">
            <Modal.Dialog>
              <MenuForm
                menu={editing}
                tree={tree ?? []}
                defaultParentId={creating?.parentId ?? null}
                isPending={saveMutation.isPending}
                error={errMsg(t, saveMutation.error)}
                onSubmit={(payload) => {
                  if (editing)
                    saveMutation.mutate({ ...payload, id: editing.id })
                  else
                    saveMutation.mutate(payload)
                }}
                onCancel={() => {
                  setCreating(null)
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
    </Card>
  )
}

function MenuForm({
  menu,
  tree,
  defaultParentId,
  isPending,
  error,
  onSubmit,
  onCancel,
}: {
  menu: MenuTreeNode | null
  tree: MenuTreeNode[]
  defaultParentId: string | null
  isPending: boolean
  error?: string
  onSubmit: (payload: MenuFormValues) => void
  onCancel: () => void
}) {
  const t = useT()
  const [type, setType] = useState(menu?.type ?? 'menu')
  const [parentId, setParentId] = useState<string>(menu?.parentId ?? defaultParentId ?? 'null')
  const [visible, setVisible] = useState(menu?.visible ?? true)
  const [enabled, setEnabled] = useState(menu?.status !== 'disabled')

  // 上级选择（仅 dir/menu 可选）
  const parentOptions = [
    { id: 'null', name: t('menu.root') },
    ...tree.flatMap(n => [
      { id: n.id, name: `📁 ${n.name}` },
      ...(n.type === 'dir' ? n.children.filter(c => c.type !== 'button').map(c => ({ id: c.id, name: `  -> ${c.name}` })) : []),
    ]),
  ]

  return (
    <Form
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        onSubmit({
          name: (formData.get('name') as string) ?? '',
          type,
          parentId: (formData.get('parentId') as string) === 'null' ? null : (formData.get('parentId') as string),
          path: (formData.get('path') as string) ?? '',
          icon: (formData.get('icon') as string) ?? '',
          permission: (formData.get('permission') as string) ?? '',
          sort: Number(formData.get('sort') ?? 0),
          visible,
          status: enabled ? 'active' : 'disabled',
          i18nKey: (formData.get('i18nKey') as string) ?? '',
        })
      }}
    >
      <Modal.Header>
        <Modal.Heading>{menu ? t('menu.edit') : t('menu.create')}</Modal.Heading>
      </Modal.Header>
      <Modal.Body className="flex flex-col gap-4">
        <div className="flex gap-4">
          <TextField
            name="name"
            isRequired
            className="flex-1"
            defaultValue={menu?.name}
            validate={value => (!value ? t('menu.nameRequired') : undefined)}
          >
            <Label>{t('menu.name')}</Label>
            <Input placeholder={t('menu.namePlaceholder')} variant="secondary" />
          </TextField>

          <div className="flex-1">
            <Label>{t('menu.type')}</Label>
            <RadioGroup orientation="horizontal" value={type} aria-label={t('menu.type')} onChange={value => setType(value as 'dir' | 'menu' | 'button')}>
              <Radio value="dir">
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  {t('menu.type.directory')}
                </Radio.Content>
              </Radio>
              <Radio value="menu">
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  {t('menu.type.menu')}
                </Radio.Content>
              </Radio>
              <Radio value="button">
                <Radio.Content>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  {t('menu.type.button')}
                </Radio.Content>
              </Radio>
            </RadioGroup>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <Label>{t('menu.parent')}</Label>
          <Select.Root
            name="parentId"
            selectedKey={parentId}
            onSelectionChange={key => setParentId(String(key ?? 'null'))}
          >
            <Select.Trigger className="w-full">
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover className="w-60">
              <ListBox items={parentOptions} aria-label={t('menu.parent')}>
                {(item: { id: string, name: string }) => (
                  <ListBox.Item id={item.id} textValue={item.name}>
                    {item.name}
                  </ListBox.Item>
                )}
              </ListBox>
            </Select.Popover>
          </Select.Root>
        </div>

        {type !== 'button' && (
          <div className="flex gap-4">
            <TextField name="path" className="flex-1" defaultValue={menu?.path ?? ''}>
              <Label>{t('menu.path')}</Label>
              <Input placeholder={t('menu.pathPlaceholder')} variant="secondary" />
            </TextField>
            <TextField name="icon" className="flex-1" defaultValue={menu?.icon ?? ''}>
              <Label>{t('menu.icon')}</Label>
              <Input placeholder={t('menu.iconPlaceholder')} variant="secondary" />
            </TextField>
          </div>
        )}

        {type === 'button' && (
          <TextField name="permission" defaultValue={menu?.permission ?? ''}>
            <Label>{t('menu.permission')}</Label>
            <Input placeholder={t('menu.permissionPlaceholder')} variant="secondary" />
          </TextField>
        )}

        <div className="flex gap-4">
          <TextField name="sort" className="w-32" defaultValue={String(menu?.sort ?? 0)}>
            <Label>{t('menu.sort')}</Label>
            <Input type="number" variant="secondary" />
          </TextField>
          <TextField name="i18nKey" className="flex-1" defaultValue={menu?.i18nKey ?? ''}>
            <Label>{t('menu.i18nKey')}</Label>
            <Input placeholder={t('menu.i18nKeyPlaceholder')} variant="secondary" />
          </TextField>
        </div>

        <div className="flex gap-6">
          <Switch isSelected={visible} onChange={setVisible}>
            <Switch.Content>
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
              {visible ? t('menu.visible') : t('menu.hidden')}
            </Switch.Content>
          </Switch>
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
  )
}

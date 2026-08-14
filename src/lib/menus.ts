// 菜单数据结构（任务 13 将替换为数据库动态菜单）
export interface MenuItem {
  id: string
  name: string
  path?: string
  icon?: string
  type: 'dir' | 'menu' | 'button'
  permission?: string
  children?: MenuItem[]
}

// 静态种子菜单（与 seed 数据一致，供布局骨架使用）
export const staticMenus: MenuItem[] = [
  {
    id: 'dashboard',
    name: '控制台',
    path: '/',
    icon: 'layout-dashboard',
    type: 'menu',
  },
  {
    id: 'system',
    name: '系统管理',
    icon: 'settings',
    type: 'dir',
    children: [
      { id: 'system-users', name: '用户管理', path: '/system/users', icon: 'users', type: 'menu' },
      { id: 'system-menus', name: '菜单管理', path: '/system/menus', icon: 'menu', type: 'menu' },
      { id: 'system-roles', name: '角色管理', path: '/system/roles', icon: 'shield-check', type: 'menu' },
      { id: 'system-dicts', name: '字典管理', path: '/system/dicts', icon: 'book-open', type: 'menu' },
      { id: 'system-i18n', name: '国际化', path: '/system/i18n', icon: 'languages', type: 'menu' },
      { id: 'system-logs', name: '操作日志', path: '/system/logs', icon: 'file-text', type: 'menu' },
      { id: 'system-login-logs', name: '登录日志', path: '/system/login-logs', icon: 'log-in', type: 'menu' },
    ],
  },
]

import TreeStore, { type TreeStoreItem, type TreeItemId } from '@/TreeStore'

export interface DisplayTreeItem extends TreeStoreItem {
  label: string
}

export interface TreeGridRow extends DisplayTreeItem {
  category: 'Группа' | 'Элемент'
  path: string[]
}

export const encodeTreeItemId = (id: TreeItemId): string =>
  `${typeof id === 'number' ? 'n' : 's'}:${id}`

export const createTreeGridRows = (items: readonly DisplayTreeItem[]): TreeGridRow[] => {
  const store = new TreeStore(items)

  return store.getAll().map((item) => ({
    ...item,
    category: store.getChildren(item.id).length > 0 ? 'Группа' : 'Элемент',
    path: store
      .getAllParents(item.id)
      .reverse()
      .map(({ id }) => encodeTreeItemId(id)),
  }))
}

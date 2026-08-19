import { bench, describe } from 'vitest'

import TreeStore, { type TreeStoreItem } from '../src/TreeStore'

interface BenchmarkItem extends TreeStoreItem {
  label: string
}

const size = 100_000
const groupCount = 1_000
const items: BenchmarkItem[] = Array.from({ length: size }, (_, index) => {
  if (index === 0) {
    return { id: index, parent: null, label: 'Корень' }
  }

  if (index < groupCount) {
    return { id: index, parent: 0, label: `Группа ${index}` }
  }

  return {
    id: index,
    parent: 1 + (index % (groupCount - 1)),
    label: `Элемент ${index}`,
  }
})

const store = new TreeStore(items)

describe(`TreeStore на ${size.toLocaleString('ru-RU')} элементах`, () => {
  bench('getItem: индексированный поиск', () => {
    store.getItem(size - 1)
  })

  bench('getChildren: прямые дети', () => {
    store.getChildren(1)
  })

  bench('getAllParents: путь до корня', () => {
    store.getAllParents(size - 1)
  })

  bench('getAllChildren: всё дерево', () => {
    store.getAllChildren(0)
  })

  bench('updateItem: обновление по индексу', () => {
    const item = store.getItem(size - 1)
    if (item !== undefined) {
      store.updateItem({ ...item, label: `${item.label}.` })
    }
  })
})

describe('структурные операции', () => {
  const subtreeItems = items.slice(0, 10_000)

  bench('removeItem: удаление поддерева и уплотнение массива', () => {
    const temporaryStore = new TreeStore(subtreeItems)
    temporaryStore.removeItem(1)
  })
})

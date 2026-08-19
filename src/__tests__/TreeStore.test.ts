import { describe, expect, it } from 'vitest'

import TreeStore, { type TreeStoreItem } from '@/TreeStore'

interface TestItem extends TreeStoreItem {
  label: string
}

const createItems = (): TestItem[] => [
  { id: 1, parent: null, label: 'Айтем 1' },
  { id: '91064cee', parent: 1, label: 'Айтем 2' },
  { id: 3, parent: 1, label: 'Айтем 3' },
  { id: 4, parent: '91064cee', label: 'Айтем 4' },
  { id: 5, parent: '91064cee', label: 'Айтем 5' },
  { id: 6, parent: '91064cee', label: 'Айтем 6' },
  { id: 7, parent: 4, label: 'Айтем 7' },
  { id: 8, parent: 4, label: 'Айтем 8' },
]

describe('TreeStore: чтение', () => {
  it('возвращает все элементы в исходном порядке', () => {
    const items = createItems()
    const store = new TreeStore(items)

    expect(store.getAll()).toEqual(items)
    expect(store.getAll()).not.toBe(items)
  })

  it('находит элемент за константное время по индексу', () => {
    const store = new TreeStore(createItems())

    expect(store.getItem('91064cee')).toEqual({
      id: '91064cee',
      parent: 1,
      label: 'Айтем 2',
    })
    expect(store.getItem('missing')).toBeUndefined()
  })

  it('возвращает только прямых детей с сохранением порядка', () => {
    const store = new TreeStore(createItems())

    expect(store.getChildren('91064cee').map(({ id }) => id)).toEqual([4, 5, 6])
    expect(store.getChildren(7)).toEqual([])
    expect(store.getChildren('missing')).toEqual([])
  })

  it('возвращает потомков в глубинном pre-order порядке', () => {
    const store = new TreeStore(createItems())

    expect(store.getAllChildren(1).map(({ id }) => id)).toEqual(['91064cee', 4, 7, 8, 5, 6, 3])
    expect(store.getAllChildren(8)).toEqual([])
    expect(store.getAllChildren('missing')).toEqual([])
  })

  it('возвращает путь от элемента до корня в требуемом порядке', () => {
    const store = new TreeStore(createItems())

    expect(store.getAllParents(7).map(({ id }) => id)).toEqual([7, 4, '91064cee', 1])
    expect(store.getAllParents('missing')).toEqual([])
  })

  it('различает строковые и числовые идентификаторы', () => {
    const store = new TreeStore<TestItem>([
      { id: 1, parent: null, label: 'Число' },
      { id: '1', parent: null, label: 'Строка' },
      { id: 2, parent: '1', label: 'Ребёнок строки' },
    ])

    expect(store.getItem(1)?.label).toBe('Число')
    expect(store.getItem('1')?.label).toBe('Строка')
    expect(store.getChildren('1').map(({ id }) => id)).toEqual([2])
    expect(store.getChildren(1)).toEqual([])
  })
})

describe('TreeStore: изменения', () => {
  it('добавляет корневые и дочерние элементы', () => {
    const store = new TreeStore(createItems())
    const child: TestItem = { id: 9, parent: 4, label: 'Айтем 9' }
    const root: TestItem = { id: 'root-2', parent: null, label: 'Корень 2' }

    store.addItem(child)
    store.addItem(root)

    expect(store.getItem(9)).toBe(child)
    expect(store.getChildren(4).map(({ id }) => id)).toEqual([7, 8, 9])
    expect(store.getAll().at(-1)).toBe(root)
  })

  it('отклоняет дублирующийся id и отсутствующего родителя', () => {
    const store = new TreeStore(createItems())

    expect(() => store.addItem({ id: 1, parent: null, label: 'Дубль' })).toThrow('уже существует')
    expect(() => store.addItem({ id: 10, parent: 999, label: 'Сирота' })).toThrow('не найден')
  })

  it('обновляет поля без изменения позиции', () => {
    const store = new TreeStore(createItems())
    const updated: TestItem = { id: 5, parent: '91064cee', label: 'Обновлённый айтем' }

    store.updateItem(updated)

    expect(store.getItem(5)).toBe(updated)
    expect(store.getAll().map(({ id }) => id)).toEqual([1, '91064cee', 3, 4, 5, 6, 7, 8])
    expect(store.getChildren('91064cee').at(1)).toBe(updated)
  })

  it('перемещает элемент в конец списка детей нового родителя', () => {
    const store = new TreeStore(createItems())

    store.updateItem({ id: 5, parent: 4, label: 'Айтем 5' })

    expect(store.getChildren('91064cee').map(({ id }) => id)).toEqual([4, 6])
    expect(store.getChildren(4).map(({ id }) => id)).toEqual([7, 8, 5])
    expect(store.getAllParents(5).map(({ id }) => id)).toEqual([5, 4, '91064cee', 1])
  })

  it('не допускает отсутствующий элемент, родителя и циклическую связь', () => {
    const store = new TreeStore(createItems())

    expect(() => store.updateItem({ id: 99, parent: null, label: 'Нет' })).toThrow('не найден')
    expect(() => store.updateItem({ id: 5, parent: 99, label: 'Нет родителя' })).toThrow(
      'не найден',
    )
    expect(() => store.updateItem({ id: 1, parent: 7, label: 'Цикл' })).toThrow('цикл')
  })

  it('удаляет элемент вместе со всем поддеревом', () => {
    const store = new TreeStore(createItems())

    store.removeItem('91064cee')

    expect(store.getAll().map(({ id }) => id)).toEqual([1, 3])
    expect(store.getChildren(1).map(({ id }) => id)).toEqual([3])
    expect(store.getItem(7)).toBeUndefined()

    store.removeItem('missing')
    expect(store.getAll().map(({ id }) => id)).toEqual([1, 3])
  })
})

describe('TreeStore: целостность и глубина', () => {
  it('отклоняет дубликаты, отсутствующих родителей и циклы конструктора', () => {
    expect(
      () =>
        new TreeStore<TestItem>([
          { id: 1, parent: null, label: 'Один' },
          { id: 1, parent: null, label: 'Дубль' },
        ]),
    ).toThrow('уже существует')

    expect(() => new TreeStore<TestItem>([{ id: 1, parent: 2, label: 'Сирота' }])).toThrow(
      'не найден',
    )

    expect(
      () =>
        new TreeStore<TestItem>([
          { id: 1, parent: 2, label: 'Один' },
          { id: 2, parent: 1, label: 'Два' },
        ]),
    ).toThrow('цикл')
  })

  it('обходит очень глубокое дерево без рекурсии', () => {
    const depth = 10_000
    const items: TestItem[] = Array.from({ length: depth }, (_, index) => ({
      id: index,
      parent: index === 0 ? null : index - 1,
      label: `Узел ${index}`,
    }))
    const store = new TreeStore(items)

    expect(store.getAllChildren(0)).toHaveLength(depth - 1)
    expect(store.getAllParents(depth - 1)).toHaveLength(depth)
  })
})

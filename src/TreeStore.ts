export type TreeItemId = string | number

export interface TreeStoreItem {
  id: TreeItemId
  parent: TreeItemId | null
  [key: string]: unknown
}

type ParentId = TreeItemId | null

/**
 * Индексированное хранилище элементов дерева.
 *
 * Порядок элементов и порядок соседей совпадает с порядком их добавления.
 * Возвращаемые массивы принадлежат хранилищу и не должны изменяться снаружи.
 */
export class TreeStore<T extends TreeStoreItem> {
  private items: T[]
  private readonly itemsById = new Map<TreeItemId, T>()
  private readonly itemPositions = new Map<TreeItemId, number>()
  private readonly childrenByParent = new Map<ParentId, T[]>()
  private readonly childPositions = new Map<TreeItemId, number>()

  public constructor(items: readonly T[]) {
    this.items = [...items]

    for (let index = 0; index < this.items.length; index += 1) {
      const item = this.items[index]

      if (item === undefined) {
        continue
      }

      if (this.itemsById.has(item.id)) {
        throw new Error(`Элемент с id "${String(item.id)}" уже существует`)
      }

      this.itemsById.set(item.id, item)
      this.itemPositions.set(item.id, index)
      this.appendChild(item)
    }

    this.assertValidTree()
  }

  public getAll(): T[] {
    return this.items
  }

  public getItem(id: TreeItemId): T | undefined {
    return this.itemsById.get(id)
  }

  public getChildren(id: TreeItemId): T[] {
    if (!this.itemsById.has(id)) {
      return []
    }

    return this.childrenByParent.get(id) ?? []
  }

  public getAllChildren(id: TreeItemId): T[] {
    if (!this.itemsById.has(id)) {
      return []
    }

    const firstLevel = this.childrenByParent.get(id)

    if (firstLevel === undefined || firstLevel.length === 0) {
      return []
    }

    const descendants: T[] = []
    const visited = new Set<TreeItemId>([id])
    const stack: Array<{ children: T[]; index: number }> = [{ children: firstLevel, index: 0 }]

    while (stack.length > 0) {
      const frame = stack[stack.length - 1]

      if (frame === undefined) {
        break
      }

      if (frame.index >= frame.children.length) {
        stack.pop()
        continue
      }

      const child = frame.children[frame.index]
      frame.index += 1

      if (child === undefined) {
        continue
      }

      if (visited.has(child.id)) {
        throw new Error(`Обнаружен цикл с участием элемента "${String(child.id)}"`)
      }

      visited.add(child.id)
      descendants.push(child)

      const children = this.childrenByParent.get(child.id)
      if (children !== undefined && children.length > 0) {
        stack.push({ children, index: 0 })
      }
    }

    return descendants
  }

  public getAllParents(id: TreeItemId): T[] {
    const parents: T[] = []
    const visited = new Set<TreeItemId>()
    let current = this.itemsById.get(id)

    while (current !== undefined) {
      if (visited.has(current.id)) {
        throw new Error(`Обнаружен цикл с участием элемента "${String(current.id)}"`)
      }

      visited.add(current.id)
      parents.push(current)

      if (current.parent === null) {
        break
      }

      current = this.itemsById.get(current.parent)
    }

    return parents
  }

  public addItem(item: T): void {
    if (this.itemsById.has(item.id)) {
      throw new Error(`Элемент с id "${String(item.id)}" уже существует`)
    }

    this.assertParentExists(item.parent)

    if (item.parent === item.id) {
      throw new Error(`Элемент "${String(item.id)}" не может быть родителем самому себе`)
    }

    this.itemPositions.set(item.id, this.items.length)
    this.items.push(item)
    this.itemsById.set(item.id, item)
    this.appendChild(item)
  }

  public removeItem(id: TreeItemId): void {
    const item = this.itemsById.get(id)

    if (item === undefined) {
      return
    }

    const removedIds = new Set<TreeItemId>([id])
    const stack = [id]

    while (stack.length > 0) {
      const currentId = stack.pop()
      if (currentId === undefined) {
        continue
      }

      const children = this.childrenByParent.get(currentId)
      if (children === undefined) {
        continue
      }

      for (const child of children) {
        if (!removedIds.has(child.id)) {
          removedIds.add(child.id)
          stack.push(child.id)
        }
      }
    }

    this.removeChild(item.parent, id)

    for (const removedId of removedIds) {
      this.itemsById.delete(removedId)
      this.itemPositions.delete(removedId)
      this.childPositions.delete(removedId)
      this.childrenByParent.delete(removedId)
    }

    this.items = this.items.filter((currentItem) => !removedIds.has(currentItem.id))
    this.reindexItems()
  }

  public updateItem(item: T): void {
    const previousItem = this.itemsById.get(item.id)

    if (previousItem === undefined) {
      throw new Error(`Элемент с id "${String(item.id)}" не найден`)
    }

    this.assertParentExists(item.parent)

    if (this.wouldCreateCycle(item.id, item.parent)) {
      throw new Error(`Изменение родителя создаёт цикл для элемента "${String(item.id)}"`)
    }

    const itemPosition = this.itemPositions.get(item.id)
    if (itemPosition === undefined) {
      throw new Error(`Не удалось определить позицию элемента "${String(item.id)}"`)
    }

    this.items[itemPosition] = item
    this.itemsById.set(item.id, item)

    if (previousItem.parent !== item.parent) {
      this.removeChild(previousItem.parent, item.id)
      this.appendChild(item)
      return
    }

    const siblingPosition = this.childPositions.get(item.id)
    const siblings = this.childrenByParent.get(item.parent)

    if (siblingPosition === undefined || siblings === undefined) {
      throw new Error(`Не удалось обновить индекс элемента "${String(item.id)}"`)
    }

    siblings[siblingPosition] = item
  }

  private appendChild(item: T): void {
    let siblings = this.childrenByParent.get(item.parent)

    if (siblings === undefined) {
      siblings = []
      this.childrenByParent.set(item.parent, siblings)
    }

    this.childPositions.set(item.id, siblings.length)
    siblings.push(item)
  }

  private removeChild(parentId: ParentId, childId: TreeItemId): void {
    const siblings = this.childrenByParent.get(parentId)
    const position = this.childPositions.get(childId)

    if (siblings === undefined || position === undefined) {
      return
    }

    siblings.splice(position, 1)
    this.childPositions.delete(childId)

    for (let index = position; index < siblings.length; index += 1) {
      const sibling = siblings[index]
      if (sibling !== undefined) {
        this.childPositions.set(sibling.id, index)
      }
    }

    if (siblings.length === 0) {
      this.childrenByParent.delete(parentId)
    }
  }

  private reindexItems(): void {
    this.itemPositions.clear()

    for (let index = 0; index < this.items.length; index += 1) {
      const item = this.items[index]
      if (item !== undefined) {
        this.itemPositions.set(item.id, index)
      }
    }
  }

  private assertParentExists(parentId: ParentId): void {
    if (parentId !== null && !this.itemsById.has(parentId)) {
      throw new Error(`Родитель с id "${String(parentId)}" не найден`)
    }
  }

  private wouldCreateCycle(itemId: TreeItemId, parentId: ParentId): boolean {
    let currentId = parentId

    while (currentId !== null) {
      if (currentId === itemId) {
        return true
      }

      const current = this.itemsById.get(currentId)
      if (current === undefined) {
        return false
      }

      currentId = current.parent
    }

    return false
  }

  private assertValidTree(): void {
    for (const item of this.items) {
      this.assertParentExists(item.parent)
    }

    const completed = new Set<TreeItemId>()
    const currentPath = new Set<TreeItemId>()

    for (const item of this.items) {
      if (completed.has(item.id)) {
        continue
      }

      const path: TreeItemId[] = []
      let current: T | undefined = item

      while (current !== undefined && !completed.has(current.id)) {
        if (currentPath.has(current.id)) {
          throw new Error(`Обнаружен цикл с участием элемента "${String(current.id)}"`)
        }

        currentPath.add(current.id)
        path.push(current.id)

        if (current.parent === null) {
          break
        }

        current = this.itemsById.get(current.parent)
      }

      for (const pathId of path) {
        currentPath.delete(pathId)
        completed.add(pathId)
      }
    }
  }
}

export default TreeStore

import { defineComponent, nextTick } from 'vue'

import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import TreeTable from '@/components/TreeTable.vue'
import { items } from '@/data/items'
import { createTreeGridRows, encodeTreeItemId, type TreeGridRow } from '@/treeTableModel'

const AgGridStub = defineComponent({
  name: 'AgGridVue',
  inheritAttrs: false,
  props: {
    theme: { type: Object, required: true },
    rowData: { type: Array, required: true },
    columnDefs: { type: Array, required: true },
    defaultColDef: { type: Object, required: true },
    gridOptions: { type: Object, required: true },
  },
  emits: ['rowGroupOpened'],
  template: '<div data-testid="ag-grid" />',
})

const mountTable = () =>
  mount(TreeTable, {
    props: { items },
    global: {
      stubs: { AgGridVue: AgGridStub },
    },
  })

describe('модель древовидной таблицы', () => {
  it('строит уникальные типизированные пути и категории', () => {
    const rows = createTreeGridRows(items)

    expect(rows.map(({ id }) => id)).toEqual([1, '91064cee', 3, 4, 5, 6, 7, 8])
    expect(rows.find(({ id }) => id === 1)).toMatchObject({
      category: 'Группа',
      path: ['n:1'],
    })
    expect(rows.find(({ id }) => id === 7)).toMatchObject({
      category: 'Элемент',
      path: ['n:1', 's:91064cee', 'n:4', 'n:7'],
    })
    expect(encodeTreeItemId(1)).not.toBe(encodeTreeItemId('1'))
  })
})

describe('TreeTable', () => {
  it('передаёт в AG Grid три колонки в порядке из макета', () => {
    const wrapper = mountTable()
    const grid = wrapper.getComponent(AgGridStub)
    const columnDefs = grid.props('columnDefs') as Array<{
      headerName?: string
      valueGetter?: (params: { node: { rowIndex: number | null } }) => number | string
      cellClass?: (params: { data?: TreeGridRow }) => string
    }>
    const rows = createTreeGridRows(items)
    const groupRow = rows[0] as TreeGridRow
    const leafRow = rows[2] as TreeGridRow

    expect(columnDefs.map(({ headerName }) => headerName)).toEqual([
      '№ п/п',
      'Категория',
      'Наименование',
    ])
    expect(columnDefs[0]?.valueGetter?.({ node: { rowIndex: 4 } })).toBe(5)
    expect(columnDefs[0]?.valueGetter?.({ node: { rowIndex: null } })).toBe('')
    expect(columnDefs[1]?.cellClass?.({ data: groupRow })).toContain('category-cell--group')
    expect(columnDefs[1]?.cellClass?.({ data: leafRow })).toBe('category-cell')
    expect(columnDefs[2]?.cellClass?.({ data: groupRow })).toContain('label-cell--group')
    expect(columnDefs[2]?.cellClass?.({ data: leafRow })).toBe('label-cell')
  })

  it('включает Tree Data и раскрывает все группы', () => {
    const wrapper = mountTable()
    const grid = wrapper.getComponent(AgGridStub)
    const gridOptions = grid.props('gridOptions') as {
      treeData?: boolean
      treeDataDisplayType?: string
      groupDefaultExpanded?: number
      getDataPath?: (row: TreeGridRow) => string[]
      getRowId?: (params: { data: TreeGridRow }) => string
    }
    const firstRow = createTreeGridRows(items)[0]

    expect(gridOptions).toMatchObject({
      treeData: true,
      treeDataDisplayType: 'custom',
      groupDefaultExpanded: -1,
    })
    expect(firstRow).toBeDefined()
    expect(gridOptions.getDataPath?.(firstRow as TreeGridRow)).toEqual(['n:1'])
    expect(gridOptions.getRowId?.({ data: firstRow as TreeGridRow })).toBe('n:1')
  })

  it('передаёт строки в порядке исходного массива и обновляет нумерацию при раскрытии', async () => {
    const wrapper = mountTable()
    const grid = wrapper.getComponent(AgGridStub)
    const rowData = grid.props('rowData') as TreeGridRow[]
    const refreshCells = vi.fn()

    expect(rowData.map(({ id }) => id)).toEqual([1, '91064cee', 3, 4, 5, 6, 7, 8])

    grid.vm.$emit('rowGroupOpened', { api: { refreshCells } })
    await nextTick()

    expect(refreshCells).toHaveBeenCalledWith({ columns: ['rowNumber'], force: true })
  })
})

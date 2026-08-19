<script setup lang="ts">
import { computed } from 'vue'

import { AgGridVue } from 'ag-grid-vue3'
import {
  CellStyleModule,
  ClientSideRowModelModule,
  ModuleRegistry,
  RenderApiModule,
  enableDevValidations,
  themeQuartz,
  type ColDef,
  type GridOptions,
  type RowGroupOpenedEvent,
} from 'ag-grid-community'
import { TreeDataModule } from 'ag-grid-enterprise'

import {
  createTreeGridRows,
  encodeTreeItemId,
  type DisplayTreeItem,
  type TreeGridRow,
} from '@/treeTableModel'

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  CellStyleModule,
  RenderApiModule,
  TreeDataModule,
])

if (import.meta.env.DEV) {
  enableDevValidations()
}

const props = defineProps<{
  items: readonly DisplayTreeItem[]
}>()

const rowData = computed(() => createTreeGridRows(props.items))

const gridTheme = themeQuartz.withParams({
  accentColor: '#4f5d75',
  backgroundColor: '#ffffff',
  borderColor: '#d1d1d1',
  borderRadius: 0,
  cellHorizontalPadding: 22,
  cellTextColor: '#4a4a4a',
  fontFamily: ['Inter', 'Segoe UI', 'Arial', 'sans-serif'],
  fontSize: 15,
  foregroundColor: '#4a4a4a',
  headerBackgroundColor: '#f7f7f7',
  headerColumnBorder: { color: '#c9c9c9', style: 'solid', width: 1 },
  headerFontSize: 14,
  headerFontWeight: 600,
  headerHeight: 60,
  headerRowBorder: { color: '#c9c9c9', style: 'solid', width: 1 },
  headerTextColor: '#555555',
  iconColor: '#4f555b',
  iconSize: 18,
  rowBorder: { color: '#d1d1d1', style: 'solid', width: 1 },
  rowHeight: 58,
  spacing: 8,
  wrapperBorder: { color: '#d1d1d1', style: 'solid', width: 1 },
  wrapperBorderRadius: 0,
})

const columnDefs: ColDef<TreeGridRow>[] = [
  {
    colId: 'rowNumber',
    headerName: '№ п/п',
    width: 92,
    minWidth: 92,
    maxWidth: 92,
    lockPosition: true,
    suppressMovable: true,
    sortable: false,
    resizable: false,
    valueGetter: ({ node }) => (node?.rowIndex === null ? '' : (node?.rowIndex ?? -1) + 1),
    cellClass: 'row-number-cell',
    headerClass: 'row-number-header',
  },
  {
    colId: 'category',
    headerName: 'Категория',
    field: 'category',
    minWidth: 280,
    flex: 1,
    showRowGroup: true,
    cellRenderer: 'agGroupCellRenderer',
    cellRendererParams: {
      suppressCount: true,
    },
    cellClass: ({ data }) =>
      data?.category === 'Группа' ? 'category-cell category-cell--group' : 'category-cell',
  },
  {
    colId: 'label',
    headerName: 'Наименование',
    field: 'label',
    minWidth: 300,
    flex: 1.8,
    cellClass: ({ data }) =>
      data?.category === 'Группа' ? 'label-cell label-cell--group' : 'label-cell',
  },
]

const defaultColDef: ColDef<TreeGridRow> = {
  sortable: false,
  resizable: false,
  suppressMovable: true,
}

const gridOptions: GridOptions<TreeGridRow> = {
  treeData: true,
  treeDataDisplayType: 'custom',
  groupDefaultExpanded: -1,
  getDataPath: ({ path }) => path,
  getRowId: ({ data }) => encodeTreeItemId(data.id),
  suppressCellFocus: false,
  suppressColumnVirtualisation: true,
  suppressGroupRowsSticky: true,
  ensureDomOrder: true,
  animateRows: false,
}

const refreshRowNumbers = ({ api }: RowGroupOpenedEvent<TreeGridRow>): void => {
  api.refreshCells({ columns: ['rowNumber'], force: true })
}
</script>

<template>
  <section class="tree-table" aria-label="Древовидное хранилище">
    <AgGridVue
      class="tree-table__grid"
      aria-label="Элементы TreeStore"
      :theme="gridTheme"
      :row-data="rowData"
      :column-defs="columnDefs"
      :default-col-def="defaultColDef"
      :grid-options="gridOptions"
      @row-group-opened="refreshRowNumbers"
    />
  </section>
</template>

<style scoped>
.tree-table {
  width: 100%;
  min-width: 0;
  overflow-x: auto;
  background: #efefef;
  padding: 24px 16px;
}

.tree-table__grid {
  width: 100%;
  min-width: 672px;
  height: 526px;
}

.tree-table__grid :deep(.ag-root-wrapper) {
  border-left: 0;
  border-right: 0;
}

.tree-table__grid :deep(.ag-header-cell-label) {
  line-height: 1.2;
}

.tree-table__grid :deep(.row-number-header .ag-header-cell-label),
.tree-table__grid :deep(.row-number-cell) {
  justify-content: center;
  text-align: center;
}

.tree-table__grid :deep(.row-number-cell),
.tree-table__grid :deep(.category-cell--group),
.tree-table__grid :deep(.label-cell--group) {
  font-weight: 600;
}

.tree-table__grid :deep(.ag-group-expanded),
.tree-table__grid :deep(.ag-group-contracted) {
  margin-right: 12px;
}

.tree-table__grid :deep(.ag-cell-focus:not(.ag-cell-range-selected)) {
  outline: 2px solid #476582;
  outline-offset: -2px;
}

@media (max-width: 720px) {
  .tree-table {
    padding: 12px 0;
  }
}
</style>

import { PhotoLayoutPreset } from '../types/bulletin';

export interface PhotoPresetDef {
  id: PhotoLayoutPreset;
  labelZh: string;
  labelEn: string;
  descriptionZh: string;
  descriptionEn: string;
  rows: number[]; // row counts, e.g. [3, 3] or [4, 2]
  isRecommended?: boolean;
}

export function getPresetsForCount(count: number): PhotoPresetDef[] {
  switch (count) {
    case 1:
      return [
        {
          id: '1_col',
          labelZh: '单图通栏',
          labelEn: 'Full Width',
          descriptionZh: '单张图片撑满画板宽度',
          descriptionEn: 'Single image spans full canvas width',
          rows: [1],
          isRecommended: true,
        },
      ];

    case 2:
      return [
        {
          id: '2_cols',
          labelZh: '双图并排',
          labelEn: '2 Side-by-Side',
          descriptionZh: '两图左右各占50%等宽',
          descriptionEn: '2 equal columns side by side',
          rows: [2],
          isRecommended: true,
        },
        {
          id: '1_col',
          labelZh: '上下叠放',
          labelEn: 'Stacked (1+1)',
          descriptionZh: '两图上下单列垂直排列',
          descriptionEn: 'Vertical single column stack',
          rows: [1, 1],
        },
      ];

    case 3:
      return [
        {
          id: '3_cols',
          labelZh: '三图并排',
          labelEn: '3 Columns',
          descriptionZh: '一行三张等宽图片',
          descriptionEn: 'Single row of 3 equal columns',
          rows: [3],
          isRecommended: true,
        },
        {
          id: '2_plus_1',
          labelZh: '2 + 1 底部通栏',
          labelEn: '2 Top + 1 Bottom',
          descriptionZh: '上方两图，下方主图撑满边距',
          descriptionEn: '2 on top, 1 hero spans full width',
          rows: [2, 1],
        },
        {
          id: '1_plus_2',
          labelZh: '1 + 2 顶部主图',
          labelEn: '1 Top + 2 Bottom',
          descriptionZh: '上方主图通栏，下方两图并排',
          descriptionEn: '1 hero on top, 2 on bottom',
          rows: [1, 2],
        },
        {
          id: 'stacked',
          labelZh: '三图单列叠放',
          labelEn: '3 Stacked',
          descriptionZh: '垂直三图依序排列',
          descriptionEn: 'Vertical stack of 3 images',
          rows: [1, 1, 1],
        },
      ];

    case 4:
      return [
        {
          id: '2x2',
          labelZh: '2 × 2 均衡矩阵',
          labelEn: '2x2 Balanced Matrix',
          descriptionZh: '四图对称等宽田字方阵',
          descriptionEn: '4 balanced equal tiles in 2 rows',
          rows: [2, 2],
          isRecommended: true,
        },
        {
          id: '3_plus_1',
          labelZh: '3 + 1 底部通栏',
          labelEn: '3 Top + 1 Bottom Fit',
          descriptionZh: '上方三图，末图撑满边距',
          descriptionEn: '3 on top, 4th spans full margin',
          rows: [3, 1],
        },
        {
          id: '1_plus_3',
          labelZh: '1 + 3 顶部主图',
          labelEn: '1 Top + 3 Bottom',
          descriptionZh: '上方主图通栏，下方三图并排',
          descriptionEn: '1 hero on top, 3 side-by-side below',
          rows: [1, 3],
        },
        {
          id: '4_cols',
          labelZh: '四图单行横排',
          labelEn: '4 in a Row',
          descriptionZh: '单行四列紧凑并排',
          descriptionEn: '4 columns in a single row',
          rows: [4],
        },
      ];

    case 5:
      return [
        {
          id: '3_plus_2',
          labelZh: '3 + 2 均衡矩阵',
          labelEn: '3 Top + 2 Bottom',
          descriptionZh: '前三图并排，后两图自动撑满边距',
          descriptionEn: '3 on top, 2 on bottom fitting margins',
          rows: [3, 2],
          isRecommended: true,
        },
        {
          id: '2_plus_3',
          labelZh: '2 + 3 稳重排布',
          labelEn: '2 Top + 3 Bottom',
          descriptionZh: '上方两图大气，下方三图细节',
          descriptionEn: '2 large on top, 3 below fitting margins',
          rows: [2, 3],
        },
        {
          id: '4_plus_1',
          labelZh: '4 + 1 底部通栏',
          labelEn: '4 Top + 1 Bottom Fit',
          descriptionZh: '上方四图横排，末图撑满通栏',
          descriptionEn: '4 in a row, last spans full margin',
          rows: [4, 1],
        },
        {
          id: '1_plus_4',
          labelZh: '1 + 4 顶部焦点',
          labelEn: '1 Hero + 4 Bottom',
          descriptionZh: '上方大图焦点，下方四图紧凑',
          descriptionEn: '1 hero on top, 4 compact below',
          rows: [1, 4],
        },
      ];

    case 6:
      return [
        {
          id: '3x2',
          labelZh: '3 × 2 对称矩阵',
          labelEn: '3x2 Balanced Matrix',
          descriptionZh: '两行各三图，完美对称无缝通栏',
          descriptionEn: '2 rows of 3 equal photos, perfectly balanced',
          rows: [3, 3],
          isRecommended: true,
        },
        {
          id: '4_plus_2',
          labelZh: '4 + 2 宽版排布',
          labelEn: '4 Top + 2 Bottom Fit',
          descriptionZh: '上方四图并排，下方两图自动撑满两端边距',
          descriptionEn: '4 on top, 2 on bottom stretched to margins',
          rows: [4, 2],
        },
        {
          id: '2_plus_4',
          labelZh: '2 + 4 展厅排布',
          labelEn: '2 Top + 4 Bottom',
          descriptionZh: '上方两张大图，下方四张小图并排',
          descriptionEn: '2 large photos on top, 4 below',
          rows: [2, 4],
        },
        {
          id: '2x3',
          labelZh: '2 × 3 双列六图',
          labelEn: '2x3 Dual Columns',
          descriptionZh: '三行每行两图，竖向展开',
          descriptionEn: '3 rows of 2 photos each',
          rows: [2, 2, 2],
        },
      ];

    case 7:
      return [
        {
          id: '4_plus_3',
          labelZh: '4 + 3 自适应双行',
          labelEn: '4 Top + 3 Bottom Fit',
          descriptionZh: '上行四图，下行三图撑满整栏宽度',
          descriptionEn: '4 on top, 3 on bottom fitting full width',
          rows: [4, 3],
          isRecommended: true,
        },
        {
          id: '3_plus_4',
          labelZh: '3 + 4 逆向排布',
          labelEn: '3 Top + 4 Bottom',
          descriptionZh: '上行三图，下行四图均衡满格',
          descriptionEn: '3 on top, 4 on bottom fitting full width',
          rows: [3, 4],
        },
      ];

    case 8:
      return [
        {
          id: '4x2',
          labelZh: '4 × 2 八图矩阵',
          labelEn: '4x2 Balanced Matrix',
          descriptionZh: '两行每行四图，规整满栏方阵',
          descriptionEn: '2 rows of 4 photos each, perfectly filled',
          rows: [4, 4],
          isRecommended: true,
        },
        {
          id: '3_plus_3_plus_2',
          labelZh: '3 + 3 + 2 阶梯排布',
          labelEn: '3 + 3 + 2 Staircase',
          descriptionZh: '前两行各三图，末行两图撑满边距',
          descriptionEn: 'Two rows of 3, bottom row of 2 stretched',
          rows: [3, 3, 2],
        },
      ];

    case 9:
      return [
        {
          id: '3x3',
          labelZh: '3 × 3 九宫格矩阵',
          labelEn: '3x3 Grid Matrix',
          descriptionZh: '经典九宫格三行三列矩阵',
          descriptionEn: 'Classic 3x3 matrix, 3 equal rows of 3',
          rows: [3, 3, 3],
          isRecommended: true,
        },
      ];

    default: {
      if (count <= 0) return [];
      // Dynamic fallback for >= 10 photos
      const cols = count >= 12 ? 4 : 3;
      const fullRows = Math.floor(count / cols);
      const remainder = count % cols;
      const dynamicRows: number[] = Array(fullRows).fill(cols);
      if (remainder > 0) dynamicRows.push(remainder);

      return [
        {
          id: 'auto',
          labelZh: `${cols} 列自适应通栏`,
          labelEn: `${cols}-Col Fit Margins`,
          descriptionZh: `自动按 ${cols} 列排列，末行自适应撑满两端边距`,
          descriptionEn: `Organized in ${cols} columns, last row fits full width`,
          rows: dynamicRows,
          isRecommended: true,
        },
      ];
    }
  }
}

/**
 * Resolves picture indices partitioned into balanced rows.
 * Each inner array contains the photo indices for that row.
 */
export function resolveLayoutRows(
  count: number,
  preset: PhotoLayoutPreset = 'auto',
  gridColumns: number = 3,
  fitLastToMargin = true
): number[][] {
  if (count <= 0) return [];
  if (count === 1) return [[0]];

  // 1. Try explicit preset match from presets
  const available = getPresetsForCount(count);
  if (preset && preset !== 'auto') {
    const matched = available.find((p) => p.id === preset);
    if (matched) {
      return partitionByRowCounts(matched.rows);
    }
  }

  // 2. Preset is 'auto' or not found -> Calculate best balanced partition based on count and gridColumns
  switch (count) {
    case 2:
      return gridColumns === 1 ? [[0], [1]] : [[0, 1]];

    case 3:
      if (preset === '2_plus_1' || gridColumns === 2) return [[0, 1], [2]];
      if (preset === '1_plus_2') return [[0], [1, 2]];
      if (gridColumns === 1 || preset === 'stacked') return [[0], [1], [2]];
      return [[0, 1, 2]];

    case 4:
      if (preset === '2x2' || gridColumns === 2) return [[0, 1], [2, 3]];
      if (preset === '1_plus_3') return [[0], [1, 2, 3]];
      if (preset === '4_cols' || gridColumns === 4) return [[0, 1, 2, 3]];
      // Default for 4 photos is 3+1 (fits margin) or 2x2
      return fitLastToMargin ? [[0, 1, 2], [3]] : [[0, 1], [2, 3]];

    case 5:
      if (preset === '2_plus_3') return [[0, 1], [2, 3, 4]];
      if (preset === '4_plus_1') return [[0, 1, 2, 3], [4]];
      if (preset === '1_plus_4') return [[0], [1, 2, 3, 4]];
      return [[0, 1, 2], [3, 4]]; // 3+2 default

    case 6:
      // If user selected 4 cols, make 4+2 so the bottom 2 photos stretch to margin!
      if (preset === '4_plus_2' || gridColumns === 4) return [[0, 1, 2, 3], [4, 5]];
      if (preset === '2_plus_4') return [[0, 1], [2, 3, 4, 5]];
      if (preset === '2x3' || gridColumns === 2) return [[0, 1], [2, 3], [4, 5]];
      return [[0, 1, 2], [3, 4, 5]]; // 3x2 default

    case 7:
      if (preset === '3_plus_4') return [[0, 1, 2], [3, 4, 5, 6]];
      return [[0, 1, 2, 3], [4, 5, 6]]; // 4+3 default

    case 8:
      if (preset === '3_plus_3_plus_2') return [[0, 1, 2], [3, 4, 5], [6, 7]];
      return [[0, 1, 2, 3], [4, 5, 6, 7]]; // 4x2 default

    case 9:
      return [[0, 1, 2], [3, 4, 5], [6, 7, 8]]; // 3x3 default

    default: {
      // 10 or more photos
      const cols = gridColumns || (count >= 12 ? 4 : 3);
      const rows: number[][] = [];
      let currentIdx = 0;
      while (currentIdx < count) {
        const remaining = count - currentIdx;
        const take = Math.min(cols, remaining);
        const rowIndices: number[] = [];
        for (let i = 0; i < take; i++) {
          rowIndices.push(currentIdx + i);
        }
        rows.push(rowIndices);
        currentIdx += take;
      }
      return rows;
    }
  }
}

function partitionByRowCounts(rowCounts: number[]): number[][] {
  const result: number[][] = [];
  let curr = 0;
  for (const count of rowCounts) {
    const row: number[] = [];
    for (let i = 0; i < count; i++) {
      row.push(curr++);
    }
    result.push(row);
  }
  return result;
}

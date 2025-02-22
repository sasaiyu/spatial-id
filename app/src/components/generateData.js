import fs from 'fs';
import { SpatialId, Line2spatialId } from './spatialId.js';
import { Space } from '@spatial-id/javascript-sdk';

/**
 * テストデータを作成し、CSV に書き出す
 * @param {number} p - 緯度・経度
 * @param {string} file1 - 出力ファイル名1 (緯度・経度ベース)
 * @param {string} file2 - 出力ファイル名2 (空間 ID ベース)
 * @return {Promise<void>}
 */
export async function generateData(coordinates, zoom, file1, file2) {
  const data1 = fs.createWriteStream(file1);
  const data2 = fs.createWriteStream(file2);

  const ids = Line2spatialId(coordinates);
  for (var id of ids) {
    try {
      const space = new Space(id, zoom);
      const { lng, lat } = space.center;
      const now=new Date();
      for (var i = 0; i < 1000; i++) {
        const time = new Date(now.valueOf() + i * 1000)
          .toISOString()
          .replace('T', ' ')
          .replace('Z', '');
        const data = '車両' + (i + 1);
        data1.write(`${lng},${lat},${time},${data}\n`);
        data2.write(`${space.id},${time},${data}\n`);
      }
    } catch (error) {
      console.log(error);
    }
  }

  data1.end();
  data2.end();
}

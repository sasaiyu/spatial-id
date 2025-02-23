import fs from 'fs';
import { SpatialId } from './spatialId.js';

/**
 * テストデータを作成し、CSV に書き出す
 * @param {number} p - 緯度・経度のオフセット
 * @param {string} file1 - 出力ファイル名1 (緯度・経度ベース)
 * @param {string} file2 - 出力ファイル名2 (空間 ID ベース)
 * @return {Promise<void>}
 */
export async function generateData(p, file1, file2) {
  const data1 = fs.createWriteStream(file1);
  const data2 = fs.createWriteStream(file2);

  const max = 100;
  for (let i = 0; i < max; i++) {
    const latitude = p + (1.0 * i) / max;
    for (let j = 0; j < max; j++) {
      const longitude = p + (1.0 * j) / max;
      for (let k = 0; k < max; k++) {
        const time = new Date(1000 * (i * max * max + j * max + k))
          .toISOString()
          .replace('T', ' ')
          .replace('Z', '');
        const data = '車種' + ((i % 10) + 1);
        const space = new SpatialId({ lat: latitude, lng: longitude });

        data1.write(`${latitude},${longitude},${time},${data}\n`);
        data2.write(`${space.id},${time},${data}\n`);
      }
    }
  }

  data1.end();
  data2.end();
}

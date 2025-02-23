import fs from 'fs';
import { Space } from '@spatial-id/javascript-sdk';

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

  const imax = 100,
    jmax = 100,
    kmax = 100;

  for (let i = 0; i < imax; i++) {
    const latitude = p + (1.0 * i) / imax;
    for (let j = 0; j < jmax; j++) {
      const longitude = p + (1.0 * j) / jmax;
      for (let k = 0; k < kmax; k++) {
        const time = new Date(10000 + i * imax * jmax + j * jmax + k)
          .toISOString()
          .replace('T', ' ')
          .replace('Z', '');
        const data = '車種' + ((i % 10) + 1);
        const space = new Space({ lat: latitude, lng: longitude });

        data1.write(`${latitude},${longitude},${time},${data}\n`);
        data2.write(`${space.id},${time},${data}\n`);
      }
    }
  }

  data1.end();
  data2.end();
}

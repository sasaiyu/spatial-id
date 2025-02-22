import { getPostgresClient } from './components/postgres.js';
import { generateData } from './components/generateData.js';
import { Line2spatialId } from './components/spatialId.js';

const client = await getPostgresClient();

function timer(func, comment) {
  return async function (...args) {
    const start = Date.now();
    let result = await func.call(this, ...args);
    const end = Date.now();
    console.log(`${comment} : ${end - start} [ms]`);
    return result;
  };
}

try {
  // await client.execute('TRUNCATE TABLE sp1');
  // await client.execute('TRUNCATE TABLE sp2');

  let coordinates = [
    { lng: 0, lat: 0 },
    { lng: 1, lat: 1 },
  ];
  // await generateData(coordinates, 15, 'data1.csv', 'data2.csv');
  // await client.copy('sp1 (longitude, latitude, time, data)', 'data1.csv');
  // await client.copy('sp2 (spatialId, time, data)', 'data2.csv');

  // SQL実行速度を計測
  client.execute = timer(client.execute, 'execute');

  let res;
  res = await client.execute('SELECT COUNT(*) FROM sp1');
  console.log('全件（sp1）: ' + res.rows[0].count);
  res = await client.execute('SELECT COUNT(*) FROM sp2');
  console.log('全件（sp2）: ' + res.rows[0].count);

  // 空間IDの範囲検索
  coordinates = [
    { lng: 0.3, lat: 0.3 },
    { lng: 0.5, lat: 0.5 },
  ];

  res = await client.execute(
    `SELECT COUNT(*) FROM sp1 WHERE longitude>=${coordinates[0].lng} AND longitude<=${coordinates[1].lng}  AND latitude>=${coordinates[0].lat}  AND latitude<=${coordinates[1].lat} `
  );
  console.log('範囲（sp1）: ' + res.rows[0].count);

  const ids = Line2spatialId(coordinates);
  client.select = timer(client.select, 'select');
  res = await client.select('sp2', 'spatialId', ids);
  console.log('範囲（sp2）: ' + res.rows[0].count);
} catch (err) {
  console.error(err);
} finally {
  client.release();
  client.end();
}

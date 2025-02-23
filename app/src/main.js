import { Space } from '@spatial-id/javascript-sdk';
import { getPostgresClient } from './components/postgres.js';
import { generateData } from './components/generateData.js';

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
  generateData(0, 'data1.csv', 'data2.csv');
  client.copy('sp1 (latitude, longitude, time, data)', 'data1.csv');
  await client.copy('sp2 (spatialId, time, data)', 'data2.csv');

  // SQL実行速度を計測
  client.execute = timer(client.execute, 'execute');

  let res;
  res = await client.execute('SELECT count(*) from sp1');
  console.log(res.rows);
  res = await client.execute('SELECT count(*) from sp2');
  console.log(res.rows);
} catch (err) {
  console.error(err);
} finally {
  client.release();
  client.end();
}

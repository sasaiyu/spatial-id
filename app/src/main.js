import pg from 'pg';
import { Space } from '@spatial-id/javascript-sdk';

const { Pool } = pg;
const pool = new Pool({
  user: process.env.USER_NAME,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});
const client = await pool.connect();

try {
  let res;
  res = await client.query('TRUNCATE TABLE sp1');
  res = await client.query('TRUNCATE TABLE sp2');

  let max = 10 ** 2;
  for (let i = 0; i < max; i++) {
    const latitude = Math.random() * 180 - 90;
    const longitude = Math.random() * 180 - 90;
    const time = Date.now() / 1000.0;
    const data = '車種' + ((i % 10) + 1);
    const space = new Space({ lng: latitude, lat: longitude });

    res = await client.query(
      'INSERT INTO sp1 (latitude, longitude, time,data) VALUES ($1, $2, to_timestamp($3), $4)',
      [latitude, longitude, time, data]
    );

    res = await client.query(
      'INSERT INTO sp2 (spatialId, time,data) VALUES ($1, to_timestamp($2), $3)',
      [space.zfxyStr, time, data]
    );
  }

  res = await client.query('SELECT * from sp1');
  console.log('sp1: ' + res.rowCount);
  res = await client.query('SELECT * from sp2');
  console.log('sp2: ' + res.rowCount);
} catch (err) {
  console.error(err);
} finally {
  client.release();
  pool.end();
}

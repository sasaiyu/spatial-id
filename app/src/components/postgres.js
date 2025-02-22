import pg from 'pg';

import fs from 'fs';
import { pipeline } from 'node:stream/promises';
import { from as copyFrom } from 'pg-copy-streams';

const { Pool } = pg;
const pool = new Pool({
  user: process.env.USER_NAME,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

class Postgres {
  /**
   * Poolからclientを取得
   * @return {Promise<void>}
   */
  async init() {
    this.client = await pool.connect();
  }

  /**
   * SQLを実行
   * @param query
   * @param params
   * @return {Promise<*>}
   */
  async execute(query, params = []) {
    return await this.client.query(query, params);
  }

  /**
   * 取得したクライアントを解放してPoolに戻す
   * @return {Promise<void>}
   */
  async release() {
    await this.client.release(true);
  }

  /**
   * Poolを終了する
   * @return {Promise<void>}
   */
  async end() {
    await pool.end();
  }

  /**
   * COPYを実行
   * @param {string} table - テーブル名 例. table (column1, column2, column3)
   * @param {string} file - CSV ファイルのパス
   * @return {Promise<*>}
   */
  async copy(table, file) {
    const ingestStream = this.client.query(
      copyFrom(`COPY ${table} FROM STDIN WITH CSV`)
    );
    const sourceStream = fs.createReadStream(file);
    return await pipeline(sourceStream, ingestStream);
  }

  /**
   * 空間IDのSELECTを実行
   * @param {string} table - テーブル名
   * @param {string} column - カラム名
   * @param {string} ids - 検索するID
   * @return {Promise<*>}
   */
  async select(table, column, ids) {
    let que = `SELECT COUNT(*) FROM ${table} where ${column} in (${ids.join(
      ','
    )})`;
    return await this.client.query(que);
  }
}

/**
 * Postgresのインスタンスを返却
 * @return {Promise<Postgres>}
 */
export const getPostgresClient = async () => {
  const postgres = new Postgres();
  await postgres.init();
  return postgres;
};

# [Spatial-Id](https://github.com/sasaiyu/spatial-id)

緯度・経度と時間の複合インデックスと空間 ID と時間のインデックスでの性能差について調べる。

## TL;DR

[実行計画](#実行計画)を調べたところ、空間 ID と時間のインデックスは検索する時間幅が狭い範囲の場合に緯度・経度と時間のインデックスより共有バッファーを多く利用でき実行時間が高速になった。また、集約関数を利用する場合は、空間 ID と時間のインデックスでは `Parallel Seq Scan` （並列処理）が選択され実行速度が高速になった。

## [Linux Debian](https://hub.docker.com/r/microsoft/devcontainers-base)

[app コンテナ](https://github.com/sasaiyu/spatial-id/blob/main/app)を起動して JavaScript を使用して空間 ID の変換とデータベースの検索、格納を実施する。

### 空間 ID

[ズームレベル](https://www.ipa.go.jp/digital/architecture/Individual-link/nq6ept000000g0fh-att/4dspatio-temporal-guideline-gamma.pdf)は 15 とする。距離にすると、およそ 1.2km で緯度経度にすると、およそ 0.01 度である。

ラインストリング（または、二点間の緯度・経度）を通る空間 ID を求めるために、始点の空間 ID のバウンディングボックス（空間 ID を中心とする枠）と交わるベクトルを終点まで順番に導出する。なお、バウンディングボックスの四隅の点を向くベクトルとの相似を利用してバウンディングボックスと交わるベクトルを求める。

<img src="https://github.com/sasaiyu/spatial-id/blob/main/docs/app/image/spatial-id.svg" width="300" alt="ラインストリングと空間ID">

### ライブラリ

空間 ID は[javascript-sdk](https://github.com/spatial-id/javascript-sdk)を用いて変換する。データベースは、[node-postgres](https://node-postgres.com/)を用いて接続する。

## [PostgreSQL](https://hub.docker.com/_/postgres)

[db コンテナ](https://github.com/sasaiyu/spatial-id/blob/main/db)を起動して[PostgreSQL](https://hub.docker.com/_/postgres)をデータベースとして使用する。

### [テーブル設計](https://github.com/sasaiyu/spatial-id/blob/main/db/initdb/02_create_table.sql)

緯度と経度、タイムスタンプの複合主キーのテーブルと空間 ID とタイムスタンプの複合主キーを利用する。空間 ID は、[空間 ID が表現する ZFXY (3 次元タイル番号)](https://github.com/spatial-id/javascript-sdk?tab=readme-ov-file#id-tilehash)である。

<img src="https://github.com/sasaiyu/spatial-id/blob/main/docs/db/image/database.svg" width="300" alt="テーブル設計">

### [pgAdmin4](https://hub.docker.com/r/dpage/pgadmin4/)

[Docker Compose](https://github.com/sasaiyu/spatial-id/blob/main/compose.yml)によりコンテナを起動する。[http://localhost:80](http://localhost:80)から接続できる。接続情報は、[servers.json](https://github.com/sasaiyu/spatial-id/blob/main/db/config/servers.json)をもとに設定されており、設定値は[環境変数](#環境変数)を参照すること。

## 実行計画

### 時間をずらす

緯度・経度のテーブル `sp1` では、統計情報をもとに対象レコード数 `Rows` が SQL 実行時した時点でのテーブル件数と乖離が多い。 `sp1` が `(longitude, latitude, time)` の複合キーの特性が関係している可能性がある。

共有バッファーヒット `Buffers: shared hit` が `sp2` の方が多いが、実行時間は `sp1` の方が速い。

```sql
--- time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:10:00'
EXPLAIN (ANALYZE, BUFFERS) SELECT longitude, latitude, time FROM sp1 WHERE longitude >= '0.3' AND longitude <= '0.5' AND latitude >= '0.3' AND latitude <= '0.5' AND time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:10:00'

"Index Only Scan using sp1_pkey on sp1  (cost=0.43..882.99 rows=94 width=24) (actual time=0.027..1.645 rows=12600 loops=1)"
"  Index Cond: ((longitude >= '0.3'::double precision) AND (longitude <= '0.5'::double precision) AND (latitude >= '0.3'::double precision) AND (latitude <= '0.5'::double precision) AND (""time"" > '2025-03-03 12:00:00'::timestamp without time zone) AND (""time"" < '2025-03-03 12:10:00'::timestamp without time zone))"
"  Heap Fetches: 0"
"  Buffers: shared hit=107"
"Planning:"
"  Buffers: shared hit=4"
"Planning Time: 0.100 ms"
"Execution Time: 2.048 ms"

EXPLAIN (ANALYZE, BUFFERS) SELECT spatialId, time FROM sp2 WHERE spatialId in (233333333322322,233333333322144,233333333322233,233333333322232,233333333322223,233333333322222,233333333144444,233333333233333,233333333233332,233333333233323,233333333233322,233333333233233,233333333233232,233333333233223,233333333233222,233333333232333,233333333232332,233333333232323,233333333232322,233333333232233,233333333232232) AND time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:10:00'

"Index Only Scan using sp2_pkey on sp2  (cost=0.43..710.12 rows=12490 width=19) (actual time=0.025..1.969 rows=12600 loops=1)"
"  Index Cond: ((spatialid = ANY ('{233333333322322,233333333322144,233333333322233,233333333322232,233333333322223,233333333322222,233333333144444,233333333233333,233333333233332,233333333233323,233333333233322,233333333233233,233333333233232,233333333233223,233333333233222,233333333232333,233333333232332,233333333232323,233333333232322,233333333232233,233333333232232}'::numeric[])) AND (""time"" > '2025-03-03 12:00:00'::timestamp without time zone) AND (""time"" < '2025-03-03 12:10:00'::timestamp without time zone))"
"  Heap Fetches: 0"
"  Buffers: shared hit=150"
"Planning Time: 0.093 ms"
"Execution Time: 2.316 ms"
```

`Buffers: shared hit=24 read=1` で、ページの読み込みが発生してるのが遅延の原因と推測される。以下の実行計画と実行時間は `sp2` の方が高速。

```sql
--- time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:05:00'
EXPLAIN (ANALYZE, BUFFERS) SELECT longitude, latitude, time FROM sp1 WHERE longitude >= '0.3' AND longitude <= '0.5' AND latitude >= '0.3' AND latitude <= '0.5' AND time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:05:00'

"Index Only Scan using sp1_pkey on sp1  (cost=0.43..882.53 rows=48 width=24) (actual time=0.025..1.466 rows=6300 loops=1)"
"  Index Cond: ((longitude >= '0.3'::double precision) AND (longitude <= '0.5'::double precision) AND (latitude >= '0.3'::double precision) AND (latitude <= '0.5'::double precision) AND (""time"" > '2025-03-03 12:00:00'::timestamp without time zone) AND (""time"" < '2025-03-03 12:05:00'::timestamp without time zone))"
"  Heap Fetches: 0"
"  Buffers: shared hit=107"
"Planning:"
"  Buffers: shared hit=24 read=1"
"Planning Time: 0.447 ms"
"Execution Time: 1.667 ms"

EXPLAIN (ANALYZE, BUFFERS) SELECT spatialId, time FROM sp2 WHERE spatialId in (233333333322322,233333333322144,233333333322233,233333333322232,233333333322223,233333333322222,233333333144444,233333333233333,233333333233332,233333333233323,233333333233322,233333333233233,233333333233232,233333333233223,233333333233222,233333333232333,233333333232332,233333333232323,233333333232322,233333333232233,233333333232232) AND time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:05:00'

"Index Only Scan using sp2_pkey on sp2  (cost=0.43..401.46 rows=6247 width=19) (actual time=0.028..1.132 rows=6300 loops=1)"
"  Index Cond: ((spatialid = ANY ('{233333333322322,233333333322144,233333333322233,233333333322232,233333333322223,233333333322222,233333333144444,233333333233333,233333333233332,233333333233323,233333333233322,233333333233233,233333333233232,233333333233223,233333333233222,233333333232333,233333333232332,233333333232323,233333333232322,233333333232233,233333333232232}'::numeric[])) AND (""time"" > '2025-03-03 12:00:00'::timestamp without time zone) AND (""time"" < '2025-03-03 12:05:00'::timestamp without time zone))"
"  Heap Fetches: 0"
"  Buffers: shared hit=130"
"Planning:"
"  Buffers: shared hit=23"
"Planning Time: 0.203 ms"
"Execution Time: 1.309 ms"
```

```sql
--- time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:01:00'
EXPLAIN (ANALYZE, BUFFERS) SELECT longitude, latitude, time FROM sp1 WHERE longitude >= '0.3' AND longitude <= '0.5' AND latitude >= '0.3' AND latitude <= '0.5' AND time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:01:00'

"Index Only Scan using sp1_pkey on sp1  (cost=0.43..882.15 rows=10 width=24) (actual time=0.027..0.908 rows=1260 loops=1)"
"  Index Cond: ((longitude >= '0.3'::double precision) AND (longitude <= '0.5'::double precision) AND (latitude >= '0.3'::double precision) AND (latitude <= '0.5'::double precision) AND (""time"" > '2025-03-03 12:00:00'::timestamp without time zone) AND (""time"" < '2025-03-03 12:01:00'::timestamp without time zone))"
"  Heap Fetches: 0"
"  Buffers: shared hit=107"
"Planning:"
"  Buffers: shared hit=4"
"Planning Time: 0.104 ms"
"Execution Time: 0.958 ms"

EXPLAIN (ANALYZE, BUFFERS) SELECT spatialId, time FROM sp2 WHERE spatialId in (233333333322322,233333333322144,233333333322233,233333333322232,233333333322223,233333333322222,233333333144444,233333333233333,233333333233332,233333333233323,233333333233322,233333333233233,233333333233232,233333333233223,233333333233222,233333333232333,233333333232332,233333333232323,233333333232322,233333333232233,233333333232232) AND time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:01:00'

"Index Only Scan using sp2_pkey on sp2  (cost=0.43..121.40 rows=1262 width=19) (actual time=0.025..0.267 rows=1260 loops=1)"
"  Index Cond: ((spatialid = ANY ('{233333333322322,233333333322144,233333333322233,233333333322232,233333333322223,233333333322222,233333333144444,233333333233333,233333333233332,233333333233323,233333333233322,233333333233233,233333333233232,233333333233223,233333333233222,233333333232333,233333333232332,233333333232323,233333333232322,233333333232233,233333333232232}'::numeric[])) AND (""time"" > '2025-03-03 12:00:00'::timestamp without time zone) AND (""time"" < '2025-03-03 12:01:00'::timestamp without time zone))"
"  Heap Fetches: 0"
"  Buffers: shared hit=67"
"Planning Time: 0.098 ms"
"Execution Time: 0.311 ms"
```

### 集約する

`sp1` では、Index Only Scan を選択し、`sp2` では Parallel Seq Scan を選択している。`sp1` では複合キーによる特性が関連し、`sp2` ではテーブルサイズやカーディナリティが関連していると考えられる。実行時間としては、`sp2` の方が高速。

```sql
--- Aggregation

EXPLAIN (ANALYZE, BUFFERS) SELECT longitude, latitude, Max(time) FROM sp1 GROUP BY longitude, latitude

"GroupAggregate  (cost=0.43..135848.43 rows=313600 width=24) (actual time=36.170..1647.897 rows=3136 loops=1)"
"  Group Key: longitude, latitude"
"  Buffers: shared hit=108 read=15334"
"  ->  Index Only Scan using sp1_pkey on sp1  (cost=0.43..109192.43 rows=3136000 width=24) (actual time=0.020..1415.848 rows=3136000 loops=1)"
"        Heap Fetches: 0"
"        Buffers: shared hit=108 read=15334"
"Planning:"
"  Buffers: shared hit=41"
"Planning Time: 2.301 ms"
"JIT:"
"  Functions: 3"
"  Options: Inlining false, Optimization false, Expressions true, Deforming true"
"  Timing: Generation 1.643 ms, Inlining 0.000 ms, Optimization 1.787 ms, Emission 32.595 ms, Total 36.024 ms"
"Execution Time: 1842.071 ms"


EXPLAIN (ANALYZE, BUFFERS) SELECT spatialId, Max(time) FROM sp2 GROUP BY spatialId
"Finalize GroupAggregate  (cost=46923.50..47718.01 rows=3136 width=19) (actual time=592.772..598.851 rows=3136 loops=1)"
"  Group Key: spatialid"
"  Buffers: shared hit=117 read=26007"
"  ->  Gather Merge  (cost=46923.50..47655.29 rows=6272 width=19) (actual time=592.765..597.758 rows=4684 loops=1)"
"        Workers Planned: 2"
"        Workers Launched: 2"
"        Buffers: shared hit=117 read=26007"
"        ->  Sort  (cost=45923.48..45931.32 rows=3136 width=19) (actual time=541.491..541.577 rows=1561 loops=3)"
"              Sort Key: spatialid"
"              Sort Method: quicksort  Memory: 174kB"
"              Buffers: shared hit=117 read=26007"
"              Worker 0:  Sort Method: quicksort  Memory: 167kB"
"              Worker 1:  Sort Method: quicksort  Memory: 170kB"
"              ->  Partial HashAggregate  (cost=45710.00..45741.36 rows=3136 width=19) (actual time=540.797..541.026 rows=1561 loops=3)"
"                    Group Key: spatialid"
"                    Batches: 1  Memory Usage: 241kB"
"                    Buffers: shared hit=103 read=26007"
"                    Worker 0:  Batches: 1  Memory Usage: 241kB"
"                    Worker 1:  Batches: 1  Memory Usage: 241kB"
"                    ->  Parallel Seq Scan on sp2  (cost=0.00..39176.67 rows=1306667 width=19) (actual time=0.082..123.227 rows=1045333 loops=3)"
"                          Buffers: shared hit=103 read=26007"
"Planning Time: 0.153 ms"
"Execution Time: 599.072 ms"
```

さらに、レコード数を 300 万から 1800 万に増やしたところ、`sp2` の実行計時間の方が高速になった。

```sql
--- time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:10:00'
EXPLAIN (ANALYZE, BUFFERS) SELECT longitude, latitude, time FROM sp1 WHERE longitude >= '0.3' AND longitude <= '0.5' AND latitude >= '0.3' AND latitude <= '0.5' AND time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:10:00'

"Index Only Scan using sp1_pkey on sp1  (cost=0.56..8060.69 rows=111 width=24) (actual time=1.474..28.618 rows=12600 loops=1)"
"  Index Cond: ((longitude >= '0.3'::double precision) AND (longitude <= '0.5'::double precision) AND (latitude >= '0.3'::double precision) AND (latitude <= '0.5'::double precision) AND (""time"" > '2025-03-03 12:00:00'::timestamp without time zone) AND (""time"" < '2025-03-03 12:10:00'::timestamp without time zone))"
"  Heap Fetches: 0"
"  Buffers: shared hit=2 read=1050"
"Planning:"
"  Buffers: shared hit=66"
"Planning Time: 0.282 ms"
"Execution Time: 29.003 ms"

EXPLAIN (ANALYZE, BUFFERS) SELECT spatialId, time FROM sp2 WHERE spatialId in (233333333322322,233333333322144,233333333322233,233333333322232,233333333322223,233333333322222,233333333144444,233333333233333,233333333233332,233333333233323,233333333233322,233333333233233,233333333233232,233333333233223,233333333233222,233333333232333,233333333232332,233333333232323,233333333232322,233333333232233,233333333232232) AND time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:10:00'

"Index Only Scan using sp2_pkey on sp2  (cost=0.56..703.53 rows=12078 width=19) (actual time=1.102..11.964 rows=12600 loops=1)"
"  Index Cond: ((spatialid = ANY ('{233333333322322,233333333322144,233333333322233,233333333322232,233333333322223,233333333322222,233333333144444,233333333233333,233333333233332,233333333233323,233333333233322,233333333233233,233333333233232,233333333233223,233333333233222,233333333232333,233333333232332,233333333232323,233333333232322,233333333232233,233333333232232}'::numeric[])) AND (""time"" > '2025-03-03 12:00:00'::timestamp without time zone) AND (""time"" < '2025-03-03 12:10:00'::timestamp without time zone))"
"  Heap Fetches: 0"
"  Buffers: shared hit=55 read=107"
"Planning:"
"  Buffers: shared hit=88"
"Planning Time: 0.735 ms"
"Execution Time: 12.326 ms"


--- time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:05:00'
EXPLAIN (ANALYZE, BUFFERS) SELECT longitude, latitude, time FROM sp1 WHERE longitude >= '0.3' AND longitude <= '0.5' AND latitude >= '0.3' AND latitude <= '0.5' AND time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:05:00'
"Index Only Scan using sp1_pkey on sp1  (cost=0.56..8060.17 rows=59 width=24) (actual time=0.037..6.132 rows=6300 loops=1)"
"  Index Cond: ((longitude >= '0.3'::double precision) AND (longitude <= '0.5'::double precision) AND (latitude >= '0.3'::double precision) AND (latitude <= '0.5'::double precision) AND (""time"" > '2025-03-03 12:00:00'::timestamp without time zone) AND (""time"" < '2025-03-03 12:05:00'::timestamp without time zone))"
"  Heap Fetches: 0"
"  Buffers: shared hit=1052"
"Planning Time: 0.096 ms"
"Execution Time: 6.344 ms"
EXPLAIN (ANALYZE, BUFFERS) SELECT spatialId, time FROM sp2 WHERE spatialId in (233333333322322,233333333322144,233333333322233,233333333322232,233333333322223,233333333322222,233333333144444,233333333233333,233333333233332,233333333233323,233333333233322,233333333233233,233333333233232,233333333233223,233333333233222,233333333232333,233333333232332,233333333232323,233333333232322,233333333232233,233333333232232) AND time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:05:00'
"Index Only Scan using sp2_pkey on sp2  (cost=0.56..400.31 rows=6063 width=19) (actual time=0.064..2.781 rows=6300 loops=1)"
"  Index Cond: ((spatialid = ANY ('{233333333322322,233333333322144,233333333322233,233333333322232,233333333322223,233333333322222,233333333144444,233333333233333,233333333233332,233333333233323,233333333233322,233333333233233,233333333233232,233333333233223,233333333233222,233333333232333,233333333232332,233333333232323,233333333232322,233333333232233,233333333232232}'::numeric[])) AND (""time"" > '2025-03-03 12:00:00'::timestamp without time zone) AND (""time"" < '2025-03-03 12:05:00'::timestamp without time zone))"
"  Heap Fetches: 0"
"  Buffers: shared hit=54 read=68"
"Planning:"
"  Buffers: shared hit=85 read=3 dirtied=1"
"Planning Time: 0.439 ms"
"Execution Time: 2.993 ms"


--- time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:01:00'
EXPLAIN (ANALYZE, BUFFERS) SELECT longitude, latitude, time FROM sp1 WHERE longitude >= '0.3' AND longitude <= '0.5' AND latitude >= '0.3' AND latitude <= '0.5' AND time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:01:00'

"Index Only Scan using sp1_pkey on sp1  (cost=0.56..8059.69 rows=11 width=24) (actual time=0.041..5.493 rows=1260 loops=1)"
"  Index Cond: ((longitude >= '0.3'::double precision) AND (longitude <= '0.5'::double precision) AND (latitude >= '0.3'::double precision) AND (latitude <= '0.5'::double precision) AND (""time"" > '2025-03-03 12:00:00'::timestamp without time zone) AND (""time"" < '2025-03-03 12:01:00'::timestamp without time zone))"
"  Heap Fetches: 0"
"  Buffers: shared hit=1052"
"Planning Time: 0.087 ms"
"Execution Time: 5.550 ms"

EXPLAIN (ANALYZE, BUFFERS) SELECT spatialId, time FROM sp2 WHERE spatialId in (233333333322322,233333333322144,233333333322233,233333333322232,233333333322223,233333333322222,233333333144444,233333333233333,233333333233332,233333333233323,233333333233322,233333333233233,233333333233232,233333333233223,233333333233222,233333333232333,233333333232332,233333333232323,233333333232322,233333333232233,233333333232232) AND time>'2025-03-03 12:00:00' AND time<'2025-03-03 12:01:00'

"Index Only Scan using sp2_pkey on sp2  (cost=0.56..122.34 rows=1183 width=19) (actual time=0.027..0.299 rows=1260 loops=1)"
"  Index Cond: ((spatialid = ANY ('{233333333322322,233333333322144,233333333322233,233333333322232,233333333322223,233333333322222,233333333144444,233333333233333,233333333233332,233333333233323,233333333233322,233333333233233,233333333233232,233333333233223,233333333233222,233333333232333,233333333232332,233333333232323,233333333232322,233333333232233,233333333232232}'::numeric[])) AND (""time"" > '2025-03-03 12:00:00'::timestamp without time zone) AND (""time"" < '2025-03-03 12:01:00'::timestamp without time zone))"
"  Heap Fetches: 0"
"  Buffers: shared hit=93"
"Planning Time: 0.142 ms"
"Execution Time: 0.343 ms"
```

## 環境構築

コンテナイメージから、[app コンテナ](https://github.com/sasaiyu/spatial-id/tree/main/app)と[db コンテナ](https://github.com/sasaiyu/spatial-id/blob/main/db)のサービスを起動する。

### 環境変数

[Compose ファイル](https://github.com/sasaiyu/spatial-id/blob/main/compose.yml)によりデフォルト値を設定する。または、`.env` により変更が可能。`.env`によって設定していないパラメータの値は、[Compose ファイル](https://github.com/sasaiyu/spatial-id/blob/main/compose.yml)を編集すること。

|                                           | app | db  | pgadmin4 | .env | 説明                                                                                                                 |
| ----------------------------------------- | :-: | :-: | :------: | :--: | -------------------------------------------------------------------------------------------------------------------- |
| USER_NAME                                 |  ○  |     |          |  ○   | app コンテナの Linux ユーザ名                                                                                        |
| GROUP_NAME                                |  ○  |     |          |  ○   | app コンテナの Linux グループ名                                                                                      |
| DB_HOST                                   |  ○  |     |          |      | db のホスト名                                                                                                        |
| DB_PORT                                   |  ○  |     |          |      | db のポート番号                                                                                                      |
| DB_NAME                                   |  ○  |     |          |  ○   | PostgreSQL のデータベース名（POSTGRES_DB と同一）                                                                    |
| DB_USER                                   |  ○  |     |          |  ○   | [db のユーザ名](https://github.com/sasaiyu/spatial-id/blob/main/db/initdb/01_init.sql)                               |
| DB_PASSWORD                               |  ○  |     |          |  ○   | [db のパスワード](https://github.com/sasaiyu/spatial-id/blob/main/db/initdb/01_init.sql)                             |
| POSTGRES_DB                               |     |  ○  |          |  ○   | PostgreSQL のデータベース名（DB_NAME と同一）                                                                        |
| POSTGRES_USER                             |     |  ○  |          |  ○   | ルートユーザ名                                                                                                       |
| POSTGRES_PASSWORD                         |     |  ○  |          |  ○   | ルートユーザのパスワード                                                                                             |
| PGADMIN_DEFAULT_EMAIL                     |     |     |    ○     |  ○   | ルートユーザ名                                                                                                       |
| PGADMIN_DEFAULT_PASSWORD                  |     |     |    ○     |  ○   | ルートユーザのパスワード                                                                                             |
| PGADMIN_CONFIG_SERVER_MODE                |     |     |    ○     |      | [Pgadmin4 のログイン方法](https://stackoverflow.com/questions/70883515/pgadmin-disable-login-dialog-automatic-login) |
| PGADMIN_CONFIG_MASTER \_PASSWORD_REQUIRED |     |     |    ○     |      | [Pgadmin4 のログイン方法](https://stackoverflow.com/questions/70883515/pgadmin-disable-login-dialog-automatic-login) |

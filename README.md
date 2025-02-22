# [Spatial-Id](https://github.com/sasaiyu/spatial-id)

緯度・経度と時間の複合インデックスと空間 ID のインデックスでの性能差について調べる。

## TL;DR

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

CREATE TABLE sp1 (
    longitude DOUBLE PRECISION NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data VARCHAR(255),
    PRIMARY KEY (longitude, latitude, time)
);

COMMENT ON TABLE sp1 IS '緯度経度/時間を主キーとするテーブル';

COMMENT ON COLUMN sp1.longitude IS '緯度';

COMMENT ON COLUMN sp1.latitude IS '経度';

COMMENT ON COLUMN sp1.time IS '時間';

COMMENT ON COLUMN sp1.data IS '属性値';

CREATE TABLE sp2 (
    spatialId NUMERIC(25) NOT NULL,
    time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data VARCHAR(255),
    PRIMARY KEY (spatialId, time)
);

COMMENT ON TABLE sp2 IS '時空間ID/時間を主キーとするテーブル';

COMMENT ON COLUMN sp2.spatialId IS '空間ID（ZFXY形式）';

COMMENT ON COLUMN sp2.time IS '時間';

COMMENT ON COLUMN sp2.data IS '属性値';

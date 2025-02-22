import { Space } from '@spatial-id/javascript-sdk';

export class SpatialId {
  constructor({ lng, lat }) {
    this.zoom = 15;
    this.space = new Space({ lng, lat }, this.zoom);
  }

  get id() {
    return this.space.id;
  }

  get center() {
    return this.space.center;
  }

  get lat() {
    return this.space.center.lat;
  }

  get lng() {
    return this.space.center.lng;
  }

  boundingBox() {
    return this.space
      .toGeoJSON()
      .coordinates[0].splice(0, 4)
      .map((p) => ({
        lng: p[0],
        lat: p[1],
      }));
  }

  contains({ lng, lat }) {
    return this.space.contains({ lng, lat });
  }

  move({ x = 0, y = 0 }) {
    const sp = this.space.move({ x, y });
    return new SpatialId(sp.center);
  }
}

class Vector {
  constructor(x, y) {
    if (typeof x !== 'number' || typeof y !== 'number') {
      throw new TypeError('cannot initialize Vector');
    }
    this.x = x;
    this.y = y;
    this.position = { x: this.x, y: this.y };
  }

  get size() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }

  normalize() {
    if (this.x == 0 && this.y == 0) {
      return new Vector(0, 0);
    }
    return new Vector(this.x / this.size, this.y / this.size);
  }

  scale(thickness) {
    const v = this.normalize();
    v.x *= thickness;
    v.y *= thickness;
    return v;
  }

  clone() {
    return new Vector(this.x, this.y);
  }

  add(x, y) {
    const v = this.clone();
    v.x += x;
    v.y += y;
    return v;
  }

  subtract(x, y) {
    const v = this.clone();
    v.x -= x;
    v.y -= y;
    return v;
  }

  multiple(thickness) {
    const v = this.clone();
    v.x *= thickness;
    v.y *= thickness;
    return v;
  }
}

/**
 * 直線上の空間IDを返す
 * @param {[{lng, lat}]} coordinates - 始点と終点の配列
 * @returns {[SpatialId]} spatialId - 空間IDの配列
 */
export function Line2spatialId(coordinates) {
  let list =
    coordinates[0].lng < coordinates[1].lng
      ? getLinkedList({ start: coordinates[0], end: coordinates[1] })
      : getLinkedList({ start: coordinates[1], end: coordinates[0] });

  let id = [];
  for (;;) {
    id.push(list.id);
    if (list.next != null) {
      list = list.next;
    } else {
      break;
    }
  }
  return [...new Set(id)];
}

/**
 * 線分上の空間IDを返す
 * @param {{start: {lng, lat}, end: {lng, lat}}} coordinates - 始点と終点のオブジェクト
 * @returns {{start: {lng, lat}, end: {lng, lat}, next: {start: {lng, lat}, end: {lng, lat}, next: ...}}} linkedList - 空間IDのLinkedList
 */
function getLinkedList({ start, end }) {
  // 始点と終点の空間IDが同じ場合は、その空間IDで終了する
  const startSpace = new SpatialId(start);
  if (startSpace.contains(end)) return { id: startSpace.id, next: null };

  // vectorが東・南・北のどちらの空間IDと交わるか判定し、交点を次の始点をnextとする
  const vector = new Vector(end.lng - start.lng, end.lat - start.lat);
  let next;

  if (vector.y == 0) {
    // 東の空間IDと交わる場合
    const box = startSpace.move({ x: 1 }).center;
    next = { lng: box.lng, lat: start.lat };
  } else if (vector.y < 0) {
    // 南もしくは東の空間IDと交わる場合
    let box = startSpace.boundingBox()[2];
    let corner = new Vector(box.lng - start.lng, box.lat - start.lat);
    if (vector.x == 0) {
      // 直下に終点がある場合は南の空間IDと交わる
      box = startSpace.move({ y: 1 }).center;
      next = { lng: start.lng, lat: box.lat };
      return {
        id: startSpace.id,
        next: getLinkedList({ start: next, end: end }),
      };
    } else if (corner.size == 0) {
      // バウンディングボックスの南東の位置が始点の場合は南東の空間IDと交わる
      next = { lng: box.lng, lat: box.lat };
      return {
        id: startSpace.id,
        next: getLinkedList({ start: next, end: end }),
      };
    } else if (corner.x == 0) {
      // 東の空間IDとの接線上に始点がある場合は東の空間IDと交わる
      // 現在の空間IDを東の空間IDに変更して、後続の判定をする
      box = startSpace.move({ x: 1 }).boundingBox()[3];
      corner = new Vector(box.lng - start.lng, box.lat - start.lat);
    } else if (corner.y == 0) {
      // 南の空間IDとの接線上に始点がある場合は南の空間IDと交わる
      // 現在の空間IDを南の空間IDに変更して、後続の判定をする
      box = startSpace.move({ y: 1 }).boundingBox()[2];
      corner = new Vector(box.lng - start.lng, box.lat - start.lat);
    }
    if (vector.size <= corner.size) {
      // （変更した空間IDが）終点のある空間IDと同一の場合
      next = { lng: start.lng + vector.x, lat: start.lat + vector.y };
    } else if (corner.y / corner.x > vector.y / vector.x) {
      // 南の空間IDと交わる場合
      const e = vector.multiple(corner.y / vector.y);
      next = { lng: start.lng + e.x, lat: start.lat + e.y };
    } else {
      // 東の空間IDと交わる場合
      const e = vector.multiple(corner.x / vector.x);
      next = { lng: start.lng + e.x, lat: start.lat + e.y };
    }
  } else if (vector.y > 0) {
    //  北もしくは東の空間IDと交わる場合
    let box = startSpace.boundingBox()[3];
    let corner = new Vector(box.lng - start.lng, box.lat - start.lat);
    if (vector.x == 0) {
      // 直上に終点がある場合は北の空間IDと交わる
      box = startSpace.move({ y: -1 }).center;
      next = { lng: start.lng, lat: box.lat };
      return {
        id: startSpace.id,
        next: getLinkedList({ start: next, end: end }),
      };
    } else if (corner.size == 0) {
      // バウンディングボックスの北東の位置が始点の場合は北東の空間IDと交わる
      next = { lng: box.lng, lat: box.lat };
      return {
        id: startSpace.id,
        next: getLinkedList({ start: next, end: end }),
      };
    } else if (corner.x == 0) {
      // 東の空間IDとの接線上に始点がある場合は東の空間IDと交わる
      // 現在の空間IDを東の空間IDに変更して、後続の判定をする
      box = startSpace.move({ x: 1 }).boundingBox()[3];
      corner = new Vector(box.lng - start.lng, box.lat - start.lat);
    } else if (corner.y == 0) {
      // 北の空間IDとの接線上に始点がある場合は北の空間IDと交わる
      // 現在の空間IDを北の空間IDに変更して、後続の判定をする
      box = startSpace.move({ y: -1 }).boundingBox()[3];
      corner = new Vector(box.lng - start.lng, box.lat - start.lat);
    }
    if (vector.size <= corner.size) {
      // （変更した空間IDが）終点のある空間IDと同一の場合
      next = { lng: start.lng + vector.x, lat: start.lat + vector.y };
    } else if (corner.y / corner.x > vector.y / vector.x) {
      // 東の空間IDと交わる場合
      const e = vector.multiple(corner.x / vector.x);
      next = { lng: start.lng + e.x, lat: start.lat + e.y };
    } else {
      // 北の空間IDと交わる場合
      const e = vector.multiple(corner.y / vector.y);
      next = { lng: start.lng + e.x, lat: start.lat + e.y };
    }
  }
  return {
    id: startSpace.id,
    next: getLinkedList({ start: next, end: end }),
  };
}

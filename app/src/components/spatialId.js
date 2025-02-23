import { Space } from '@spatial-id/javascript-sdk';

export class SpatialId {
  constructor({ lat, lng }) {
    this.zoom = 15;
    this.space = new Space({ lat, lng }, this.zoom);
  }

  get id() {
    return this.space.id;
  }
}

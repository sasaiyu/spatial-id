import { Space } from '@spatial-id/javascript-sdk';
import { Line2spatialId } from './spatialId.js';

test('1-1. the same start-end point returns the same spatialId', () => {
  const result = Line2spatialId([
    { lng: 139.767066, lat: 35.6813 },
    { lng: 139.767066, lat: 35.6813 },
  ]);
  expect(result).toHaveLength(1);
  expect(result).toContainEqual('244113223421334');

  const zfxy = result
    .map((id) => new Space(id, 15))
    .map((space) => space.zfxyStr);
  expect(zfxy).toContainEqual('/15/0/29105/12903');
});

test('1-2. the end point is north or south through spatialIds', () => {
  const result = Line2spatialId([
    { lng: 139.762573, lat: 35.679609 },
    { lng: 139.762573, lat: 35.697455 },
  ]);
  expect(result).toHaveLength(3);
  expect(result).toContainEqual('244113223421334');
  expect(result).toContainEqual('244113223421332');
  expect(result).toContainEqual('244113223421314');

  const zfxy = result
    .map((id) => new Space(id, 15))
    .map((space) => space.zfxyStr);
  expect(zfxy).toContainEqual('/15/0/29105/12903');
  expect(zfxy).toContainEqual('/15/0/29105/12902');
  expect(zfxy).toContainEqual('/15/0/29105/12901');
});

test('1-3. the end point is east or west through spatialIds', () => {
  const result = Line2spatialId([
    { lng: 139.762573, lat: 35.679609 },
    { lng: 139.784545, lat: 35.679609 },
  ]);
  expect(result).toHaveLength(3);
  expect(result).toContainEqual('244113223421334');
  expect(result).toContainEqual('244113223421343');
  expect(result).toContainEqual('244113223421344');

  const zfxy = result
    .map((id) => new Space(id, 15))
    .map((space) => space.zfxyStr);
  expect(zfxy).toContainEqual('/15/0/29105/12903');
  expect(zfxy).toContainEqual('/15/0/29106/12903');
  expect(zfxy).toContainEqual('/15/0/29107/12903');
});

test('1-4. the start-end point is cross through spatialIds', () => {
  const result = Line2spatialId([
    { lng: 139.762573, lat: 35.679609 },
    { lng: 139.784545, lat: 35.697455 },
  ]);
  expect(result).toHaveLength(5);
  expect(result).toContainEqual('244113223421334');
  expect(result).toContainEqual('244113223421343');
  expect(result).toContainEqual('244113223421341');
  expect(result).toContainEqual('244113223421342');
  expect(result).toContainEqual('244113223421324');

  const zfxy = result
    .map((id) => new Space(id, 15))
    .map((space) => space.zfxyStr);
  expect(zfxy).toContainEqual('/15/0/29105/12903');
  expect(zfxy).toContainEqual('/15/0/29106/12903');
  expect(zfxy).toContainEqual('/15/0/29106/12902');
  expect(zfxy).toContainEqual('/15/0/29107/12902');
  expect(zfxy).toContainEqual('/15/0/29107/12901');
});

test('1-5. the end point is cross through the same spatialId', () => {
  const result = Line2spatialId([
    { lng: 139.779052734375, lat: 35.692994632098795 },
    { lng: 139.76806640625, lat: 35.68407153314098 },
  ]);
  expect(result).toHaveLength(1);
  expect(result).toContainEqual('244113223421341');

  const zfxy = result
    .map((id) => new Space(id, 15))
    .map((space) => space.zfxyStr);
  expect(zfxy).toContainEqual('/15/0/29106/12902');
});

test('1-6. the start point is on the south size of the bounding box of the end point', () => {
  const result = Line2spatialId([
    { lng: 2.0001001184299105, lat: 1.9991059831233204 },
    { lng: 2.006, lat: 2.005 },
  ]);
  expect(result).toHaveLength(2);
  expect(result).toContainEqual('233333323223241');
  expect(result).toContainEqual('233333323223223');

  const zfxy = result
    .map((id) => new Space(id, 15))
    .map((space) => space.zfxyStr);
  expect(zfxy).toContainEqual('/15/0/16566/16202');
  expect(zfxy).toContainEqual('/15/0/16566/16201');
});

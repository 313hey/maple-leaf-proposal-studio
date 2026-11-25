import test from 'node:test';
import assert from 'node:assert/strict';
import {resolvePreviewEditLocation} from '../src/preview-edit.ts';

test('cover and overview preview content point to their existing overview controls',()=>{
 assert.deepEqual(resolvePreviewEditLocation('cover-title'),{section:'Overview',view:'cover',field:'title'});
 assert.deepEqual(resolvePreviewEditLocation('overview-summary'),{section:'Overview',view:'overview',field:'summary'});
});

test('itinerary preview targets preserve the correct zero-based day and activity field',()=>{
 assert.deepEqual(resolvePreviewEditLocation('itinerary:14:afternoon'),{section:'Daily itinerary',view:'itinerary',dayIndex:14,field:'afternoon'});
 assert.deepEqual(resolvePreviewEditLocation('itinerary:0:image'),{section:'Daily itinerary',view:'itinerary',dayIndex:0,field:'image'});
 assert.equal(resolvePreviewEditLocation('itinerary:2:breakfast'),null);
});

test('attraction preview targets preserve resource snapshot identity and field',()=>{
 assert.deepEqual(resolvePreviewEditLocation('attraction:local-id-42:description'),{section:'Attractions',view:'attractions',attractionId:'local-id-42',field:'description'});
 assert.equal(resolvePreviewEditLocation('attraction::image'),null);
 assert.equal(resolvePreviewEditLocation('unknown-target'),null);
});

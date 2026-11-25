export type PreviewEditLocation = {
  section: 'Overview' | 'Daily itinerary' | 'Attractions';
  view: 'cover' | 'overview' | 'itinerary' | 'program' | 'attractions';
  dayIndex?: number;
  attractionId?: string;
  field: string;
};

/** Maps stable preview target keys to the existing editor locations. */
export function resolvePreviewEditLocation(key: string): PreviewEditLocation | null {
  if (key === 'cover-title') return { section: 'Overview', view: 'cover', field: 'title' };
  if (key === 'cover-subtitle') return { section: 'Overview', view: 'cover', field: 'subtitle' };
  if (key === 'cover-image') return { section: 'Overview', view: 'cover', field: 'cover-image' };
  if (key === 'overview-headline') return { section: 'Overview', view: 'overview', field: 'overview-headline' };
  if (key === 'overview-summary') return { section: 'Overview', view: 'overview', field: 'summary' };
  if (key === 'overview-image') return { section: 'Overview', view: 'overview', field: 'overview-image' };
  const itinerary = /^itinerary:(\d+):(title|morning|afternoon|evening|image)$/.exec(key);
  if (itinerary) return { section: 'Daily itinerary', view: 'itinerary', dayIndex: Number(itinerary[1]), field: itinerary[2] };
  const attraction = /^attraction:(.+):(name|description|image|highlights)$/.exec(key);
  if (attraction) return { section: 'Attractions', view: 'attractions', attractionId: attraction[1], field: attraction[2] };
  return null;
}

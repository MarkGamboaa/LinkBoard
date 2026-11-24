export const BOARD_TEMPLATES = [
  {
    id: 'blank',
    title: 'Blank board',
    description: 'Start with an empty board.',
    links: [],
  },
  {
    id: 'job-search',
    title: 'Job Search',
    description: 'Keep applications, portfolio resources, and interview prep together.',
    links: [
      { title: 'LinkedIn Jobs', url: 'https://www.linkedin.com/jobs/', tags: ['jobs', 'applications'], note: 'Search roles and track applications.' },
      { title: 'GitHub', url: 'https://github.com/', tags: ['portfolio', 'projects'], note: 'Keep your code and portfolio projects ready to share.' },
    ],
  },
  {
    id: 'travel',
    title: 'Travel Plans',
    description: 'Collect destinations, maps, and trip details.',
    links: [
      { title: 'Google Maps', url: 'https://maps.google.com/', tags: ['maps', 'places'], note: 'Save places and build a route.' },
      { title: 'Google Flights', url: 'https://www.google.com/travel/flights', tags: ['flights', 'booking'], note: 'Compare flight options.' },
      { title: 'Tripadvisor', url: 'https://www.tripadvisor.com/', tags: ['activities', 'reviews'], note: 'Find activities and traveler reviews.' },
    ],
  },
  {
    id: 'learning',
    title: 'Learning Roadmap',
    description: 'Save lessons and practice resources for a new skill.',
    links: [
      { title: 'Developer Roadmaps', url: 'https://roadmap.sh/', tags: ['roadmap', 'planning'], note: 'Choose a learning path and track topics to explore.' },
      { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/', tags: ['documentation', 'web'], note: 'Use as a reference while studying web development.' },
      { title: 'freeCodeCamp', url: 'https://www.freecodecamp.org/learn/', tags: ['practice', 'courses'], note: 'Practice with hands-on lessons.' },
    ],
  },
];

export type BookglowBuildInfo = {
  name: string;
  commit: string;
  built: string;
  density: string;
};

const fallback: BookglowBuildInfo = {
  name: 'BookGlow frontend',
  commit: 'dev',
  built: 'local',
  density: 'v4',
};

export const BOOKGLOW_BUILD: BookglowBuildInfo =
  typeof __BOOKGLOW_BUILD__ === 'undefined' ? fallback : __BOOKGLOW_BUILD__;

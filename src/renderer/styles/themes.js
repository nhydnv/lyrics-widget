const theme = (name, textPrimary, textSecondary, background) => ({
  name,
  'text-primary': textPrimary,
  'text-secondary': textSecondary,
  background,
});

export const THEMES = {
  dark: theme(
    'Dark', 
    'white', 
    '#a0a0a0', 
    '#121212'
  ),
  light: theme(
    'Light', 
    '#191919', 
    '#797979', 
    'white'
  ),
  rocky: theme(
    'Rocky Road',
    '#ffe8bf', 
    '#cd925e', 
    '#1c0904'),
  olive: theme(
    'Olive',
    '#cbd628',
    '#957a29',
    '#330312'
  ),
  strawberry: theme(
    'Strawberry Daiquiri',
    '#ed254b',
    '#bf0c2d',
    '#011936',
  ),
  blueberry: theme(
    'Blueberry Cheesecake',
    '#0d3b66',
    '#356c9f',
    '#faf0ca',
  ),
  pine: theme(
    'Pines',
    '#f9eed0',
    '#d4d1a0',
    '#1d6c5c',
  ),
  berry: theme(
    'Berry',
    '#70020f',
    '#b73241',
    '#ffdee2',
  ),
  lavender: theme(
    'Lavender',
    '#f8f4ff',
    '#d9c8f5ff',
    '#a599c9',
  ),
  album: theme(
    'Album Cover',
    'white',
    '#ffffffcc',
    'white',
  ),
}
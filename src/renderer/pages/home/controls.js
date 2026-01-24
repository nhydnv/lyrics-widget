import { FONTS } from '../../styles/fonts.js';
import { THEMES } from '../../styles/themes.js';

const CONTROLS = {
  font: {
    element: document.getElementById('font-controls'),
    default: 'epilogue',
    active: false,
  },
  theme: {
    element: document.getElementById('theme-controls'),
    default: 'dark',
    active: false,
  },
  opacity: {
    element: document.getElementById('opacity-controls'),
    default: 0.9,
    active: false,
  },
  playback: {
    element: document.getElementById('playback-controls'),
    active: true,  // Default active control at startup
  }
};

const homePage = document.getElementById('home-page');

class Control {
  constructor(type) {
    if (new.target === Control) {
      throw new Error('Cannot instantiate abstract class Control');
    }
    this.type = type;
  }
  createUI() {
    throw new Error("createUI() must be implemented");
  }
  async applySelection(id) {
    throw new Error("applySelection() must be implemented");
  }
  display() {
    Object.keys(CONTROLS).forEach(c => {
    CONTROLS[c]['element'].style.display = 'none';
    });
    CONTROLS[this.type]['element'].style.display = 'flex';
    const actionBar = document.getElementById('action-bar');
    if (this.type === 'playback') {
      actionBar.style.visibility = 'visible';
    } else {
      actionBar.style.visibility = 'hidden';
    }
  }
}

class FontControl extends Control {
  constructor() {
    super('font');
  }
  createUI() {
    const fontBar = CONTROLS['font']['element'];
    Object.keys(FONTS).forEach(f => {
      const fontBtn = document.createElement('button');
      fontBtn.textContent = 'Aa';
      fontBtn.classList.add('font-btn', `font-${f}`);
      fontBtn.title = FONTS[f]['name'];
      fontBtn.id = f;
      if (f === getSelected('font')) {
        fontBtn.classList.add('underline');  // Indicate currently selected font
      }
      fontBar.appendChild(fontBtn);
    });
  }

  async applySelection(fontId) {
    // Transform to a CSS-syntax font stack first
    const fontStack = FONTS[fontId]['family'].map(f => `"${f}"`).join(', ');
    homePage.style.setProperty('--font', fontStack);
    setSelected('font', fontId);
  }
}

class ThemeControl extends Control {
  #coverUrl = '';
  #editOpacityIcon = document.querySelector('opacity-button');
  #logOutIcon = document.querySelector('log-out-button');
  #reloadBtn = document.querySelector('reload-button');
   
  constructor() {
    super('theme');
  }

  createUI() {
    const themeBar = CONTROLS['theme']['element'];
    Object.keys(THEMES).forEach(t => {
      const themeBtn = document.createElement('button');

      const themeIcon = document.createElement('theme-button');
      themeIcon.setFill(THEMES[t]['background']);
      themeIcon.setStroke(THEMES[t]['text-primary']);
      themeBtn.appendChild(themeIcon);

      themeBtn.classList.add('theme-btn');
      themeBtn.title = THEMES[t].name;
      themeBtn.id = t;

      themeBar.appendChild(themeBtn);
    });
  }

  async applySelection(themeId) {
    homePage.style.setProperty('--theme-text-primary', THEMES[themeId]['text-primary']);
    homePage.style.setProperty('--theme-text-secondary', THEMES[themeId]['text-secondary']);

    // Make the edit theme button match the currently selected theme
    const editThemeIcon = document.querySelector('theme-button');
    editThemeIcon.setFill(THEMES[themeId]['background']);
    editThemeIcon.setStroke(THEMES[themeId]['text-primary']);

    // Apply theme to edit opacity button
    this.#editOpacityIcon.setStroke(THEMES[themeId]['text-primary']);

    // Apply theme to log out button
    this.#logOutIcon.setFill(THEMES[themeId]['text-secondary']);

    // Apply theme to reload button
    this.#reloadBtn.setFill(THEMES[themeId]['text-secondary']);

    // Album theme sets the background image to the album's cover art
    if (themeId === 'album') {
      // If there is no song playing, keep the current theme or switch to default theme
      if (this.#coverUrl === '') { 
        this.applySelection(getSelected('theme') === 'album' ? 'dark' : getSelected('theme'));
        setSelected('theme', 'album');
        return;
      }
      homePage.style.setProperty('--theme-background-image', `url(${this.#coverUrl})`);

      // Text shadow to make lyrics more readable with the background image
      document.getElementById('overlay').style.visibility = 'visible';
      setSelected('theme', themeId);
      return;
    }
    homePage.style.setProperty('--theme-background-image', 'none');
    homePage.style.setProperty('--theme-background-color', THEMES[themeId].background);
    document.getElementById('overlay').style.visibility = 'hidden';  // Hide text shadow
    setSelected('theme', themeId);
  }

  setCoverUrl(url) {
    this.#coverUrl = url;
  }
}

class OpacityControl extends Control {
  constructor() {
    super('opacity');
  }

  createUI() { 
    return; 
  }

  applySelection(value) {
    document.documentElement.style.setProperty(
      '--background-opacity', value);
    setSelected('opacity', value);
  }
}

class PlaybackControl extends Control {
  constructor() {
    super('playback');
  }
  createUI() { 
    document.getElementById('opacity-slider').value = getSelected('opacity') * 100;
  }
  applySelection(id) { return; }
}

const getSelected = (type) => {
  const stored = window.localStorage.getItem(type);
  if (stored !== null) {
    return type === 'opacity' ? parseFloat(stored) : stored;
  }
  return CONTROLS[type]['default'];
}

const setSelected = (type, value) => {
  window.localStorage.setItem(type, value);
}

export {
  CONTROLS,
  Control,
  FontControl,
  ThemeControl,
  OpacityControl,
  PlaybackControl,
  getSelected,
};
import { currentToken } from './../authorization.js';
import { navigateTo } from '../router.js';
import { FONTS } from '../styles/fonts.js';
import { THEMES } from '../styles/themes.js';

const homePage = document.getElementById('home-page');

let halted = false;

let previousTrack = "";
let lyrics;
let startTimes = [];

let lyricsIntervalId;
const LYRICS_INTERVAL_MS = 500;
const songInfo = document.getElementById('song-info');
const lyricPrev = document.getElementById('lyric-prev');
const lyricMain = document.getElementById('lyric-main');
const lyricNext = document.getElementById('lyric-next');
const infoMsg = document.getElementById('info-msg');
let isUnsynced = false;

// Playback controls logic
let isPlaying = false;
let playbackModified = true;  // Flag if user modified playback using in-app controls (as opposed to Spotify's)
let hasPremium = true;
const playbackBtns = document.querySelectorAll('.playback-btn');
const playPauseBtn = document.getElementById('play-pause');
const SKIP_MS = 5000;  // Milliseconds to fast forward / backward

// Progress bar logic
const progressBar = document.getElementById('progress-bar');
const PROGRESS_BAR_WIDTH = document.getElementById('home-page').offsetWidth;
let trackProgressMs = 0;     // Current track progress
let playbackProgressMs = 0;  // Overall playback progress
let trackDurationMs = 0;     // Track duration
let progressId = null;

const logOutBtn = document.getElementById('log-out-btn');

// Controls bar (font, theme, playback)
const controls = {
  font: {
    element: document.getElementById('font-controls'),
    bits: 1 << 0,
    selected: window.localStorage.getItem('font') || 'epilogue', 
  },
  theme: {
    element: document.getElementById('theme-controls'),
    bits: 1 << 1,
    selected: window.localStorage.getItem('theme') || 'dark',
  },
  opacity: {
    element: document.getElementById('opacity-controls'),
    bits: 1 << 2,
  },
  playback: {
    element: document.getElementById('playback-controls'),
    bits: 1 << 3,  // ALWAYS THE FIRST BIT
  }
};

const opacitySlider = document.getElementById('opacity-slider');

// Bit flag indicating which control mode user is in
let isEditing = 0;
isEditing |= controls.playback.bits;  // User is in playback controls at page load

const main = async () => {
  setFont(controls['font']['selected']);
  setTheme(controls['theme']['selected']);

  createFontButtons();
  createThemeButtons();

  if (!currentToken.access_token) { 
    fail();
    return;
  }

  // Disable playback controls if user does not have Spotify Premium
  const sub = await getSubscription();
  if (!sub || sub !== 'premium') {
    disablePlayback();
    hasPremium = false;``
  }

  // Loading "animation" while Puppeteer opens the web player
  let count = 0;
  const intervalId = setInterval(() => {
    lyricMain.textContent = 'Connecting to Spotify' + '.'.repeat(count % 4);
    ++count;
  }, 500);

  disablePlayback();                     // Disable playback buttons until web player is opened
  await window.spotify.openWebPlayer();  // Open web player
  clearInterval(intervalId);             // Stop loading animation
  enablePlayback();                      // Re-enable playback buttons

  lyricsIntervalId = setInterval(displayLyrics, LYRICS_INTERVAL_MS);  // Poll every 500ms to detect song changes

  // Play/pause button logic
  playPauseBtn.addEventListener('click', async () => {
    playbackModified = true;
    isPlaying = !isPlaying;
    if (!isPlaying) {
      playPauseBtn.innerHTML ='<play-button />';
      playPauseBtn.title = 'Play';
      await invoke(window.api.pausePlayback(currentToken.access_token));
    } else {
      playPauseBtn.title = 'Pause';
      playPauseBtn.innerHTML ='<pause-button />';
      await invoke(window.api.startPlayback(currentToken.access_token));
    }
  });

  // Skip to previous track
  const prevTrackBtn = document.getElementById('prev-track');
  prevTrackBtn.addEventListener('click', async () => {
    await invoke(window.api.skipToPrevious(currentToken.access_token));
    displayLyrics();
  });

  // Skip to next track
  const nextTrackBtn = document.getElementById('next-track');
  nextTrackBtn.addEventListener('click', async () => {
    await invoke(window.api.skipToNext(currentToken.access_token));
    displayLyrics();
  });

  // Rewind
  const rewindBtn = document.getElementById('rewind');
  rewindBtn.addEventListener('click', async () => {
    const response = await invoke(window.api.getPlaybackState(currentToken.access_token));
    if (!response) return;
    const state = response['data'];
    const pos = state['progress_ms'] - SKIP_MS;
    await invoke(window.api.seekToPosition(currentToken.access_token, Math.max(0, pos)));
  });

  // Fast forward
  const fastForwardBtn = document.getElementById('fast-forward');
  fastForwardBtn.addEventListener('click', async () => {
    const response = await invoke(window.api.getPlaybackState(currentToken.access_token));
    if (!response) return;
    const state = response['data'];
    const pos = state['progress_ms'] + SKIP_MS;
    await invoke(window.api.seekToPosition(currentToken.access_token, pos));
  });

  // Edit buttons in the settings bar
  const editBtns = document.querySelectorAll('.edit-btn');
  editBtns.forEach(btn => btn.addEventListener('click', () => {
    // e.g. 'theme' from 'edit-theme'
    const controlType = btn.id.slice(5);

    // Toggle the corresponding bit, set all other bits to 0
    isEditing ^= controls[controlType].bits;  // Toggle bit
    isEditing &= controls[controlType].bits;  // Set all other bits to 0
    if (isEditing & controls[controlType].bits) {
      displayControls(controlType);
      showSelected(controlType);
    } else {
      displayControls('playback');
      resetInfo();
    }
  }));

  // Log out button
  logOutBtn.addEventListener('click', () => {
    navigateTo('login');
    cleanUp();
  });

  // Opacity slider
  opacitySlider.addEventListener('input', () => {
    document.documentElement.style.setProperty(
      '--background-opacity', Number(opacitySlider.value) / 100);
    showSelected('opacity');
  });
};

const displayLyrics = async () => {  
  const response = await invoke(window.api.getPlaybackState(currentToken.access_token));
  if (!response) return;

  const state = response['data'];
  if (state && !state['device']['is_private_session']) {
    const trackName = state['item']['name'];
    const trackId = state['item']['id'];
    const artists = state['item']['artists'].map(artist => artist['name']);

    enablePlayback();     // Enable playback buttons
    syncProgress(state);  // Update progress bar

    // On playback change
    if (
      playbackModified ||                // Playback modified using in-app controls
      isPlaying !== state['is_playing']  // Playback modified using Spotify controls
    ) {
      onPlaybackChange(state);
    } 
    playbackModified = false;

    // On track change
    if (trackName !== previousTrack) {
      if (controls['theme']['selected'] === 'album') setTheme('album');
      lyrics = await window.spotify.getLyrics(trackId);
      if (lyrics) {
        // If lyrics are unsynced, distribute lyrics equally
        isUnsynced = (lyrics['lyrics']['syncType'] === 'UNSYNCED');
        if (isUnsynced) {
          startTimes = [];
          const len = lyrics['lyrics']['lines'].length;
          const step = Math.floor(state['item']['duration_ms'] / len);
          for (let i = 0; i < len; i++) {
            startTimes.push(i * step);
          }
        } else {
          startTimes = lyrics['lyrics']['lines'].map(line => line['startTimeMs']);
        }
      }
      resetInfo();  
      // e.g. "Now playing: Slippery People - Talking Heads";
      songInfo.textContent = `${trackName} - ${artists.join(', ')}`;
      clampSongWidth();
    }
    previousTrack = trackName;

    if (lyrics) {
      let lineIndex = findLyricsPosition(startTimes, state['progress_ms']);
      lyricPrev.textContent = lineIndex > 0 ? lyrics['lyrics']['lines'][lineIndex - 1]['words'] : '';
      lyricMain.textContent = lineIndex !== -1 ? lyrics['lyrics']['lines'][lineIndex]['words'] : `\u{266A}`;
      lyricNext.textContent = lineIndex < lyrics['lyrics']['lines'].length - 1 ? 
                              lyrics['lyrics']['lines'][lineIndex + 1]['words'] : ``;
      clampLyricHeight();
    } else { 
      // No lyrics available
      lyricPrev.textContent = 'No lyrics available for this track.';
      lyricMain.textContent = '\u{266A}'; 
      lyricNext.textContent = '';
    }
  } else {
    disablePlayback();
    // 204 No Content: No song playing or try relaunching Spotify app
    songInfo.textContent = '-';
    clampSongWidth();
    lyricPrev.textContent = '';
    if (state) lyricMain.textContent = 'Disable private listening and relaunch the app to see lyrics.';
    else lyricMain.textContent = '\u{266A} Start playing something \u{266A}';
    lyricNext.textContent = '';
  }
};

// Find the lyrics position the user is currently at using a binary search approach
const findLyricsPosition = (startTimes, currentTime) => {
  let pos = -1;
  let lo = 0;
  let hi = startTimes.length - 1;
  while (lo <= hi) {
    let mid = Math.floor((lo + hi) / 2);
    if (currentTime < startTimes[mid]) { 
      hi = mid - 1; 
    }
    else if (currentTime > startTimes[mid]) { 
      pos = mid;
      lo = mid + 1;
    }
    else return mid;
  }
  return pos;
}

// Limit main lyric line to 2 lines (equivalent to line-clamp: 2) with ellipsis truncation
const clampLyricHeight = () => {
  while (lyricMain.scrollHeight >= lyricMain.clientHeight + 4) {
    let words = lyricMain.textContent.split(' ');
    words = words.slice(0, -1);
    words[words.length - 1] += '...';
    lyricMain.textContent = words.join(' ');
  }
}

// Scrolling song title effect if song title's too long
const clampSongWidth = () => {
  const container = document.querySelector('#now-playing p');
  const scrollContainer = document.querySelector('.scroll-container');
  const songInfoDup = document.getElementById('song-info-duplicate');

  songInfoDup.textContent = '';

  if (container.scrollWidth > container.clientWidth) {
    scrollContainer.classList.add('scroll-x');

    songInfo.innerHTML += '&nbsp;'.repeat(10);
    songInfoDup.innerHTML = songInfo.innerHTML;
  } else {
    scrollContainer.classList.remove('scroll-x');
  }
};

const showInfo = (msg, fade=false) => {
  infoMsg.textContent = msg;
  if (fade) {
    infoMsg.classList.remove('fade-out');

    // Force repaint
    requestAnimationFrame(() => {
      infoMsg.classList.add('fade-out');
    });

    infoMsg.classList.remove('fade-out');
  } else {
    infoMsg.classList.remove('fade-out');
  }
}

const resetInfo = () => { 
  // Check which editing mode user is in and show currently selected option for that mode
  for (const c of Object.keys(controls)) {
    if (isEditing & controls[c].bits) {
      showSelected(c);
      return;
    }
  }
  showInfo(isUnsynced ? "Lyrics aren't synced to the track yet." : "");
}

// Get user's Spotify subscription
const getSubscription = async () => {
  const user = await invoke(window.api.getCurrentUser(currentToken.access_token));
  if (!user) return null;
  return user['data']['product'];
}

const onPlaybackChange = (state) => {
  // Update isPlaying if playback modified using Spotify controls
  if (!playbackModified) isPlaying = state['is_playing'];
  if (isPlaying) {
    playPauseBtn.innerHTML = '<pause-button />';
    playPauseBtn.title = 'Pause';
    startProgress();
  } else {
    playPauseBtn.innerHTML = '<play-button />';
    playPauseBtn.title = 'Play';
    stopProgress();
  }
};

// Playback buttons enable/disable
const enablePlayback = () => { 
  if (hasPremium) playbackBtns.forEach(btn => btn.disabled = false);
};

const disablePlayback = () => playbackBtns.forEach(btn => btn.disabled = true);

// Sync progress every LYRICS_INTERVAL_MS, otherwise estimate progress
const syncProgress = (state) => {
  trackProgressMs = state['progress_ms'];
  playbackProgressMs = performance.now();
  trackDurationMs = state['item']['duration_ms'];
};

const renderProgress = () => {
  if (!isPlaying) return;  // Safeguard

  // Estimate progress
  const elapsed = performance.now() - playbackProgressMs;  
  const currentMs = trackProgressMs + elapsed;
  progressBar.style.width = `${Math.min(currentMs / trackDurationMs, 1) * PROGRESS_BAR_WIDTH}px`;

  progressId = requestAnimationFrame(renderProgress);
};

const startProgress = () => {
  cancelAnimationFrame(progressId);
  progressId = requestAnimationFrame(renderProgress);
};

const stopProgress = () => cancelAnimationFrame(progressId);

const displayControls = (control) => {
  Object.keys(controls).forEach(c => {
    controls[c]['element'].style.display = 'none';
  });
  controls[control]['element'].style.display = 'flex';
  if (control === 'playback') {
    logOutBtn.style.visibility = 'visible';
  } else {
    logOutBtn.style.visibility = 'hidden';
  }
};

const createFontButtons = () => {
  const fontBar = controls['font']['element'];
  Object.keys(FONTS).forEach(f => {
    const fontBtn = document.createElement('button');
    fontBtn.textContent = 'Aa';
    fontBtn.classList.add('font-btn', `font-${f}`);
    fontBtn.title = FONTS[f]['family'];
    fontBtn.id = f;
    if (f === controls['font']['selected']) {
      fontBtn.classList.add('underline');  // Indicate currently selected font
    }
    fontBtn.addEventListener('click', () => {
      if (f !== controls['font']['selected']) {
        document.getElementById(controls['font']['selected']).classList.remove('underline');
        fontBtn.classList.add('underline');
        setFont(f);
        showInfo('Font change applied !', true);
        setTimeout(() => showSelected('font'), 2000);
      }
      window.localStorage.setItem('font', f);
    });
    fontBtn.addEventListener('mouseenter', () => {
      showSelected('font', f);
      setFont(f);
    });
    fontBtn.addEventListener('mouseleave', () => {
      showSelected('font');
      setFont(controls['font']['selected']);
    });
    fontBar.appendChild(fontBtn);
  });
};

const setFont = (fontId) => {
  // Transform to a CSS-syntax font stack first
  const fontStack = FONTS[fontId]['family'].map(f => `"${f}"`).join(', ');
  homePage.style.setProperty('--font', fontStack);
  controls['font']['selected'] = fontId;
};

const showSelected = (type, selected) => {
  // Do not show selected info if user is not in editing mode
  if (!(isEditing & controls[type].bits) || type === 'playback') return;
  if (!selected) selected = controls[type]['selected'];
  if (type === 'font') {
    showInfo(`Selected font: ${FONTS[selected]['name']}`);
  } else if (type === 'theme') {
    showInfo(`Selected theme: ${THEMES[selected]['name']}`);
  } else if (type === 'opacity') {
    showInfo(`Opacity: ${opacitySlider.value}%`)
  }
}

const createThemeButtons = () => {
  const themeBar = controls['theme']['element'];
  Object.keys(THEMES).forEach(t => {
    const themeBtn = document.createElement('button');

    const themeIcon = document.createElement('theme-button');
    themeIcon.setFill(THEMES[t]['background']);
    themeIcon.setStroke(THEMES[t]['text-primary']);
    themeBtn.appendChild(themeIcon);

    themeBtn.classList.add('theme-btn');
    themeBtn.title = THEMES[t].name;
    themeBtn.id = t;

    themeBtn.addEventListener('click', () => {
      setTheme(t);
      window.localStorage.setItem('theme', t);
      showSelected('theme');
    });

    themeBar.appendChild(themeBtn);
  });
}

const setTheme = async (themeId) => {  
  homePage.style.setProperty('--theme-text-primary', THEMES[themeId]['text-primary']);
  homePage.style.setProperty('--theme-text-secondary', THEMES[themeId]['text-secondary']);

  // Make the edit theme button match the currently selected theme
  const editThemeIcon = document.querySelector('theme-button');
  editThemeIcon.setFill(THEMES[themeId]['background']);
  editThemeIcon.setStroke(THEMES[themeId]['text-primary']);

  // Apply theme to edit opacity button
  const editOpacityIcon = document.querySelector('opacity-button');
  editOpacityIcon.setStroke(THEMES[themeId]['text-primary']);

  // Apply theme to log out button
  const logOutIcon = document.querySelector('log-out-button');
  logOutIcon.setFill(THEMES[themeId]['text-secondary']);

  // Album theme sets the background image to the album's cover art
  if (themeId === 'album') {
    const response = await invoke(window.api.getPlaybackState(currentToken.access_token));
    if (!response) return;
    const state = response['data'];
    // If there is no song playing, keep the current theme or switch to default theme
    if (!state) { 
      setTheme(controls['theme']['selected'] === 'album' ? 'dark' : controls['theme']['selected']);
      return;
    }
    const imageUrl = state['item']['album']['images'][0]['url'];
    homePage.style.setProperty('--theme-background-image', `url(${imageUrl})`);

    // Text shadow to make lyrics more readable with the background image
    document.getElementById('overlay').style.visibility = 'visible';
    controls['theme']['selected'] = themeId;
    return;
  }
  homePage.style.setProperty('--theme-background-image', 'none');
  homePage.style.setProperty('--theme-background-color', THEMES[themeId].background);
  document.getElementById('overlay').style.visibility = 'hidden';  // Hide text shadow
  controls['theme']['selected'] = themeId;
}

const invoke = async (promise) => {
  if (halted) return null;

  const response = await promise;
  if (!response?.ok) {
    fail();
    return null;
  } else {
    return response;
  }
};

const fail = () => {
  if (halted) return;
  halted = true;
  navigateTo('error', { reload:false, cache:false });

  // Cleanup
  cleanUp();
}

const cleanUp = () => {
  // Clear intervals
  if (lyricsIntervalId) clearInterval(lyricsIntervalId);
  stopProgress();

  // Remove all event listeners by cloning the nodes
  const nodes = [
    ...playbackBtns,
    ...document.querySelectorAll('.edit-btn'),
    ...document.querySelectorAll('.font-btn'),
    ...document.querySelectorAll('.theme-btn'),
    logOutBtn,
    opacitySlider,
  ];
  nodes.forEach(node => {
    node.replaceWith(node.cloneNode(true));
  });
}

main();
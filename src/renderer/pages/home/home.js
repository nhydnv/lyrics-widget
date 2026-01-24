import { currentToken, startRefreshToken } from '../../authorization.js';
import { navigateTo } from '../../router.js';
import { FONTS } from '../../styles/fonts.js';
import { THEMES } from '../../styles/themes.js';
import { createTrack, updateLyrics } from './track.js';
import {
  CONTROLS,
  FontControl,
  ThemeControl,
  OpacityControl,
  getSelected,
  PlaybackControl,
} from './controls.js';

let halted = false;

let currentTrack = createTrack();

let lyricsIntervalId;
const LYRICS_INTERVAL_MS = 500;
const songInfo = document.getElementById('song-info');
const lyricPrev = document.getElementById('lyric-prev');
const lyricMain = document.getElementById('lyric-main');
const lyricNext = document.getElementById('lyric-next');
const infoMsg = document.getElementById('info-msg');

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
let progressId = null;

const controlObjs = {
  'font': new FontControl(),
  'theme': new ThemeControl(),
  'opacity': new OpacityControl(),
  'playback': new PlaybackControl(),
}

const main = async () => {
  window.controls.setAlwaysOnTop(true);

  // Wire log out button first so users can log out without waiting for web player to be connected
  const logOutBtn = document.getElementById('log-out-btn');
  logOutBtn.addEventListener('click', () => {
    navigateTo('login');
    cleanUp();
  });

  const reloadBtn = document.getElementById('reload-btn');
  reloadBtn.addEventListener('click', () => window.location.reload());

  const cornerBtn = document.getElementById('corner-btn');
  cornerBtn.addEventListener('click', () => window.controls.moveToBottomRight());

  Object.keys(controlObjs).forEach(c => {
    controlObjs[c].applySelection(getSelected(c));
    controlObjs[c].createUI();
  });

  if (!currentToken.access_token) { 
    fail();
    return;
  }
  startRefreshToken();

  // Disable playback controls if user does not have Spotify Premium
  const sub = await getSubscription();
  if (!sub || sub !== 'premium') {
    disablePlayback();
    hasPremium = false;
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

    // Toggle the corresponding control type, disable all other
    Object.keys(CONTROLS).forEach(c => {
      if (c === controlType) {
        // Toggle
        CONTROLS[controlType]['active'] = !CONTROLS[controlType]['active']; 
      } else {
        // Disable everything else
        CONTROLS[c]['active'] = false;  
      }
    });

    if (CONTROLS[controlType]['active']) {
      controlObjs[controlType].display();
      showSelected(controlType);
    } else {
      controlObjs['playback'].display();
      resetInfo();
    }
  }));


  // Font options
  const fontBtns = document.querySelectorAll('.font-btn');
  fontBtns.forEach(fontBtn => {
    const control = controlObjs['font'];
    const f = fontBtn.id;
    fontBtn.addEventListener('click', () => {
      if (f !== getSelected('font')) {
        document.getElementById(getSelected('font')).classList.remove('underline');
        fontBtn.classList.add('underline');
        control.applySelection(f);
        showInfo('Font change applied !', true);
        setTimeout(() => showSelected('font'), 2000);
      }
    });
    fontBtn.addEventListener('mouseenter', () => {
      showSelected('font', f);
      control.applySelection(f);
    });
    fontBtn.addEventListener('mouseleave', () => {
      showSelected('font');
      control.applySelection(getSelected('font'));
    });
  });

  // Theme options
  const themeBtns = document.querySelectorAll('.theme-btn');
  themeBtns.forEach(themeBtn => {
    const control = controlObjs['theme'];
    themeBtn.addEventListener('click', () => {
      control.applySelection(themeBtn.id);
      showSelected('theme');
    });
  });

  // Opacity slider
  const opacitySlider = document.getElementById('opacity-slider');
  opacitySlider.addEventListener('input', () => {
    controlObjs['opacity'].applySelection(Number(opacitySlider.value) / 100);
    showSelected('opacity');
  });

  // Progress bar
  const progressHitbox = document.getElementById('progress-hitbox');
  progressHitbox.addEventListener('click', (event) => {
    if (!progressHitbox.classList.contains('enabled')) return;

    // Temporarily stop animation immediately
    stopProgress();

    const mouseX = event.clientX;  // Mouse position relative to the viewport
    const pos = Math.round((mouseX / PROGRESS_BAR_WIDTH) * currentTrack.duration);
    invoke(window.api.seekToPosition(currentToken.access_token, pos));

    // Sync progress and force manual repaint for a smooth progress bar
    syncProgress(pos);
    progressBar.style.width = `${Math.min(pos / currentTrack.duration, 1) * PROGRESS_BAR_WIDTH}px`

    setTimeout(startProgress, 1000);
  });
};

const displayLyrics = async () => {  
  const response = await invoke(window.api.getPlaybackState(currentToken.access_token));
  if (!response) return;

  const state = response['data'];
  const track = createTrack(state);
  if (state && !state['device']['is_private_session']) {
    enablePlayback();     // Enable playback buttons
    syncProgress(state['progress_ms']);  // Update progress bar

    // On playback change
    if (
      playbackModified ||                // Playback modified using in-app controls
      isPlaying !== state['is_playing']  // Playback modified using Spotify controls
    ) {
      onPlaybackChange(state);
    } 
    playbackModified = false;

    // On track change
    if (track.id !== currentTrack.id) {      
      // Set new album cover
      controlObjs['theme'].setCoverUrl(track.coverUrl);
      if (getSelected('theme') === 'album') {
        controlObjs['theme'].applySelection('album');
      }

      // Fetch new lyrics
      const lyrics = await window.spotify.getLyrics(track.id);
      // Update track's lyrics and compute startTimes
      updateLyrics(track, lyrics);
      resetInfo();  
      // e.g. "Now playing: Slippery People - Talking Heads";
      songInfo.textContent = `${track.name} - ${track.artists.join(', ')}`;
      clampSongWidth();

      currentTrack = track;
    }

    if (currentTrack.lyrics) {
      let lineIndex = findLyricsPosition(currentTrack.startTimes, state['progress_ms']);
      lyricPrev.textContent = lineIndex > 0 ? currentTrack.lyrics['lyrics']['lines'][lineIndex - 1]['words'] : '';
      lyricMain.textContent = lineIndex !== -1 ? currentTrack.lyrics['lyrics']['lines'][lineIndex]['words'] : `\u{266A}`;
      lyricNext.textContent = lineIndex < currentTrack.lyrics['lyrics']['lines'].length - 1 ? 
                              currentTrack.lyrics['lyrics']['lines'][lineIndex + 1]['words'] : ``;
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
    currentTrack = createTrack();
    songInfo.textContent = '-';
    clampSongWidth();
    
    // Lyrics
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
  for (const c of Object.keys(CONTROLS)) {
    if (CONTROLS[c]['active']) {
      showSelected(c);
      return;
    }
  }
  showInfo(currentTrack.isUnsynced ? "Lyrics aren't synced to the track yet." : "");
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
  setProgressHitbox(true);
};

const disablePlayback = () => { 
  playbackBtns.forEach(btn => btn.disabled = true);
  setProgressHitbox(false);  // Prevent users from skipping to another position
}

const startProgress = () => {
  cancelAnimationFrame(progressId);
  progressId = requestAnimationFrame(renderProgress);
};

const stopProgress = () => cancelAnimationFrame(progressId);

// Sync progress every LYRICS_INTERVAL_MS, otherwise estimate progress
const syncProgress = (progress_ms) => {
  trackProgressMs = progress_ms;
  playbackProgressMs = performance.now();
};

const renderProgress = () => {
  if (!isPlaying) return;  // Safeguard

  // Estimate progress
  const elapsed = performance.now() - playbackProgressMs;  
  const currentMs = trackProgressMs + elapsed;
  progressBar.style.width = `${Math.min(currentMs / currentTrack.duration, 1) * PROGRESS_BAR_WIDTH}px`;

  progressId = requestAnimationFrame(renderProgress);
};

const setProgressHitbox = (enabled) => {
  if (enabled) { document.getElementById('progress-hitbox').classList.add('enabled'); }
  else { document.getElementById('progress-hitbox').classList.remove('enabled') };
}

const showSelected = (type, selected) => {
  // Do not show selected info if user is not in editing mode
  if (!(CONTROLS[type]['active']) || type === 'playback') return;
  if (!selected) selected = getSelected(type);
  if (type === 'font') {
    showInfo(`Selected font: ${FONTS[selected]['name']}`);
  } else if (type === 'theme') {
    showInfo(`Selected theme: ${THEMES[selected]['name']}`);
  } else if (type === 'opacity') {
    showInfo(`Opacity: ${Math.round(selected * 100)}%`)
  }
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
    document.getElementById('opacity-slider'),
    ...document.querySelectorAll('#action-bar button'),
  ];
  nodes.forEach(node => {
    node.replaceWith(node.cloneNode(true));
  });
}

main();
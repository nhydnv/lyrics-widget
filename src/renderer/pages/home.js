import { currentToken } from './../authorization.js';
import { navigateTo } from '../router.js';

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
const unsyncedMsg = document.getElementById('unsynced-msg');

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

const main = async () => {
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
      lyrics = await window.spotify.getLyrics(trackId);
      unsyncedMsg.style.display = 'none';
      if (lyrics) {
        // If lyrics are unsynced, distribute lyrics equally
        if (lyrics['lyrics']['syncType'] === 'UNSYNCED') {
          startTimes = [];
          const len = lyrics['lyrics']['lines'].length;
          const step = Math.floor(state['item']['duration_ms'] / len);
          for (let i = 0; i < len; i++) {
            startTimes.push(i * step);
          }
          unsyncedMsg.style.display = 'block';
        } else {
          startTimes = lyrics['lyrics']['lines'].map(line => line['startTimeMs']);
        }
      }
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
  // Clear intervals
  if (lyricsIntervalId) clearInterval(lyricsIntervalId);
  stopProgress();
  playbackBtns.forEach(btn => {
    // Remove all event listeners by cloning the nodes
    btn.replaceWith(btn.cloneNode(true)); 
  });
}

main();
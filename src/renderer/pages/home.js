import { currentToken } from './../authorization.js';

const songInfo = document.getElementById('song-info');
const lyricPrev = document.getElementById('lyric-prev');
const lyricMain = document.getElementById('lyric-main');
const lyricNext = document.getElementById('lyric-next');
const unsyncedMsg = document.getElementById('unsynced-msg');

let isPlaying = false;
// Flag if user modified playback using in-app controls (as opposed to Spotify's)
let playbackModified = true;  
let hasPremium = true;
const playPauseBtn = document.getElementById('play-pause');
const playbackBtns = document.querySelectorAll('.playback-btn');

// Check if user has Spotify Premium
if (!currentToken.access_token) { throw new Error('Access token required.'); }
const user = await window.api.getCurrentUser(currentToken.access_token);
console.log(user);
if (user['product'] !== 'premium') {
  disablePlayback();
  hasPremium = false;
}

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
}

// Playback buttons enable/disable
const enablePlayback = () => { 
  if (hasPremium) playbackBtns.forEach(btn => btn.disabled = false);
}
const disablePlayback = () => playbackBtns.forEach(btn => btn.disabled = true);


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

let previousTrack = "";
let lyrics;
let startTimes = [];

setInterval(async () => {
  const state = await window.api.getPlaybackState(currentToken.access_token);
  if (state) {
    enablePlayback();
    const trackName = state['item']['name'];
    const trackId = state['item']['id'];
    const artists = state['item']['artists'].map(artist => artist['name']);

    if (
      playbackModified ||               // Playback modified using in-app controls
      isPlaying !== state['is_playing']  // Playback modified using Spotify controls
    ) {
      // Update isPlaying if playback modified using Spotify controls
      if (!playbackModified) isPlaying = state['is_playing'];
      playPauseBtn.innerHTML = isPlaying ? '<pause-button />' : '<play-button />';
    } 
    playbackModified = false;

    // On track change
    if (trackName !== previousTrack) {
      lyrics = await window.spotify.getLyrics(trackId);
      unsyncedMsg.style.visibility = 'hidden';
      if (lyrics) {
        // If lyrics are unsynced, distribute lyrics equally
        if (lyrics['lyrics']['syncType'] === 'UNSYNCED') {
          startTimes = [];
          const len = lyrics['lyrics']['lines'].length;
          const step = Math.floor(state['item']['duration_ms'] / len);
          for (let i = 0; i < len; i++) {
            startTimes.push(i * step);
          }
          unsyncedMsg.style.visibility = 'visible';
        } else {
          startTimes = lyrics['lyrics']['lines'].map(line => line['startTimeMs']);
        }
      }
      // e.g. "Now playing: Slippery People - Talking Heads";
      songInfo.textContent = `${trackName} - ${artists.join(', ')}`;
      clampSongWidth();
    }
    previousTrack = trackName;

    console.log(lyrics);

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
    lyricMain.textContent = '\u{266A} Start playing something \u{266A}';
    lyricNext.textContent = '';
  }
}, 1000);  // Poll every second to detect song changes

// Play/pause button logic
playPauseBtn.addEventListener('click', async () => {
  playbackModified = true;
  isPlaying = !isPlaying;
  if (!isPlaying) {
    playPauseBtn.innerHTML ='<play-button />';
    await window.api.pausePlayback(currentToken.access_token);
  } else {
    playPauseBtn.innerHTML ='<pause-button />';
    await window.api.startPlayback(currentToken.access_token);
  }
});
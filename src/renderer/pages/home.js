import { currentToken } from './../authorization.js';

const songTitle = document.getElementById('song-title');
const songLyrics = document.getElementById('song-lyrics');

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

await window.spotify.openWebPlayer();

let previousTrack = "";
let lyrics;
let startTimes = [];

setInterval(async () => {
  if (!currentToken.access_token) { throw new Error('Access token required.'); }

  const state = await window.api.getPlaybackState(currentToken.access_token);
  if (state) {
    const trackName = state['item']['name'];
    const trackId = state['item']['id'];
    const artists = state['item']['artists'].map(artist => artist['name']);

    // On track change
    if (trackName !== previousTrack) {
      songTitle.textContent = trackName; 
      lyrics = await window.spotify.getLyrics(trackId);
      startTimes = lyrics['lyrics']['lines'].map(line => line['startTimeMs']);
    }
    previousTrack = trackName;

    if (lyrics) {
      let lineIndex = findLyricsPosition(startTimes, state['progress_ms']);
      songLyrics.textContent = lineIndex !== -1 ? lyrics['lyrics']['lines'][lineIndex]['words'] : `\u{266A}`;
    } else { songLyrics.textContent = "no lyrics :("; }

    if (state['is_playing']) {
    } else {
    }
  } else {
    // 204 No Content: Try relaunching Spotify app
    songTitle.textContent = 'Start playing sth (or try relaunching ur spotify app)';
  }
}, 1000);  // Poll every second to detect song changes
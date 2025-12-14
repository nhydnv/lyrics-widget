import { currentToken } from './../authorization.js';

const songTitle = document.getElementById('song-title');
const songLyrics = document.getElementById('song-lyrics');

await window.spotify.openWebPlayer();

let previousTrack = "";
let lineIndex = 0;
let lyrics;

// get name of the currenly playing track
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
      lineIndex = 0;
    }
    previousTrack = trackName;

    if (lyrics) {
      songLyrics.textContent = lyrics['lyrics']['lines'][lineIndex]['words'];
      if (state['progress_ms'] >= lyrics['lyrics']['lines'][lineIndex + 1]['startTimeMs']) {
        ++lineIndex;
      }
    } else { songLyrics.textContent = "no lyrics :("; }

    if (state['is_playing']) {
    } else {
    }
  } else {
    // 204 no content: try relaunching spotify app
    songTitle.textContent = 'Start playing sth (or try relaunching ur spotify app)';
  }
}, 1000);  // Poll every second to detect song changes
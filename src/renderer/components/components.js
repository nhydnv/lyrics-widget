class TitleBar extends HTMLElement {
  constructor() {
    super();
    // Create a shadow root
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './components/title-bar.css';

    const titleBar = document.createElement('div');
    titleBar.classList.add('title-bar');

    const minBtn = document.createElement('button');
    minBtn.id = 'min';
    minBtn.innerText = '-';
    minBtn.addEventListener("click", () => window.controls.minimizeWindow());

    const closeBtn = document.createElement('button');
    closeBtn.id = 'close';
    closeBtn.innerText = 'x';
    closeBtn.addEventListener("click", () => window.controls.closeWindow());

    titleBar.append(minBtn, closeBtn);
    this.shadowRoot.append(link, titleBar);
  }
}

class PlayIcon extends HTMLElement {
  constructor() {
    super();
    // Create a shadow root
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './components/playback-button.css';
    this.shadowRoot.append(link);
    this.shadowRoot.innerHTML += `
      <svg width="15" height="18" viewBox="0 0 15 18" fill="none" xmlns="http://www.w3.org/2000/svg" id="play-btn">
        <path d="M15 8.66025L0 17.3205L0 -6.67572e-06L15 8.66025Z" fill="currentColor"/>
      </svg>
    `;
  }
}

class PauseIcon extends HTMLElement {
  constructor() {
    super();
    // Create a shadow root
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './components/playback-button.css';
    this.shadowRoot.append(link);
    this.shadowRoot.innerHTML += `
      <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg" id="pause-btn">
        <rect width="6" height="16" fill="currentColor"/>
        <rect x="11" width="6" height="16" fill="currentColor"/>
      </svg>
    `;
  }
}

class ThemeIcon extends HTMLElement {
  static observedAttributes = ['fill', 'stroke'];

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  
  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.render();
  }

  setFill(color) {
    this.setAttribute('fill', color);
  }

  setStroke(color) {
    this.setAttribute('stroke', color);
  }

  render() {
    const fill = this.getAttribute('fill') || 'black';
    const stroke = this.getAttribute('stroke') || 'white';
    this.shadowRoot.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="5" cy="5" r="4.5" fill="${fill}" stroke="${stroke}"/>
      </svg>
    `;
  }
}

class CornerButton extends HTMLElement {
  #state = 0;
  #directions = [
    {
      name: 'bottom-right',
      arrow: `
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.70711 0.292893C1.31658 -0.0976311 0.683418 -0.0976311 0.292893 0.292893C-0.0976311 0.683418 -0.0976311 1.31658 0.292893 1.70711L1 1L1.70711 0.292893ZM1 1L0.292893 1.70711L7.29289 8.70711L8 8L8.70711 7.29289L1.70711 0.292893L1 1Z" fill="currentColor"/>
        <line x1="8" y1="2" x2="8" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M2 8L7.5 8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      `,
    },
    {
      name: 'bottom-left',
      arrow: `
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8.70711 1.70711C9.09763 1.31658 9.09763 0.683418 8.70711 0.292893C8.31658 -0.0976311 7.68342 -0.0976311 7.29289 0.292893L8 1L8.70711 1.70711ZM8 1L7.29289 0.292893L0.292893 7.29289L1 8L1.70711 8.70711L8.70711 1.70711L8 1Z" fill="currentColor"/>
        <line x1="7" y1="8" x2="1" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M1 2L1 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      `,
    },
    {
      name: 'top-left',
      arrow: `
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7.29289 8.70711C7.68342 9.09763 8.31658 9.09763 8.70711 8.70711C9.09763 8.31658 9.09763 7.68342 8.70711 7.29289L8 8L7.29289 8.70711ZM8 8L8.70711 7.29289L1.70711 0.292893L1 1L0.292893 1.70711L7.29289 8.70711L8 8Z" fill="currentColor"/>
        <line x1="1" y1="7" x2="1" y2="1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M7 1L1.5 1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      `,
    },
    {
      name: 'top-right',
      arrow: `
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0.292893 7.29289C-0.0976311 7.68342 -0.0976311 8.31658 0.292893 8.70711C0.683418 9.09763 1.31658 9.09763 1.70711 8.70711L1 8L0.292893 7.29289ZM1 8L1.70711 8.70711L8.70711 1.70711L8 1L7.29289 0.292893L0.292893 7.29289L1 8Z" fill="currentColor"/>
        <line x1="2" y1="1" x2="8" y2="1" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M8 7L8 1.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
      `,
    },
  ];

  constructor() {
    super();
  }

  connectedCallback() {
    const btn = document.createElement('button');
    btn.title = 'Move to corner';
    btn.id = 'corner-btn';
    btn.innerHTML = this.#directions[this.#state].arrow;
    btn.addEventListener('click', () => {
      window.controls.moveToCorner(this.#directions[this.#state].name);
      this.#state = (this.#state + 1) % 4;
      btn.innerHTML = this.#directions[this.#state].arrow;
    });
    this.appendChild(btn);
  }
}

customElements.define("title-bar", TitleBar);
customElements.define("play-icon", PlayIcon);
customElements.define("pause-icon", PauseIcon);
customElements.define("theme-icon", ThemeIcon);
customElements.define("corner-button", CornerButton);
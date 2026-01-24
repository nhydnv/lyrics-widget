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

class PlayButton extends HTMLElement {
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

class PauseButton extends HTMLElement {
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

class ThemeButton extends HTMLElement {
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

class OpacityButton extends HTMLElement {
  static observedAttributes = ['stroke'];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    this.render();
  }

  setStroke(color) {
    this.setAttribute('stroke', color);
  }

  render() {
    const stroke = this.getAttribute('stroke') || 'white';
    this.shadowRoot.innerHTML = `
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1.5318 8.7318L8.7318 1.5318M0.95 5.40477L5.40477 0.949999M4.55 9.00477L9.00477 4.55M2.3 9.5H7.7C8.69411 9.5 9.5 8.69411 9.5 7.7V2.3C9.5 1.30589 8.69411 0.5 7.7 0.5H2.3C1.30589 0.5 0.5 1.30589 0.5 2.3V7.7C0.5 8.69411 1.30589 9.5 2.3 9.5Z" stroke="${stroke}" stroke-linecap="round"/>
      </svg>
    `;
  }
}

class LogOutButton extends HTMLElement {
  static observedAttributes = ['fill'];

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

  render() {
    const fill = this.getAttribute('fill') || 'white';
    this.shadowRoot.innerHTML = `
      <svg width="13" height="10" viewBox="0 0 13 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.57435 4.78261C2.57435 4.54248 2.76644 4.34783 3.0034 4.34783H12.0136C12.2506 4.34783 12.4427 4.54248 12.4427 4.78261V5.21739C12.4427 5.45751 12.2506 5.65217 12.0136 5.65217H3.0034C2.76644 5.65217 2.57435 5.45751 2.57435 5.21739V4.78261Z" fill="${fill}"/>
        <path d="M10.0461 2.48135C10.2136 2.31156 10.4853 2.31156 10.6528 2.48135L12.8683 4.72639C13.0359 4.89619 13.0359 5.17148 12.8683 5.34127L12.5649 5.64871C12.3974 5.8185 12.1257 5.8185 11.9581 5.64871L9.74266 3.40366C9.5751 3.23387 9.5751 2.95858 9.74266 2.78879L10.0461 2.48135Z" fill="${fill}"/>
        <path d="M9.74266 7.29486C9.5751 7.12507 9.5751 6.84978 9.74266 6.67999L11.9642 4.42884C12.1317 4.25905 12.4034 4.25905 12.5709 4.42884L12.8743 4.73628C13.0419 4.90607 13.0419 5.18136 12.8743 5.35116L10.6528 7.6023C10.4853 7.77209 10.2136 7.77209 10.0461 7.6023L9.74266 7.29486Z" fill="${fill}"/>
        <path d="M0 0.434783C0 0.194659 0.192096 0 0.429058 0H7.72304C7.96 0 8.1521 0.194659 8.1521 0.434783V0.869565C8.1521 1.10969 7.96 1.30435 7.72304 1.30435H0.429058C0.192096 1.30435 0 1.10969 0 0.869565V0.434783Z" fill="${fill}"/>
        <path d="M0 9.13043C0 8.89031 0.192096 8.69565 0.429058 8.69565H7.72304C7.96 8.69565 8.1521 8.89031 8.1521 9.13043V9.56522C8.1521 9.80534 7.96 10 7.72304 10H0.429058C0.192096 10 0 9.80534 0 9.56522V9.13043Z" fill="${fill}"/>
        <path d="M6.86492 7.3913C6.86492 7.15118 7.05702 6.95652 7.29398 6.95652H7.72304C7.96 6.95652 8.1521 7.15118 8.1521 7.3913V9.56522C8.1521 9.80534 7.96 10 7.72304 10H7.29398C7.05702 10 6.86492 9.80534 6.86492 9.56522V7.3913Z" fill="${fill}"/>
        <path d="M6.86492 0.434783C6.86492 0.194659 7.05702 0 7.29398 0H7.72304C7.96 0 8.1521 0.194659 8.1521 0.434783V2.6087C8.1521 2.84882 7.96 3.04348 7.72304 3.04348H7.29398C7.05702 3.04348 6.86492 2.84882 6.86492 2.6087V0.434783Z" fill="${fill}"/>
        <path d="M0 1.30435C0 1.06422 0.192096 0.869565 0.429058 0.869565H0.858116C1.09508 0.869565 1.28717 1.06422 1.28717 1.30435V8.69565C1.28717 8.93578 1.09508 9.13043 0.858116 9.13043H0.429058C0.192096 9.13043 0 8.93578 0 8.69565V1.30435Z" fill="${fill}"/>
      </svg>
    `;
  }
}

class ReloadButton extends HTMLElement {
  static observedAttributes = ['fill'];

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

  render() {
    const fill = this.getAttribute('fill') || 'white';
    this.shadowRoot.innerHTML = `
    <svg width="15" height="10" viewBox="0 0 15 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 4.28566H11.1743L11.1735 4.27923C11.0756 3.82253 10.8839 3.38874 10.6095 3.00277C10.2012 2.42976 9.62839 1.98071 8.9595 1.70915C8.733 1.61772 8.49675 1.54772 8.256 1.50129C7.75658 1.40486 7.24192 1.40486 6.7425 1.50129C6.02477 1.64136 5.36617 1.97946 4.84875 2.47346L3.78675 1.46486C4.26539 1.00887 4.83169 0.644865 5.45475 0.392685C5.77251 0.264559 6.1029 0.16693 6.441 0.101247C7.13862 -0.0337491 7.85763 -0.0337491 8.55525 0.101247C8.89361 0.167202 9.22424 0.265069 9.54225 0.393399C10.4794 0.772056 11.2816 1.40064 11.8522 2.20346C12.2363 2.7448 12.5049 3.35277 12.6427 3.9928C12.6637 4.08923 12.675 4.1878 12.69 4.28566H15L12 7.14289L9 4.28566ZM6 5.71428H3.82575L3.8265 5.71999C4.02246 6.63557 4.58909 7.44082 5.40375 7.96149C5.80889 8.22305 6.2644 8.40562 6.744 8.49865C7.24317 8.59509 7.75758 8.59509 8.25675 8.49865C8.73627 8.40538 9.19174 8.22283 9.597 7.96149C9.79603 7.83327 9.98187 7.68737 10.152 7.52576L11.2125 8.53579C10.7336 8.99166 10.1671 9.35543 9.54375 9.60726C9.22575 9.73583 8.8935 9.83369 8.5575 9.89869C7.86014 10.0338 7.14136 10.0338 6.444 9.89869C5.09959 9.63294 3.91704 8.87825 3.14775 7.79506C2.76404 7.25413 2.49571 6.64664 2.358 6.00714C2.33775 5.91071 2.32575 5.81214 2.31075 5.71428H0L3 2.85705L6 5.71428Z" fill="${fill}"/>
    </svg>
    `;
  }
}

customElements.define("title-bar", TitleBar);
customElements.define("play-button", PlayButton);
customElements.define("pause-button", PauseButton);
customElements.define("theme-button", ThemeButton);
customElements.define("opacity-button", OpacityButton);
customElements.define("log-out-button", LogOutButton);
customElements.define("reload-button", ReloadButton);
const page = (html, js) => ({html, js});

export const routes = {
  login: page('pages/login.html', 'pages/login.js'),
  home: page('pages/home.html', 'pages/home.js'),
  error: page('pages/error.html', 'pages/error.js'),
};

export async function navigateTo(route, { reload = false, cache = true } = {}) {
  const container = document.getElementById("app");

  const pageModule = routes[route];
  if (!pageModule) {
    container.innerHTML = `<h2>404 Not Found</h2>`;
    return;
  }

  // Load HTML
  try {
    // Load and run page module
    const pageHTML = await window.pages.loadPage(pageModule.html);
    container.innerHTML = pageHTML;
    const pageJS = await import(`./${pageModule.js}`);
    if (pageJS.init) pageJS.init();   // Call exported init()
    if (reload) window.location.reload();
    if (cache) window.localStorage.setItem('path', route);
  } catch (err) {
    console.error(err);
    container.innerHTML = '<p>An error occured while loading this page.</p>';
  }
};
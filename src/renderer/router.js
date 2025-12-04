export const routes = {
  home: "pages/home.html",
};

export async function navigateTo(route) {
  const container = document.getElementById("app");

  const pageUrl = routes[route];
  if (!pageUrl) {
    container.innerHTML = `<h2>404 Not Found</h2>`;
    return;
  }

  const page = await window.pages.loadPage(pageUrl);
  container.innerHTML = page;
}
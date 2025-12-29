import { navigateTo } from '../router.js';

export const init = () => {
  const btn = document.getElementById("return-to-login");

  // Remove previous listeners so there is only one listener on the button
  // each time the page reloads -> avoids duplicate executions
  btn.replaceWith(btn.cloneNode(true));
  const newBtn = document.getElementById("return-to-login");

  newBtn.addEventListener("click", () => navigateTo('login'));
}
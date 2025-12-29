import { authorize } from '../authorization.js';
import { navigateTo } from '../router.js';

export const init = () => {
  const btn = document.getElementById("login-btn");

  // Remove previous listeners so there is only one listener on the button
  // each time the page reloads -> avoids duplicate executions
  btn.replaceWith(btn.cloneNode(true));
  const newBtn = document.getElementById("login-btn");

  newBtn.addEventListener("click", async () => {
    authorize().then((authorized) => {
      if (authorized) navigateTo('home', { reload:true });
      else navigateTo('login');
    });
  });
}
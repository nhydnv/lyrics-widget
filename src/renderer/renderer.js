import { authorize } from './authorization.js';
import { navigateTo } from './router.js';

await navigateTo('home');
authorize();
import './css/styles.css';
import * as App from './js/App';

// Start Game
App.start();
window.app = App;
globalThis.__PIXI_APP__ = App;
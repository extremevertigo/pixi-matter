import { Container } from "pixi.js";

class Scene extends Container {
    constructor() {
		super();


	}

    preload() {
		return Promise.resolve();
	}

	build() { }

	animateIn() {
		return Promise.resolve();
	}

	setActive(active) { }

	start() { }

	animateOut() {
		return Promise.resolve();
	}

	unload() { }

	resize(width, height) { }


}

export default Scene;
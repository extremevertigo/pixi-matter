import { Container } from "pixi.js";

class Layer extends Container {
    constructor(name, percentX = 0.5, percentY = 0.5) {
        super();
        this.name = name;
        this.percentX = percentX;
        this.percentY = percentY;
    }

    resize(width, height) {
        this.x = width * this.percentX;
        this.y = height * this.percentY;
    }
}

export default Layer;
import { Container, Graphics } from "pixi.js";
import { system } from "../App";

class Transition extends Container {
    constructor() {
		super();
        this.build();
	}

    build()
    {
        this.transitionShape = new Graphics();
        this.transitionShape.beginFill(0xDE3249);
        this.transitionShape.drawRect(0,0, 1664, 768);
        this.transitionShape.endFill();
        this.transitionShape.x = 1664 * -0.5;
        this.transitionShape.y = 768 * -0.5;
        this.alpha = 0;
        this.addChild(this.transitionShape);
    }

    async animateIn()
    {
        return new Promise((resolve) =>{
            createjs.Tween.get(this).to({alpha:1}, 500).call(resolve);
        });
    }

    async animateOut()
    {
        return new Promise((resolve) =>{
            createjs.Tween.get(this).to({alpha:0}, 500).call(resolve);
        });
    }

}

export default Transition;
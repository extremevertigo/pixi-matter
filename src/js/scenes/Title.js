import { Graphics, Sprite, utils } from "pixi.js";
import { sceneController, system } from "../App";
import Scene from "../core/Scene";

class Title extends Scene {
    
    constructor(){
        super();
    }

    build()
    {
        let background = new Sprite(utils.TextureCache["Background"]);
        background.anchor.set(0.5, 0.5);
        let button = new Sprite(utils.TextureCache["play-btn"]);
        button.anchor.set(0.5, 0.5);
        button.name = "button";
        button.eventMode = "static";
        button.on("pointerover", this.handleButton, this);
        button.on("pointerout", this.handleButton, this);
        button.on("pointerdown", this.handleButton, this);
        this.addChild(background, button);
        sceneController.gotoScene("Game");
    }

    handleButton(e)
    {
        console.log(e.type);
        if(e.type === "pointerover"){
            createjs.Tween.get(e.target.scale).to({x:1.1, y:1.1}, 500, createjs.Ease.quadInOut);
        }

        if(e.type === "pointerout"){
            console.log(e.type);
            createjs.Tween.get(e.target.scale).to({x:1, y:1}, 500, createjs.Ease.quadInOut);
        }

        if(e.type === "pointerdown"){
            console.log("Going to game");
            createjs.Tween.get(e.target).to({x:1, y:1}, 250, createjs.Ease.backOut);
            sceneController.gotoScene("Game");
        }
        
    }
}

export default Title;
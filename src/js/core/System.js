import { Container, Renderer, Ticker } from "pixi.js";
import { GAME_HEIGHT, GAME_MAXWIDTH, GAME_MINWIDTH } from "../PIXISettings";

class System {
    
    constructor() {

        this.container = document.getElementById("gameContainer");
        this.canvas = document.getElementById("gameCanvas");
        this.tick = null;
        this.width = GAME_MAXWIDTH;
        this.height = GAME_HEIGHT;
        this.maxWidth = GAME_MAXWIDTH;
        this.minWidth = GAME_MINWIDTH;
        this.safeWidth = 1024;
        this.safeHeight = 768;
    
        this.renderer = new Renderer({
            width: this.maxWidth,
            height: this.maxHeight,
            view: this.canvas,
            backgroundAlpha: 0

        })

        this.stage = new Container();
        this.ticker = Ticker.shared;
        this.ticker.add(this.update.bind(this));
        this.ticker.start();
        this.resize();
        window.addEventListener("resize", e => {
            this.resetWrapper();
            this.resize();
        });
    }

    resetWrapper() {
        const wrapper = this.container;
        wrapper.style.width = "";
        wrapper.style.height = "";
        wrapper.style.maxWidth = "";
        wrapper.style.maxHeight = "";
        wrapper.style.margin = "";
        wrapper.style.marginTop = "";

        this.canvas.width = 1;
        this.canvas.height = 1;
    }

    resize()
    {
        const wWidth = window.innerWidth;
        const wHeight = window.innerHeight;

        const wrapper = this.container;
        wrapper.style.maxWidth = "";
        wrapper.style.maxHeight = "";
        wrapper.style.margin = "";
        wrapper.style.marginTop = "";

        let maxWidth = wWidth;
        let maxHeight = wHeight;
        const hScale = (wHeight / this.height);
        if (wWidth > this.maxWidth * hScale) {
            this.width = this.maxWidth;
        } else if (wWidth < this.safeWidth * hScale) {
            this.width = this.safeWidth;
        } else {
            this.width = Math.floor(wWidth / hScale);
        }

        this.widthStyle = false;
        this.heightStyle = false;

        if (wWidth > this.width * (wHeight / this.height)) {
            maxWidth = Math.floor((wHeight / this.height) * this.width);
            wrapper.style.maxWidth = maxWidth + "px";
            wrapper.style.margin = "0 auto";
            this.widthStyle = true;
        } else {
            maxHeight = Math.floor((wWidth / this.width) * this.height);
            wrapper.style.maxHeight = maxHeight + "px";
            wrapper.style.marginTop = (wHeight - maxHeight) / 2 + "px";
            this.heightStyle = true;
        }

        // Update the div
        this.container.style.width = maxWidth + "px";
        this.container.style.height = maxHeight + "px";

        // Update the canvas width and height
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // Set renderer size
        this.renderer.resize(this.width, this.height);

        // Call resize on the stage and all children on the stage
        this.resizeChildren(this.stage, this.width, this.height);
    }

    resizeChildren(parent, width, height) {
        if (!parent) {
            return;
        }

        if (parent.children) {
            for (let i = parent.children.length - 1; i >= 0; i--) {
                this.resizeChildren(parent.children[i], width, height);
            }
        }

        if (parent.resize) {
            parent.resize(width, height);
        }
    }

    update()
    {
        
        this.renderer.render(this.stage);
        const elapsedMS = this.ticker.elapsedMS;
        if (elapsedMS > 40) {
            return;
        }
        this.tick = elapsedMS / 1000;
        if (createjs && createjs.Tween) {
            createjs.Ticker.removeAllEventListeners();
            createjs.Tween.tick(elapsedMS, createjs.Ticker.paused);
        }
        this.updateStage(this.stage);
    }

    updateStage(container)
    {
        container.children.forEach(child =>{
            if(child.update){
                child.update(this.tick);
            } else {
                this.updateStage(child);
            }
        });
    }
    

}

export default System;
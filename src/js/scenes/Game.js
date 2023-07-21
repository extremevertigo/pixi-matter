import { Graphics, Sprite, utils } from "pixi.js";
import Scene from "../core/Scene";
import { loadAssetBundleByTags } from "../loading/PIXIAssetLoading";
import Matter from "../physics/Matter";
import { Bodies } from "matter-js";

class Game extends Scene {
    
    constructor(){
        super();
    }

    async preload()
    {
        loadAssetBundleByTags("Game", ["Game"]);
    }

    build()
    {
        console.log(utils.TextureCache);
        this.gameWidth = 832;
        this.gameHeight = 384;
        let background = new Sprite(utils.TextureCache["Background"]);
        background.anchor.set(0.5, 0.5);
        
        this.matterjs = new Matter();
        this.circle = new Graphics();
        this.circle.beginFill(0xe74c3c);
        this.circle.drawCircle(0,0,30);
        
        this.ground = new Graphics();
        this.ground.beginFill(0xffedee);
        this.ground.drawRect(-832, -50, 1664, 100);
        // this.ground.pivot.set(-832, -50);
        this.addChild( this.circle, this.ground);

        this.physicsCircle = Bodies.circle(0, -500,30, {restitution:1.5});

        this.physicsGround = Bodies.rectangle(0, 384, 1664, 100, {isStatic: true});
        
        this.matterjs.addElementToBody(this.circle, this.physicsCircle);
        this.matterjs.addElementToBody(this.ground, this.physicsGround);

        this.matterjs.addBody([this.physicsCircle, this.physicsGround]);
    }


    update(e)
    {
        this.matterjs.update(e);
    }

    setActive(){
        // this.createEvent();
    }

    start(){
        
    }
}

export default Game;
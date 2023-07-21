import { Body, Composite, Engine, Render, Runner, World } from "matter-js";



export default class Matter {
    constructor() {
        this.gameWidth = 832;
        this.gameHeight = 384;
        this.elements = [];
        this.engine = Engine.create();
        this.world = this.engine.world;
        this.render = Render.create({
            element:document.getElementById("block"),
            engine: this.engine,
            options: {
                width: 1664,
                height: 786,
                showAngleIndicator: true,
                wireframeBackground:false
            }
        });
        
        this.runner = Runner.create();
        this.composite = Composite;
        //ShowDebug
        // Render.run(this.render);
        Runner.run(this.runner, this.engine);
    }

    setPositions(body) {
        Body.setPosition(body, {x: body.position.x + this.gameWidth, y: body.position.y + this.gameHeight});
    }

    addElementToBody(element, body){
        element.body = body;
        this.elements.push(element);

    }

    addBody(body) {
        
        if(Array.isArray(body)){
            body.forEach(b =>{
                this.setPositions(b);
            });
            World.add(this.world, body);
        } else {
            this.setPositions(body);
            World.add(this.world, [body]);
        }
        
    }

    updateElementPositions(e){
        for(let i = 0; i < this.elements.length; i++){
            const element = this.elements[i];
            if(element){
                element.x = element.body.position.x - this.gameWidth;
                element.y = element.body.position.y - this.gameHeight;
            }
        }
    }

    update(e) {
        Engine.update(this.engine, e * 1000);
        this.updateElementPositions();
    }
}
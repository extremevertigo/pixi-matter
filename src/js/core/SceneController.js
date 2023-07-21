
class SceneController {
    /**
     * Constructor
     */
    constructor() {
        this.current = null;
        this.scenes = {};
        this.mainLayer = null;
        this.transitionLayer = null;
        this.transition = null;
    }

    addScene(name, scene){
        this.scenes[name] = scene;
    }

    setMainLayer(layer) {
        this.mainLayer = layer;
    }

    setTransitionLayer(layer)
    {
        this.transitionLayer = layer;
        this.transition = this.transitionLayer.getChildAt(0);
    }

    gotoScene(name) {
        if (this.current) {
            this.unloadSceneThenLoad(name);
        } else {
            this.loadScene(name);
        }
    }

    async unloadSceneThenLoad(name) {

        if (this.transition) {
            await this.transition.animateIn();
        }

        this.current.setActive(false);

        await this.current.animateOut();

        this.current.unload();
        this.removeScene(this.current, this.mainLayer);


        this.loadScene(name);
    }

    async loadScene(name) {

        this.current = new this.scenes[name]();
        this.mainLayer.addChild(this.current);

        await this.current.preload();

        this.current.build();

        if (this.transition) {
            await this.transition.animateOut();
        }

        await this.current.animateIn();

        this.current.setActive(true);
        this.current.start();
    }

    removeScene(scene, layer) {
        if (scene) {
            scene.removeAllListeners();
            scene.removeChildren();
        }
        if (layer) {
            layer.removeAllListeners();
            layer.removeChildren();
        }
    }



}

export default SceneController
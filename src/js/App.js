import manifest from "../config/manifest.json";
import SceneController from "./core/SceneController";
import System from "./core/System";
import Layer from "./core/Layer";
import Title from "./scenes/Title";
import Game from "./scenes/Game";
import { Assets } from "pixi.js";
import Transition from "./core/Transition";
import "./extensions/array-extended";
import { loadAssetBundleByTags } from "./loading/PIXIAssetLoading";

const system = new System("gameContainer", "gameCanvas");
const sceneController = new SceneController();
const layers = {
  Game: new Layer("Game", 0.5, 0.5),
  Transition: new Layer("Transition", 0.5, 0.5),
};

function addLayersToStage() {
  for (let layer in layers) {
    system.stage.addChild(layers[layer]);
  }
  system.resize();
}

async function preloadStart() {
    const bundle = loadAssetBundleByTags("Preload", ["Preload"]);
    bundle.then((data) =>{
        console.log(data);
        setupStage();
    });
}

function setupStage() {
  addLayersToStage();
  layers.Transition.addChild(new Transition());
  sceneController.setMainLayer(layers.Game);
  sceneController.setTransitionLayer(layers.Transition);
  registerScenes();
  sceneController.gotoScene("Title");
}

async function start() {
  preloadStart();
}

function registerScenes() {
  sceneController.addScene("Title", Title);
  sceneController.addScene("Game", Game);
}

export { start, system, sceneController, manifest };

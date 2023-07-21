import assets from "../../config/manifest.json";
// import { sound } from "@pixi/sound";
import { Assets } from "@pixi/assets";

/**
 * Add bundle and load it by name with tags
 * @param {String} name - bundle name to add and load using
 * @param {Array|String} tags - String tag or Array of String tags
 * @returns 
 */
function loadAssetBundleByTags(name, tags, onProgress = null, newManifest = null) {
	let assets;
	if(newManifest){
		assets = buildBundleByTags(tags, newManifest);
	} else {
		assets = buildBundleByTags(tags);
	}
	Assets.addBundle(name, assets);
	if(onProgress){
		return Assets.loadBundle(name, onProgress);
	} else {
		return Assets.loadBundle(name);
	}

}

/**
 * Build asset bundle Object by tags
 * @param {Array|String} tags - String tag or Array of String tags
 * @returns 
 */
function buildBundleByTags(tags = [], newManifest = null) {
	const assetsObj = {};
	

	tags = typeof tags === "string" ? [tags] : tags;
	tags.push("*");
    console.log(assets);
	let manifest = assets;
	if(newManifest){
		manifest = newManifest		
	}

	// Collect all the Objects an store them in a list
	let arrayOfObjects = [];
	for (let tag of tags) {
		
		arrayOfObjects = arrayOfObjects.concat(manifest.filter(asset => {
			if (asset.tags && asset.tags.length > 0) {
				const hasTag = asset.tags.indexOf(tag) > -1;
				if (!hasTag) {
					return false;
				}
			}

			// if (sound.exists(asset.id)) {
			// 	return false;
			// }

			return true;
		}));
	}

	// Build the object
	for (let obj of arrayOfObjects) {
			
			let assetPath = `${obj.srcs}`;
			assetsObj[obj.name] = assetPath;
            console.log(assetPath);
	}

	return assetsObj;
}

export {
	loadAssetBundleByTags,
	buildBundleByTags
}
/** Quick access namespace */
window.cjs = window.createjs;

/**
 * Set the mouse event hit box for an object (square shape)
 * @ param {Number} paddingX - The amount of padding to give in the X axis
 * @ param {Number} paddingY - The amount of padding to give in the Y axis
 * @#return {this} for chaining
 */
cjs.DisplayObject.prototype.hitbox = function(paddingX = 0, paddingY = 0){
    let b = this.getBounds();
    if (b)
    {
        this.hitArea = new cjs.Shape();
        this.hitArea.graphics.f("#000").r(b.x - paddingX, b.y - paddingY, b.width + paddingX * 2, b.height + paddingY * 2);
    }

    return this;
};

/**
 * Set the scale on a displayObject to a value
 * @#param {Number} scale - Value to set the scale of the displayObject to
 * @#return {this} for chaining
 */
cjs.DisplayObject.prototype.scale = function(scale = 1){
    this.scaleX = this.scaleY = scale;
    return this;
};

/**
 * Set the regX/regY values to be in the center of the display object
 * @#return {this} for chaining
 */
cjs.DisplayObject.prototype.center = function(){
	let b = this.getBounds();
	this.regX = b.width / 2;
	this.regY = b.height / 2;
	return this;
};

/** 
 * Set the regX/regY to be a certain percentage based on the size of the image
 * @ param {Number} percentX - percentage on the regX in decimal form @ example 0.5
 * @ param {Number} percentY - percentage on the regY in decimal @ example 0.5
 */
cjs.DisplayObject.prototype.regs = function(percentX = 0, percentY = 0){
    let b = this.getBounds();
    this.regX = b.width * percentX;
    this.regY = b.height * percentY;
    return this;
};
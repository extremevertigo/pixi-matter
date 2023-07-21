/**
 * Remove an index from the Array
 * example: myArr.erase(3);
 * @#param {Number} item Index position in Array we want to remove
 * @#return this for chaining
 */
Object.defineProperty( Array.prototype,'erase', {
	value : function(item) {
		var i = this.indexOf(item);
		if (i >= 0) this.splice(i, 1);
		return this;
	}
});

/**
 * Get a random value from an Array from the Array that 'random()' was called on
 * example: myArr.random();
 * @#return A random Array Index information
 */
Object.defineProperty(Array.prototype,'random', {
	value : function() {
		return this[ 0 | (Math.random() * this.length) ];
	}
});

/**
 * Shuffle the Array to randomize the index locations inside the array
 * example: myArr.shuffle();
 * @#return this for chaining
 */
Object.defineProperty(Array.prototype,'shuffle', {
	value : function() {
		var i = this.length, j, temp;
		if ( i === 0 ) return this;
		while ( --i ) {
			j = Math.floor( Math.random() * ( i + 1 ) );
			temp = this[i];
			this[i] = this[j];
			this[j] = temp;
		}
		return this;
	}
});

/**
 * Copy an array - this will lose reference to the array we copied
 * example: var newArray = oldArray.clone();
 * @#return {Array} New array with no reference to the original
 */
Object.defineProperty(Array.prototype, 'clone', {
	value : function() {
		return this.slice(0);
	}
});
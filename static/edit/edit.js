window.addEventListener('load', function()
{
	// mobile doesn't have privilege
	if ( 'ontouchstart' in window ) return;

	var libPath = './edit/'; // to this directory
	var mediaPath = './assets/'; // to the media directory (set to false to not load)
	var exportPrefixCJS = 'cjs'; // or createjs
	var theme = 'white'; // black/white

	// just going to load some files, ignore this

	var link = document.createElement('link');
	link.rel = 'stylesheet';
	link.type = 'text/css';
	link.href = libPath + 'edit.css';
	link.onload = theme === 'black' ? null : function()
	{
		var style = document.createElement('style');
		style.type = 'text/css';
		style.innerHTML = '' +
			'.edit-box { background-color : rgba(255, 255, 255, 0.4); }' +
			'.edit-box.hierarchy ul { background-color : rgba(255, 255, 255, 0.4); }' +
			'.edit-box.hierarchy ul li { color : #000; }' +
			'.edit-box.hierarchy .placeholder { background-color : rgba(0, 0, 0, 0.4); }';
		document.body.appendChild( style );
	};
	document.body.appendChild( link );

	var script1 = document.createElement('script');
	script1.onload = function() { document.body.appendChild( script2 ); };
	script1.src = 'https://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js';

	var script2 = document.createElement('script');
	script2.onload = function() { document.body.appendChild( script3); };
	script2.src = 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.0/jquery-ui.min.js';

	var script3 = document.createElement('script');
	script3.onload = function() { document.body.appendChild(script4) };
	script3.src = libPath + 'nested-sortable.js';

	var script4 = document.createElement('script');
	script4.onload = function() { edit.ready = true; }; // START
	script4.src = libPath + 'ddSlick.js';

	// once this is added to the body, then the loading may begin
	document.body.appendChild( script1 );


	// start the class below!


	var edit =
	{
		stage : null,
		selected : null,

		tempStage : null, // if it isn't ready yet
		tempInterval : null,

		key : {},
		drag : { x : null, y : null },

		hierarchy : [],
		hierarchyTimer : 10000, // auto, every 10 seconds - or hit the button

		zIndex : true,
		queue : null,

		init : function(stage)
		{
			clearInterval(this.tempInterval);

			// not ready? listen to when its ready
			if ( !this.ready )
			{
				this.tempInterval = setInterval(function() { if ( edit.ready ) edit.init( stage ); }, 100);
				return;
			}

			// does the movie clip exist???
			createjs.MovieClip = createjs.MovieClip || function(){};

			// extend the container to make it recursive, ITS A MUST FOR THIS EDITOR!
			createjs.Container.prototype.getChildById = function(id, deep)
			{
				var kids = this.children, l = kids.length, i = 0, kid = null;
				for ( ; i < l && !kid; i++ ) {
					if ( kids[i].id === id ) kid = kids[i];
					else if ( deep && kids[i].children ) kid = kids[i].getChildById(id, deep);
				}
				return kid;
			};

			// is there zIndex
			this.zIndex = typeof createjs.DisplayObject.prototype.zIndex === 'number';

			var setupEvents = true;

			// changing the stage? remove the old events
			if ( this.stage )
			{
				setupEvents = false;
				this.stage.off('stagemousedown', this.stageEvent);
				this.stage.off('stagemouseup', this.stageEvent);
				createjs.Ticker.off('tick', this.update);
			}

			// set the stage
			this.stage = stage;

			// attach some events for us
			this.stage.on('stagemousedown', this.stageEvent, this);
			this.stage.on('stagemouseup', this.stageEvent, this);
			createjs.Ticker.on('tick', this.update, this);

			// no need to continue setuping up the events
			if ( !setupEvents )
				return;

			// sets up the doms
			this.displayObjectSetup();
			this.hierarchySetup();

			// some events
			$('.edit-box').draggable({ handle : 'h3', container : 'parent' });
			$('.edit-box h3').dblclick(function() { $(this).next().toggle(); $(this).parent().css('height', 'auto'); });
			$(document).on('keydown', this.keyEvent).on('keyup', this.keyEvent).on('mousewheel', this.mousewheelEvent);

			// parse through the media directory
			if ( mediaPath )
			{
				$.ajax(libPath + 'seeker.php',
				{
					cache : false,
					data : { mediaPath : mediaPath },
					dataType : 'json',
					success : function(files)
					{
						var loadQueue = new createjs.LoadQueue(false);
						loadQueue.setMaxConnections(8);
						loadQueue.on('complete', edit.loadComplete, edit);

						// setup the manifest to load, make sure sprite sheets load
						for ( var i = 0, manifest = [], file; i < files.length; i++ )
						{
							file = { id : files[i], src : files[i] };
							if ( /(\.json)$/i.test(file.src) ) file.type = 'spritesheet';
							manifest.push( file );
						}

						// load the files
						loadQueue.loadManifest(manifest);
					}
				});
			}

			// start listening
			this.hierarchyListener();
		},

		loadComplete : function(e)
		{
			this.queue = e.target;

			var spritesheets = [];
			var images = [];

			// add dom stuff for the appropriate types
			for ( var id in this.queue._loadedResults )
			{
				var obj = this.queue._loadedResults[id];

				if ( obj instanceof createjs.SpriteSheet )
					spritesheets.push({ id : id, ss : obj });
				else
					images.push({ id : id, src : obj.src });
			}

			// add the bitmaps
			for ( var i = 0, options = []; i < images.length; i++ )
				options.push('<option value="' + images[i].id + '">' + (images[i].src.indexOf('blob:http://') > -1 ? images[i].id : images[i].src ) + '</option>');
			$('.edit-box.hierarchy .type-bitmap').append('<select>' + options.join('') + '<select>');
			$('.edit-box.display-object select[name="image"]').html(options.join(''));

			// add sprite sheets
			for ( var i = 0, options = []; i < spritesheets.length; i++ )
				options.push('<option value="' + spritesheets[i].id + '">' + spritesheets[i].id + '</option>');
			$('.edit-box.hierarchy .type-spritesheet').append('<select name="spritesheet">' + options.join('') + '<select>');
			$('.edit-box.display-object select[name="spriteSheet"]').html(options.join(''));

			// animations of the sprite sheets, sort the animations
			for ( var i = 0; i < spritesheets.length; i++ )
			{
				var animations = spritesheets[i].ss._animations.slice().sort();

				for ( var j = 0, options = []; j < animations.length; j++ )
					options.push('<option value="' + animations[j] + '">' + animations[j] + '</option>');

				// add to hierarchy and display object
				$('.edit-box.hierarchy .type-spritesheet').append('<select name="frameAnimation" data-id="' + spritesheets[i].id + '"' + (i ? 'style="display:none"' : '') + '">' + options.join('') + '</select>');
				$('.edit-box.display-object dd.frame-animations').append('<select name="frameAnimation" data-id="' + spritesheets[i].id + '">' + options.join('') + '</select>');
			}

			// need to add to the _doFields
			this._doFields.frameAnimation = $('.edit-box.display-object select[name="frameAnimation"]');
		},

		keyEvent : function(e)
		{
			edit.key[e.key.toLowerCase()] = e.type === 'keydown';
			edit.key.shift = e.shiftKey;

			var disObj = edit.selected;

			// moving/draging with arrow keys
			if ( e.type === 'keydown' && e.key.search(/arrow/i) === 0 && edit.key.d && disObj )
			{
				e.preventDefault();

				if ( edit.key.arrowleft ) disObj.x--;
				else if ( edit.key.arrowright ) disObj.x++;
				if ( edit.key.arrowup ) disObj.y--;
				else if ( edit.key.arrowdown ) disObj.y++;
			}
			else if ( e.type === 'keyup' && e.target instanceof HTMLInputElement && e.key.search(/arrowup|arrowdown/i) > -1 && disObj )
			{
				e.preventDefault();

				var d = e.key.search(/arrowup/i) > -1;
				var v = parseFloat(e.target.value);
				var n = e.target.name;

				if ( isNumber(v) )
				{
					var a = /(scale|alpha)/i.test(n) ? 0.1 : 1;

					if ( /(sourceRect|mask|hitArea|shadow)/i.test(n) )
					{
						n = n.split('.');
						disObj[n[0]][n[1]] = d ? disObj[n[0]][n[1]] + a : disObj[n[0]][n[1]] - a;
						e.target.value = disObj[n[0]][n[1]];
						n = n.join('.');
					}
					else
					{
						disObj[n] = d ? disObj[n] + a : disObj[n] - a;
						e.target.value = disObj[n];
					}

					// call this for specific prop triggers, like zIndex sorting when the value changes
					edit.displayObjectFieldUpdate(n, e.target.value);
				}
			}
		},

		mousewheelEvent : function(e)
		{
			var d = e.originalEvent.deltaY > 0;
			var disObj = edit.selected;

			if ( !disObj ) return;

			if ( !$(e.target).closest('.edit-content') )
				e.preventDefault();

			// over an element ;)
			if ( e.target instanceof HTMLInputElement )
			{
				// we should be scrolling over the same element we are focused on
				if ( !$(e.target).is(':focus') ) return;

				var v = parseFloat(e.target.value);
				var n = e.target.name;

				if ( isNumber(v) )
				{
					var a = /(scale|alpha)/i.test(n) ? 0.1 : 10;

					if ( /(sourceRect|mask|hitArea|shadow)/i.test(n) )
					{
						n = n.split('.');
						disObj[n[0]][n[1]] = d ? disObj[n[0]][n[1]] + a : disObj[n[0]][n[1]] - a;
						e.target.value = disObj[n[0]][n[1]];
						n = n.join('.');
					}
					else
					{
						disObj[n] = d ? disObj[n] + a : disObj[n] - a;
						e.target.value = disObj[n];
					}

					// call this for specific prop triggers, like zIndex sorting when the value changes
					edit.displayObjectFieldUpdate(n, e.target.value);
				}
			}
			// if we are over the canvas
			else if ( e.target === edit.stage.canvas )
			{
				if ( edit.key.w && disObj.mask )
					disObj = disObj.mask; // mask
				else if ( edit.key.h && disObj.hitArea )
					disObj = disObj.hitArea; // hitArea

				if ( edit.key.s )
				{
					var x = 0, y = 0;
					if ( edit.key.x ) x = 1;
					if ( edit.key.y ) y = 1;
					if ( !x && !y ) x = 1, y = 1;
					if ( x ) disObj.scaleX = d ? disObj.scaleX + 0.1 : disObj.scaleX - 0.1;
					if ( y ) disObj.scaleY = d ? disObj.scaleY + 0.1 : disObj.scaleY - 0.1;
				}
				else if ( edit.key.a )
					disObj.alpha = d ? disObj.alpha + 0.1 : disObj.alpha - 0.1;
				else if ( edit.key.r )
					disObj.rotation = d ? disObj.rotation + 10 : disObj.rotation - 10;
			}
		},

		stageEvent : function(e)
		{
			if ( e.type === 'stagemousedown')
			{
				// annoying input fields!
				$('.edit-box.display-object input').blur();
				$('.edit-box.display-object select').blur();

				if ( this.selected )
				{
					var pt = this.selected.parent.globalToLocal(this.stage.mouseX, this.stage.mouseY);
					this.drag.x = pt.x - this.selected.x;
					this.drag.y = pt.y - this.selected.y;
				}
			}
			else if ( e.type === 'stagemouseup' )
				this.drag.x = this.drag.y = null;
		},

		update : function()
		{
			var disObj = this.selected;
			if ( !this.stage || !disObj ) return;

			if ( this.key.d && this.drag.x !== null && this.drag.y !== null )
			{
				var pt = disObj.parent.globalToLocal(this.stage.mouseX, this.stage.mouseY);
				var x = pt.x - this.drag.x, y = pt.y - this.drag.y;
				var _x = 0, _y = 0;
				if ( this.key.x ) _x = 1;
				if ( this.key.y ) _y = 1;
				if ( !_x && !_y ) _x = 1, _y = 1;

				if ( !this.key.shift ) x = ~~x, y = ~~y; // round down

				// drag the mask
				if ( this.key.w && disObj.mask )
				{
					if ( _x ) disObj.mask.x = x;
					if ( _y ) disObj.mask.y = y;
				}
				else if ( this.key.f && disObj.hitArea )
				{
					if ( _x ) disObj.hitArea.x = x;
					if ( _y ) disObj.hitArea.y = y;
				}
				// drag the display object
				else
				{
					if ( _x ) disObj.x = x;
					if ( _y ) disObj.y = y;
				}
			}

			// updates the info on the right
			this.displayObjectUpdateFields( disObj );
		},

		displayObjectSetup : function()
		{
			$(document.body).append(
				'<div class="edit-box display-object" style="top:0;right:0">' +
					'<h3>Selected</h3>' +
					'<div class="edit-content" style="display:none">' +
						'<ul class="section-links">' +
							'<li data-show="content-common" class="active">Common</li>' +
							'<li data-show="content-custom">Custom</li>' +
						'</ul>' +
						'<dl class="content-common">' +
							'<dt>visible</dt>' +
							'<dd>' +
								'<input type="checkbox" name="visible" /> ' +
							'</dd>' +
							'<dt>name</dt>' +
							'<dd>' +
								'<input type="text" name="name" size="18" /> ' +
							'</dd>' +
							'<dt>x/y' + (this.zIndex ? '/zIndex' : '') + '</dt>' +
							'<dd>' +
								'<input type="text" name="x" size="6" /> ' +
								'<input type="text" name="y" size="6" /> ' +
								(this.zIndex ? '<input type="text" name="zIndex" size="4" />' : '') +
							'</dd>' +
							'<dt>scaleX/Y</dt>' +
							'<dd>' +
								'<input type="text" name="scaleX" size="4" /> ' +
								'<input type="text" name="scaleY" size="4" /> ' +
							'</dd>' +
							'<dt>regX/Y</dt>' +
							'<dd>' +
								'<input type="text" name="regX" size="4" /> ' +
								'<input type="text" name="regY" size="4" /> ' +
								'<select name="reg" style="width:84px">' +
									'<option value="custom">Custom</option>' +
									'<option value="top-left">Top Left</option>' +
									'<option value="top-center">Top Center</option>' +
									'<option value="top-right">Top Right</option>' +
									'<option value="middle-left">Middle Left</option>' +
									'<option value="middle-center">Middle Center</option>' +
									'<option value="middle-right">Middle Right</option>' +
									'<option value="bottom-left">Bottom Left</option>' +
									'<option value="bottom-center">Bottom Center</option>' +
									'<option value="bottom-right">Bottom Right</option>' +
								'</select>' +
							'</dd>' +
							'<dt>skewX/Y</dt>' +
							'<dd>' +
								'<input type="text" name="skewX" size="4" /> ' +
								'<input type="text" name="skewY" size="4" /> ' +
							'</dd>' +
							'<dt>rotation</dt>' +
							'<dd>' +
								'<input type="text" name="rotation" size="4" /> ' +
							'</dd>' +
							'<dt>alpha</dt>' +
							'<dd>' +
								'<input type="text" name="alpha" size="4" /> ' +
							'</dd>' +
							'<dt>cursor</dt>' +
							'<dd>' +
								'<input type="text" name="cursor" size="18" /> ' +
							'</dd>' +
							'<dt data-for="text">text</dt>' +
							'<dd data-for="text">' +
								'<input type="text" name="text" size="18" /> ' +
							'</dd>' +
							'<dt data-for="text">font</dt>' +
							'<dd data-for="text">' +
								'<input type="text" name="font" size="18" /> ' +
							'</dd>' +
							'<dt data-for="text">color</dt>' +
							'<dd data-for="text">' +
								'<input type="text" name="color" size="18" /> ' +
							'</dd>' +
							'<dt data-for="text">textAlign</dt>' +
							'<dd data-for="text">' +
								'<input type="text" name="textAlign" size="18" /> ' +
							'</dd>' +
							'<dt data-for="text">textBaseline</dt>' +
							'<dd data-for="text">' +
								'<input type="text" name="textBaseline" size="18" /> ' +
							'</dd>' +
							'<dt data-for="text">outline</dt>' +
							'<dd data-for="text">' +
								'<input type="text" name="outline" size="4" /> ' +
							'</dd>' +
							'<dt data-for="text">lineWidth/Height</dt>' +
							'<dd data-for="text">' +
								'<input type="text" name="lineWidth" size="4" /> ' +
								'<input type="text" name="lineHeight" size="4" /> ' +
							'</dd>' +
							'<dt data-for="text">maxWidth</dt>' +
							'<dd data-for="text">' +
								'<input type="text" name="maxWidth" size="4" /> ' +
							'</dd>' +
							'<dt data-for="bitmap">sourceRect</dt>' +
							'<dd data-for="bitmap">' +
								'<input type="button" name="sourceRect" value="sourceRect" />' +
							'</dd>' +
							'<dt data-for="sourceRect"> - x/y</dt>' +
							'<dd data-for="sourceRect">' +
								'<input type="text" name="sourceRect.x" size="4" /> ' +
								'<input type="text" name="sourceRect.y" size="4" />' +
							'</dd>' +
							'<dt data-for="sourceRect"> - width/height</dt>' +
							'<dd data-for="sourceRect">' +
								'<input type="text" name="sourceRect.width" size="4" /> ' +
								'<input type="text" name="sourceRect.height" size="4" />' +
							'</dd>' +
							'<dt data-for="bitmap">image</dt>' +
							'<dd data-for="bitmap">' +
								'<select name="image"></select>' +
							'</dd>' +
							'<dt data-for="sprite">spriteSheet</dt>' +
							'<dd data-for="sprite">' +
								'<select name="spriteSheet"></select>' +
							'</dd>' +
							'<dt data-for="sprite">currentAnimation</dt>' +
							'<dd data-for="sprite" class="frame-animations">' +
								// dynamically added
							'</dd>' +
							'<dt data-for="sprite">currentAnimationFrame</dt>' +
							'<dd data-for="sprite">' +
								'<input type="text" name="currentAnimationFrame" size="4" /> ' +
							'</dd>' +
							'<dt data-for="sprite">currentFrame</dt>' +
							'<dd data-for="sprite">' +
								'<input type="text" name="currentFrame" size="4" /> ' +
							'</dd>' +
							'<dt data-for="sprite">framerate</dt>' +
							'<dd data-for="sprite">' +
								'<input type="text" name="framerate" size="4" /> ' +
							'</dd>' +
							'<dt data-for="sprite">paused</dt>' +
							'<dd data-for="sprite">' +
								'<input type="checkbox" name="paused" /> ' +
							'</dd>' +
							'<dt>mouseEnabled</dt>' +
							'<dd>' +
								'<input type="checkbox" name="mouseEnabled" /> ' +
							'</dd>' +
							'<dt>tickEnabled</dt>' +
							'<dd>' +
								'<input type="checkbox" name="tickEnabled" /> ' +
							'</dd>' +
							'<dt data-for="container">mouseChildren</dt>' +
							'<dd data-for="container">' +
								'<input type="checkbox" name="mouseChildren" /> ' +
							'</dd>' +
							'<dt data-for="container">tickChildren</dt>' +
							'<dd data-for="container">' +
								'<input type="checkbox" name="tickChildren" /> ' +
							'</dd>' +
							'<dt data-for="container">numChildren</dt>' +
							'<dd data-for="container">' +
								'<input type="text" name="numChildren" size="4" readonly /> ' +
							'</dd>' +
							'<dt>hitArea</dt>' +
							'<dd>' +
								'<input type="button" name="hitArea" value="hitArea" /> ' +
							'</dd>' +
							'<dt data-for="hitArea"> - x/y</dt>' +
							'<dd data-for="hitArea">' +
								'<input type="text" name="hitArea.x" size="6" /> ' +
								'<input type="text" name="hitArea.y" size="6" /> ' +
							'</dd>' +
							'<dt data-for="hitArea"> - scaleX/Y</dt>' +
							'<dd data-for="hitArea">' +
								'<input type="text" name="hitArea.scaleX" size="4" /> ' +
								'<input type="text" name="hitArea.scaleY" size="4" /> ' +
							'</dd>' +
							'<dt data-for="hitArea"> - regX/Y</dt>' +
							'<dd data-for="hitArea">' +
								'<input type="text" name="hitArea.regX" size="4" /> ' +
								'<input type="text" name="hitArea.regY" size="4" /> ' +
							'</dd>' +
							'<dt data-for="hitArea"> - rotation</dt>' +
							'<dd data-for="hitArea">' +
								'<input type="text" name="hitArea.rotation" size="4" /> ' +
							'</dd>' +
							'<dt>mask</dt>' +
							'<dd>' +
								'<input type="button" name="mask" value="mask" /> ' +
							'</dd>' +
							'<dt data-for="mask"> - x/y</dt>' +
							'<dd data-for="mask">' +
								'<input type="text" name="mask.x" size="6" /> ' +
								'<input type="text" name="mask.y" size="6" /> ' +
							'</dd>' +
							'<dt data-for="mask"> - scaleX/Y</dt>' +
							'<dd data-for="mask">' +
								'<input type="text" name="mask.scaleX" size="4" /> ' +
								'<input type="text" name="mask.scaleY" size="4" /> ' +
							'</dd>' +
							'<dt data-for="mask"> - regX/Y</dt>' +
							'<dd data-for="mask">' +
								'<input type="text" name="mask.regX" size="4" /> ' +
								'<input type="text" name="mask.regY" size="4" /> ' +
							'</dd>' +
							'<dt data-for="mask"> - rotation</dt>' +
							'<dd data-for="mask">' +
								'<input type="text" name="mask.rotation" size="4" /> ' +
							'</dd>' +
							'<dt>shadow</dt>' +
							'<dd>' +
								'<input type="button" name="shadow" value="shadow" /> ' +
							'</dd>' +
							'<dt data-for="shadow"> - color</dt>' +
							'<dd data-for="shadow">' +
								'<input type="text" name="shadow.color" size="18" /> ' +
							'</dd>' +
							'<dt data-for="shadow"> - offsetX/Y</dt>' +
							'<dd data-for="shadow">' +
								'<input type="text" name="shadow.offsetX" size="6" /> ' +
								'<input type="text" name="shadow.offsetY" size="6" /> ' +
							'</dd>' +
							'<dt data-for="shadow"> - blur</dt>' +
							'<dd data-for="shadow">' +
								'<input type="text" name="shadow.blur" size="4" /> ' +
							'</dd>' +
							'<dt data-for="container text">cacheCanvas</dt>' +
							'<dd data-for="container text">' +
								'<input type="button" name="cacheCanvas" value="cache" /> ' +
							'</dd>' +
							'<dt>compositeOperation</dt>' +
							'<dd>' +
								'<select name="compositeOperation">' +
									'<option value="">none</option>' +
									'<option value="source-over">source-over</option>' +
									'<option value="source-atop">source-atop</option>' +
									'<option value="source-in">source-in</option>' +
									'<option value="source-out">source-out</option>' +
									'<option value="destination-over">destination-over</option>' +
									'<option value="destination-atop">destination-atop</option>' +
									'<option value="destination-in">destination-in</option>' +
									'<option value="destination-out">destination-out</option>' +
									'<option value="lighter">lighter</option>' +
									'<option value="copy">copy</option>' +
									'<option value="xor">xor</option>' +
								'</select>' +
							'</dd>' +
						'</dl>' +
						'<dl class="content-custom" style="display:none">' +
							// dynamically added
						'</dl>' +
						'<hr style="clear:both" />' +
						'<input type="button" name="clone" value="Clone" /> &nbsp; ' +
						'<input type="button" name="export-code" value="Code" /> &nbsp; ' +
						'<input type="button" name="export-json" value="JSON" /> &nbsp; ' +
						'<input type="button" name="remove" value="Remove" />' +
					'</div>' +
				'</div>'
			);

			$('.edit-box.display-object')
				.on('keyup', 'input[type="text"]', function()
				{
					edit.displayObjectFieldUpdate(this.name, this.value);
				})
				.on('change', 'select:not([name="spriteSheet"])', function()
				{
					edit.displayObjectFieldUpdate(this.name, this.value);
				})
				.on('change', 'select[name="spriteSheet"]', function()
				{
					$('.edit-box.display-object select[name="frameAnimation"]').hide().filter('select[data-id="' + this.value + '"]').show();
					edit.displayObjectFieldUpdate(this.name, this.value);
				})
				.on('click', 'input[type="checkbox"]', function()
				{
					edit.displayObjectFieldUpdate(this.name, $(this).prop('checked'));
				})
				.on('click', 'input[type="button"]', function()
				{
					if ( !edit.selected ) return;

					if ( this.name === 'clone' )
					{
						var disObj = edit.selected.clone(true);
						(edit.selected.parent || edit.stage).addChild( disObj );
						edit.hierarchyListener(); // update the hierarchy
						edit.displayObjectSet( disObj ); // now will highlight it
					}
					else if ( this.name === 'export-code' )
					{
						for ( var i = 0, txt = '', code = edit.displayObjectExport(edit.selected, 'code'); i < code.length; i++ ) txt += code[i].code + "\n";
						console.log(txt);
					}
					else if ( this.name === 'export-json' )
						console.log( JSON.stringify(edit.displayObjectExport(edit.selected, 'json')[0]) );
					else
						edit.displayObjectFieldUpdate(this.name, this);
				})
				.on('dblclick', 'input[type="button"]', function()
				{
					if ( this.name === 'remove' )
					{
						edit.selected.parent.removeChild( edit.selected );
						edit.selected = null;
						$('.edit-box.display-object h3').trigger('dblclick');
						edit.hierarchyListener();
					}
				})
				.on('click', 'ul.section-links li', function()
				{
					$('.edit-box.display-object ul.section-links li').removeClass('active');
					$('.edit-box.display-object dl[class^="content-"]').hide().filter('.' + $(this).attr('data-show')).show();
					$(this).addClass('active');
				});

			// set all the fields so its quicker to reference them
			var doObj = $('.edit-box.display-object');
			this._doFields =
			{
				visible : doObj.find('input[name="visible"]'),
				name : doObj.find('input[name="name"]'),
				x : doObj.find('input[name="x"]'),
				y : doObj.find('input[name="y"]'),
				zIndex : doObj.find('input[name="zIndex"]'),
				scaleX : doObj.find('input[name="scaleX"]'),
				scaleY : doObj.find('input[name="scaleY"]'),
				regX : doObj.find('input[name="regX"]'),
				regY : doObj.find('input[name="regY"]'),
				reg : doObj.find('select[name="reg"]'),
				skewX : doObj.find('input[name="skewX"]'),
				skewY : doObj.find('input[name="skewY"]'),
				rotation : doObj.find('input[name="rotation"]'),
				alpha : doObj.find('input[name="alpha"]'),
				cursor : doObj.find('input[name="cursor"]'),
				text : doObj.find('input[name="text"]'),
				font : doObj.find('input[name="font"]'),
				color : doObj.find('input[name="color"]'),
				textAlign : doObj.find('input[name="textAlign"]'),
				textBaseline : doObj.find('input[name="textBaseline"]'),
				outline : doObj.find('input[name="outline"]'),
				lineWidth : doObj.find('input[name="lineWidth"]'),
				maxWidth : doObj.find('input[name="maxWidth"]'),
				lineHeight : doObj.find('input[name="lineHeight"]'),
				spriteSheet : doObj.find('select[name="spriteSheet"]'),
				// frameAnimation : doObj.find('select[name="frameAnimation"]'),
				currentAnimationFrame : doObj.find('input[name="currentAnimationFrame"]'),
				currentFrame : doObj.find('input[name="currentFrame"]'),
				framerate : doObj.find('input[name="framerate"]'),
				paused : doObj.find('input[name="paused"]'),
				sourceRect :
				{
					btn : doObj.find('input[name="sourceRect"]'),
					x : doObj.find('input[name="sourceRect.x"]'),
					y : doObj.find('input[name="sourceRect.y"]'),
					width : doObj.find('input[name="sourceRect.width"]'),
					height : doObj.find('input[name="sourceRect.height"]')
				},
				mouseEnabled : doObj.find('input[name="mouseEnabled"]'),
				tickEnabled : doObj.find('input[name="tickEnabled"]'),
				mouseChildren : doObj.find('input[name="mouseChildren"]'),
				tickChildren : doObj.find('input[name="tickChildren"]'),
				numChildren : doObj.find('input[name="numChildren"]'),
				hitArea :
				{
					btn : doObj.find('input[name="hitArea"]'),
					x : doObj.find('input[name="hitArea.x"]'),
					y : doObj.find('input[name="hitArea.y"]'),
					scaleX : doObj.find('input[name="hitArea.scaleX"]'),
					scaleY : doObj.find('input[name="hitArea.scaleY"]'),
					regX : doObj.find('input[name="hitArea.regX"]'),
					regY : doObj.find('input[name="hitArea.regY"]'),
					rotation : doObj.find('input[name="hitArea.rotation"]')
				},
				mask :
				{
					btn : doObj.find('input[name="mask"]'),
					x : doObj.find('input[name="mask.x"]'),
					y : doObj.find('input[name="mask.y"]'),
					scaleX : doObj.find('input[name="mask.scaleX"]'),
					scaleY : doObj.find('input[name="mask.scaleY"]'),
					regX : doObj.find('input[name="mask.regX"]'),
					regY : doObj.find('input[name="mask.regY"]'),
					rotation : doObj.find('input[name="mask.rotation"]')
				},
				shadow :
				{
					btn : doObj.find('input[name="shadow"]'),
					color : doObj.find('input[name="shadow.color"]'),
					offsetX : doObj.find('input[name="shadow.offsetX"]'),
					offsetY : doObj.find('input[name="shadow.offsetY"]'),
					blur : doObj.find('input[name="shadow.blur"]')
				},
				cacheCanvas : doObj.find('input[name="cacheCanvas"]'),
				compositeOperation : doObj.find('select[name="compositeOperation"]')
			};
		},

		getDisplayObjectType : function(disObj)
		{
			if ( disObj instanceof createjs.Container ) return 'container';
			else if ( disObj instanceof createjs.Bitmap ) return 'bitmap';
			else if ( disObj instanceof createjs.Sprite ) return 'sprite';
			else if ( disObj instanceof createjs.Text ) return 'text';
			else if ( disObj instanceof createjs.Shape ) return 'shape';
			else return 'other';
		},

		// sets the selected display object, and shows the available input fields
		displayObjectSet : function(disObj)
		{
			this.selected = disObj;

			var type = this.getDisplayObjectType( disObj );
			var doObj = $('.edit-box.display-object .edit-content').show();
			var dtFor = doObj.find('dt').show().filter('[data-for]').hide();
			var ddFor = doObj.find('dd').show().filter('[data-for]').hide();
			dtFor.filter('[data-for~="' + type + '"]').show();
			ddFor.filter('[data-for~="' + type + '"]').show();

			// and now for hitAreas
			dtFor.filter('[data-for~="hitArea"]')[disObj.hitArea ? 'show' : 'hide']();
			ddFor.filter('[data-for~="hitArea"]')[disObj.hitArea ? 'show' : 'hide']();

			// ...and masks
			dtFor.filter('[data-for~="mask"]')[disObj.mask ? 'show' : 'hide']();
			ddFor.filter('[data-for~="mask"]')[disObj.mask ? 'show' : 'hide']();

			// ...and sourceRect
			dtFor.filter('[data-for~="sourceRect"]')[disObj.sourceRect ? 'show' : 'hide']();
			ddFor.filter('[data-for~="sourceRect"]')[disObj.sourceRect ? 'show' : 'hide']();

			// ...and shadows
			dtFor.filter('[data-for~="shadow"]')[disObj.shadow ? 'show' : 'hide']();
			ddFor.filter('[data-for~="shadow"]')[disObj.shadow ? 'show' : 'hide']();

			// set the sprite sheet, and list the animations
			if ( type === 'sprite' && this.queue )
			{
				var items = this.queue.getItems();
				for ( var i = 0, item; i < items.length; i++ )
				{
					item = items[i];

					if ( item.item.type !== 'spritesheet' ) continue;

					for ( var j = 0, match = true; match && j < item.result._images.length; j++ )
						if ( !disObj.spriteSheet._images[j] || item.result._images[j].src !== disObj.spriteSheet._images[j].src )
							match = false;

					// found the sprite sheet, now list the animations
					if ( match )
					{
						this._doFields.spriteSheet.val( item.item.id );
						this._doFields.frameAnimation.hide().filter('[data-id="' + item.item.id + '"]').show();
					}
				}
			}

			// show the custom properties
			this.displayObjectShowCustom( disObj );

			// show it in the hierarchy
			$('.edit-box.hierarchy li').removeClass('selected').filter('li[data-id="' + disObj.id + '"]').addClass('selected');
		},

		displayObjectShowCustom : function(disObj)
		{
			// show the custom properties
			$('.edit-box.display-object .edit-content dl.content-custom').empty();

			var type = this.getDisplayObjectType(disObj);
			var other = new createjs[ucwords(type)]();
			var custom = [];

			// get the unique properties
			for ( var prop in disObj )
			{
				if ( typeof other[prop] === 'undefined' && typeof disObj[prop] !== 'undefined' )
					custom.push( prop );
			}

			//
		},

		// from the update
		displayObjectUpdateFields : function(disObj)
		{
			if ( !edit.selected )
				return;

			var doField = this._doFields;
			var type = this.getDisplayObjectType(disObj);

			if ( !doField.visible.is(':focus') )
				doField.visible.prop('checked', disObj.visible);
			if ( !doField.name.is(':focus') )
				doField.name.val( disObj.name );
			if ( !doField.x.is(':focus') )
				doField.x.val( disObj.x.toFixed(1) );
			if ( !doField.y.is(':focus') )
				doField.y.val( disObj.y.toFixed(1) );
			if ( this.zIndex && !doField.zIndex.is(':focus') )
				doField.zIndex.val( disObj.zIndex );
			if ( !doField.scaleX.is(':focus') )
				doField.scaleX.val( disObj.scaleX.toFixed(2) );
			if ( !doField.scaleY.is(':focus') )
				doField.scaleY.val( disObj.scaleY.toFixed(2) );
			if ( !doField.regX.is(':focus') )
				doField.regX.val( disObj.regX.toFixed(1) );
			if ( !doField.regY.is(':focus') )
				doField.regY.val( disObj.regY.toFixed(1) );
			if ( !doField.skewX.is(':focus') )
				doField.skewX.val( disObj.skewX.toFixed(1) );
			if ( !doField.skewY.is(':focus') )
				doField.skewY.val( disObj.skewY.toFixed(1) );
			if ( !doField.rotation.is(':focus') )
				doField.rotation.val( disObj.rotation.toFixed(1) );
			if ( !doField.alpha.is(':focus') )
				doField.alpha.val( disObj.alpha.toFixed(2) );
			if ( !doField.cursor.is(':focus') )
				doField.cursor.val( disObj.cursor );
			if ( !doField.mouseEnabled.is(':focus') )
				doField.mouseEnabled.prop('checked', disObj.mouseEnabled);
			if ( !doField.tickEnabled.is(':focus') )
				doField.tickEnabled.prop('checked', disObj.tickEnabled);
			if ( !doField.compositeOperation.is(':focus') )
				doField.compositeOperation.val( disObj.compositeOperation );
			// if ( !doField.parent.is(':focus') )
			// 	doField.parent.val( disObj.parent.toString() );

			if ( !doField.reg.is(':focus') )
			{
				var b = disObj.getBounds(), regX = disObj.regX, regY = disObj.regY;

				if ( b )
				{
					regX = !regX ? 'left' : regX === b.width * 0.5 ? 'center' : regX === b.width ? 'right' : null;
					regY = !regY ? 'top' : regY === b.height * 0.5 ? 'middle' : regY === b.height ? 'bottom' : null;
				}

				doField.reg.val( regX && regY && b ? regY + '-' + regX : 'custom' );
			}

			// hitArea
			doField.hitArea.btn.val( disObj.hitArea ? 'remove hitArea' : 'add hitArea' );
			if ( disObj.hitArea )
			{
				if ( !doField.hitArea.x.is(':focus') )
					doField.hitArea.x.val( disObj.hitArea.x.toFixed(1) );
				if ( !doField.hitArea.y.is(':focus') )
					doField.hitArea.y.val( disObj.hitArea.y.toFixed(1) );
				if ( !doField.hitArea.scaleX.is(':focus') )
					doField.hitArea.scaleX.val( disObj.hitArea.scaleX.toFixed(1) );
				if ( !doField.hitArea.scaleY.is(':focus') )
					doField.hitArea.scaleY.val( disObj.hitArea.scaleY.toFixed(1) );
				if ( !doField.hitArea.regX.is(':focus') )
					doField.hitArea.regX.val( disObj.hitArea.regX.toFixed(1) );
				if ( !doField.hitArea.regY.is(':focus') )
					doField.hitArea.regY.val( disObj.hitArea.regY.toFixed(1) );
				if ( !doField.hitArea.rotation.is(':focus') )
					doField.hitArea.rotation.val( disObj.hitArea.rotation.toFixed(1) );
			}

			// masks
			doField.mask.btn.val( disObj.mask ? 'remove mask' : 'add mask' );
			if ( disObj.mask )
			{
				if ( !doField.mask.x.is(':focus') )
					doField.mask.x.val( disObj.mask.x.toFixed(1) );
				if ( !doField.mask.y.is(':focus') )
					doField.mask.y.val( disObj.mask.y.toFixed(1) );
				if ( !doField.mask.scaleX.is(':focus') )
					doField.mask.scaleX.val( disObj.mask.scaleX.toFixed(1) );
				if ( !doField.mask.scaleY.is(':focus') )
					doField.mask.scaleY.val( disObj.mask.scaleY.toFixed(1) );
				if ( !doField.mask.regX.is(':focus') )
					doField.mask.regX.val( disObj.mask.regX.toFixed(1) );
				if ( !doField.mask.regY.is(':focus') )
					doField.mask.regY.val( disObj.mask.regY.toFixed(1) );
				if ( !doField.mask.rotation.is(':focus') )
					doField.mask.rotation.val( disObj.mask.rotation.toFixed(1) );
			}

			// shadows
			doField.shadow.btn.val( disObj.shadow ? 'remove shadow' : 'add shadow' );
			if ( disObj.shadow )
			{
				if ( !doField.shadow.color.is(':focus') )
					doField.shadow.color.val( disObj.shadow.color );
				if ( !doField.shadow.offsetX.is(':focus') )
					doField.shadow.offsetX.val( disObj.shadow.offsetX.toFixed(1) );
				if ( !doField.shadow.offsetY.is(':focus') )
					doField.shadow.offsetY.val( disObj.shadow.offsetY.toFixed(1) );
				if ( !doField.shadow.blur.is(':focus') )
					doField.shadow.blur.val( disObj.shadow.blur.toFixed(1) );
			}

			// only update certain fields
			switch ( type )
			{
				case 'text' :
				{
					doField.cacheCanvas.val( disObj.cacheCanvas ? 'uncache' : 'cache' );
					if ( !doField.text.is(':focus') )
						doField.text.val( disObj.text );
					if ( !doField.font.is(':focus') )
						doField.font.val( disObj.font );
					if ( !doField.color.is(':focus') )
						doField.color.val( disObj.color );
					if ( !doField.textAlign.is(':focus') )
						doField.textAlign.val( disObj.textAlign );
					if ( !doField.textBaseline.is(':focus') )
						doField.textBaseline.val( disObj.textBaseline );
					if ( !doField.outline.is(':focus') )
						doField.outline.val( disObj.outline );
					if ( !doField.lineWidth.is(':focus') )
						doField.lineWidth.val( disObj.lineWidth ? disObj.lineWidth.toFixed(1) : '' );
					if ( !doField.maxWidth.is(':focus') )
						doField.maxWidth.val( disObj.maxWidth ? disObj.maxWidth.toFixed(1) : '' );
					break;
				}
				case 'sprite' :
				{
					if ( !doField.frameAnimation.filter(':visible').is(':focus') )
						doField.frameAnimation.filter(':visible').val( disObj.currentAnimation );
					if ( !doField.currentAnimationFrame.is(':focus') )
						doField.currentAnimationFrame.val( disObj.currentAnimationFrame );
					if ( !doField.currentFrame.is(':focus') )
						doField.currentFrame.val( disObj.currentFrame );
					if ( !doField.framerate.is(':focus') )
						doField.framerate.val( disObj.framerate );
					if ( !doField.paused.is(':focus') )
						doField.paused.val( disObj.paused );
					break;
				}
				case 'bitmap' :
				{
					doField.sourceRect.btn.val( disObj.sourceRect ? 'remove sourceRect' : 'add sourceRect' );

					var x = doField.sourceRect.x.show(),
						y = doField.sourceRect.y.show(),
						w = doField.sourceRect.width.show(),
						h = doField.sourceRect.height.show();

					if ( disObj.sourceRect )
					{
						if ( !x.is(':focus') )
							x.val( disObj.sourceRect.x.toFixed(1) );
						if ( !y.is(':focus') )
							y.val( disObj.sourceRect.y.toFixed(1) );
						if ( !w.is(':focus') )
							w.val( disObj.sourceRect.width.toFixed(1) );
						if ( !h.is(':focus') )
							h.val( disObj.sourceRect.height.toFixed(1) );
					}
					else
					{
						x.hide(); y.hide(); w.hide(); h.hide();
					}
					break;
				}
				case 'container' :
				{
					doField.cacheCanvas.val( disObj.cacheCanvas ? 'uncache' : 'cache' );
					if ( !doField.mouseChildren.is(':focus') )
						doField.mouseChildren.prop('checked', disObj.mouseChildren);
					if ( !doField.tickChildren.is(':focus') )
						doField.tickChildren.prop('checked', disObj.tickChildren);
					if ( !doField.numChildren.is(':focus') )
						doField.numChildren.val( disObj.numChildren );
					break;
				}
			}
		},

		// from the input field
		displayObjectFieldUpdate : function(prop, value)
		{
			var disObj = this.selected;
			if ( !disObj ) return;

			// its a checkbox
			if ( /(visible|mouseEnabled|tickEnabled|mouseChildren|tickChildren|paused)/i.test(prop) )
				disObj[prop] = value;

			// set the reg
			else if ( prop === 'reg' )
			{
				if ( value !== 'custom' )
				{
					var b = disObj.getBounds(),
						regX = value.indexOf('-center') > -1 ? b.width * 0.5 : value.indexOf('-right') > -1 ? b.width : 0,
						regY = value.indexOf('middle-') > -1 ? b.height * 0.5 : value.indexOf('bottom-') > -1 ? b.height : 0;

					disObj.set({ regX : regX, regY : regY });
				}
			}

			// source rect button or properties
			else if ( prop.indexOf('sourceRect') > -1 )
			{
				if ( prop === 'sourceRect' )
				{
					if ( disObj.sourceRect ) disObj.sourceRect = null;
					else disObj.sourceRect = new createjs.Rectangle(0, 0, 100, 100);
					this.displayObjectSet(disObj);
				}
				else
				{
					var p = prop.split('.').pop();
					disObj.sourceRect[p] = parseFloat(value);
				}
			}
			// hitArea button or properties
			else if ( prop.indexOf('hitArea') > -1 )
			{
				if ( prop === 'hitArea' )
				{
					if ( disObj.hitArea ) disObj.hitArea = null;
					else disObj.hitArea = new createjs.Shape( new createjs.Graphics().f('#fff').dc(0, 0, 32) ).set({ x : disObj.x, y : disObj.y });
					this.displayObjectSet(disObj);
				}
				else
				{
					var p = prop.split('.').pop();
					disObj.hitArea[p] = parseFloat(value);
				}
			}
			// mask button or properties
			else if ( prop.indexOf('mask') > -1 )
			{
				if ( prop === 'mask' )
				{
					if ( disObj.mask ) disObj.mask = null;
					else disObj.mask = new createjs.Shape( new createjs.Graphics().f('#fff').dc(0, 0, 32) ).set({ x : disObj.x, y : disObj.y });
					this.displayObjectSet(disObj);
				}
				else
				{
					var p = prop.split('.').pop();
					disObj.mask[p] = parseFloat(value);
				}
			}
			// mask button or properties
			else if ( prop.indexOf('shadow') > -1 )
			{
				if ( prop === 'shadow' )
				{
					if ( disObj.shadow ) disObj.shadow = null;
					else disObj.shadow = new createjs.Shadow('#000', 0, 8, 0);
					this.displayObjectSet(disObj);
				}
				else
				{
					var p = prop.split('.').pop();
					disObj.shadow[p] = isNumber(value) ? parseFloat(value) : value;
				}
			}
			// button
			else if ( prop === 'cacheCanvas' )
			{
				if ( disObj.cacheCanvas ) disObj.cacheCanvas = null;
				else
				{
					var b = disObj.getBounds();
					disObj.cache(b.x, b.y, b.width, b.height);
				}
				// value.value = disObj.cacheCanvas ? 'uncache' : 'cache';
			}
			// image, for bitmaps
			else if ( prop === 'image' )
			{
				if ( this.queue )
					disObj[prop] = this.queue.getResult(value);
			}
			// sprite sheet
			else if ( prop === 'spriteSheet' )
			{
				if ( this.queue )
				{
					disObj.spriteSheet = this.queue.getResult( value );
					disObj.gotoAndPlay( disObj.spriteSheet._animations[0] ); // play something!
				}
			}
			// frame/current animation
			else if ( prop === 'frameAnimation' )
				disObj.gotoAndPlay( value );
			// default
			else
				disObj[prop] = isNaN(value) ? value : value ? parseFloat(value) : null;

			// update the hierarchy
			if ( prop === 'name' )
				$('.edit-box.hierarchy li[data-id="' + disObj.id + '"] div:eq(0)').html( disObj.toString() );
			else if ( prop === 'zIndex' )
				$('.edit-box.hierarchy li[data-id="' + disObj.id + '"]').attr('data-zIndex', value);

			// console.log(prop, value, isNaN(value), this.selected[prop]);
		},

		displayObjectAdd : function()
		{
			// need a stage!
			if ( !edit.stage ) return;

			var disObj;

			// create the display object depending on the type
			switch ( arguments[0] )
			{
				case 'bitmap' : { disObj = new createjs.Bitmap(edit.queue.getResult(arguments[1])); break; }
				case 'spritesheet' : { disObj = new createjs.Sprite(edit.queue.getResult(arguments[1]), arguments[2]); break; }
				case 'text' : { disObj = new createjs.Text('Some Text', '32px arial', '#f00'); break; }
				case 'shape' : { disObj = new createjs.Shape( new createjs.Graphics().f('#f00').dr(0, 0, 32) ); break; }
				default : disObj = new createjs[ ucwords(arguments[0]) ]; break;
			}

			// by default, lets center it
			if ( /(bitmap|spritesheet)/.test(arguments[0]) )
			{
				var bounds = disObj.getBounds();
				disObj.regX = bounds.width * 0.5;
				disObj.regY = bounds.height * 0.5;
			}

			return disObj;
		},

		_exportInfo : { type : '', con : 0, sprite : 0, bitmap : 0, text : 0, shape : 0 },
		displayObjectExport : function(disObj, type)
		{
			if ( type )
			{
				this._exportInfo.type = type;
				this._exportInfo.con = this._exportInfo.sprite = this._exportInfo.bitmap = this._exportInfo.text = this._exportInfo.shape = 0;
			}

			var code = [];
			var type = this.getDisplayObjectType(disObj);
			var varName = this.displayObjectExportVarName(disObj);

			if ( type === 'container' )
			{
				for ( var i = 0, kids = []; i < disObj.children.length; i++ )
					kids.push( this.displayObjectExport(disObj.children[i]) );

				for ( var i = 0, kidNames = []; this._exportInfo.type === 'code' && i < kids.length; i++ )
				{
					for ( var j = 0; j < kids[i].length; j++ )
					{
						kidNames.push( kids[i][j].varName ); // keep track of the names
						code.push( kids[i][j] );
					}
				}

				var custom = this.displayObjectExportCompare(disObj, new createjs.Container());

				if ( this._exportInfo.type === 'code' )
					code.push(
						// 'var ' + varName + ' = new ' + exportPrefixCJS + '.Container()' + custom + ';',
						// varName + '.addChild(' + kidNames.join(',') + ');'
						{ varName : varName, code : 'var ' + varName + ' = new ' + exportPrefixCJS + '.Container()' + custom + ';' },
						{ varName : '', code : varName + '.addChild(' + kidNames.join(',') + ');' }
					);
				else
					code.push( $.extend(custom, { _type : 'container', children : kids }) );
			}
			else if ( type === 'sprite' )
			{
				var custom = this.displayObjectExportCompare(disObj, new createjs.Sprite(disObj.spriteSheet, disObj.currentAnimation));

				if ( this._exportInfo.type === 'code' )
					code.push({ varName : varName, code : 'var ' + varName + ' = new ' + exportPrefixCJS + '.Sprite("' + disObj.spriteSheet + '", "' + disObj.currentAnimation + '")' + custom + ';' });
				else
					code.push( $.extend(custom, { _type : 'sprite', _frameOrAnimation : disObj.currentAnimation }) );
			}
			else if ( type === 'bitmap' )
			{
				var custom = this.displayObjectExportCompare(disObj, new createjs.Bitmap());

				if ( this._exportInfo.type === 'code' )
					code.push({ varName : varName, code : 'var ' + varName + ' = new ' + exportPrefixCJS + '.Bitmap("' + disObj.image.src + '")' + custom + ';' });
				else
					code.push( $.extend(custom, { _type : 'bitmap', _src : disObj.image.src }) );
			}
			else if ( type === 'text' )
			{
				var custom = this.displayObjectExportCompare(disObj, new createjs.Text(disObj.text, disObj.font, disObj.color));

				if ( this._exportInfo.type === 'code' )
					code.push({ varName : varName, code : 'var ' + varName + ' = new ' + exportPrefixCJS + '.Text("' + disObj.text + '", "' + disObj.font + '", "' + disObj.color + '")' + custom + ';' });
				else
					code.push( $.extend(custom, { _type : 'text', text : disObj.text, font : disObj.font, color : disObj.color }) );
			}
			else if ( type === 'shape' )
			{
				var custom = this.displayObjectExportCompare(disObj, new createjs.Shape());
				var gCustom = this.displayObjectExportGraphics(disObj.graphics);

				if ( this._exportInfo.type === 'code' )
					code.push({ varName : varName, code : 'var ' + varName + ' = new ' + exportPrefixCJS + '.Shape( new ' + exportPrefixCJS + '.Graphics()' + gCustom + ' )' + custom + ';' });
				else
					code.push( $.extend(custom, { _type : 'shape', graphics : gCustom }) );
			}

			// hitarea?
			if ( disObj.hitArea )
			{
				var custom = this.displayObjectExportCompare(disObj.hitArea, new createjs.Shape());
				var gCustom = this.displayObjectExportGraphics(disObj.hitArea.graphics);

				if ( this._exportInfo.type === 'code' )
					code[code.length - 1].code += "\n" + varName + '.hitArea = new ' + exportPrefixCJS + '.Shape( new ' + exportPrefixCJS + '.Graphics()' + gCustom + ' )' + custom + ';';
				else
					code[code.length - 1].hitArea = $.extend(custom, { _type : 'shape', graphics : gCustom });
			}

			// mask?
			if ( disObj.mask )
			{
				var custom = this.displayObjectExportCompare(disObj.mask, new createjs.Shape());
				var gCustom = this.displayObjectExportGraphics(disObj.mask.graphics);

				if ( this._exportInfo.type === 'code' )
					code[code.length - 1].code += "\n" + varName + '.mask = new ' + exportPrefixCJS + '.Shape( new ' + exportPrefixCJS + '.Graphics()' + gCustom + ' )' + custom + ';';
				else
					code[code.length - 1].mask = $.extend(custom, { _type : 'shape', graphics : gCustom });
			}

			// shadow?
			if ( disObj.shadow )
			{
				var custom = this.displayObjectExportCompare(disObj.shadow, new createjs.Shadow());
				var gCustom = this.displayObjectExportGraphics(disObj.shadow);

				if ( this._exportInfo.type === 'code' )
					code[code.length - 1].code += "\n" + varName + '.shadow = new ' + exportPrefixCJS + '.Shadow()' + custom + ';';
				else
					code[code.length - 1].shadow = custom;
			}

			return code;

			// return the code, its recursive
			if ( !type )
			{
				console.log('here');
				return code;
			}
			else
			{
				console.log('there');
				// return the code to be printed out
				// for ( var i = 0, lines = []; i < code.length; i++ )
				// 	lines.push( this._exportInfo.type === 'code' ? code[i] : code[i] );

				return code;
			}
		},

		displayObjectExportVarName : function(disObj)
		{
			var type = this.getDisplayObjectType(disObj);

			if ( type === 'container' ) return 'con' + (++this._exportInfo.con);
			else if ( type === 'sprite' ) return 'spr' + (++this._exportInfo.sprite);
			else if ( type === 'bitmap' ) return 'bmp' + (++this._exportInfo.bitmap);
			else if ( type === 'text' ) return 'txt' + (++this._exportInfo.text);
			else if ( type === 'shape' ) return 'shp' + (++this._exportInfo.shape);
		},

		displayObjectExportCompare : function(original, compareTo)
		{
			// props to ignore
			var custom = {};

			for ( var prop in original )
			{
				var value = original[prop];
				var type = typeof value;

				if ( prop.charAt(0) === '_' || type === 'function' || type === 'object' )
					continue;

				// its different from the comparison, save it
				if ( compareTo[prop] !== original[prop] )
				{
					if ( isNumber(value) )
					{
						if ( /(scale|alpha)/i.test(prop) ) value = value.toFixed(2);
						else value = value.toFixed(1);
					}

					// keep it
					custom[prop] = isNaN(value) ? value : parseFloat(value);
				}
			}

			// this doesn't get picked up
			if ( this.zIndex && original.zIndex )
				custom.zIndex = original.zIndex;

			return this._exportInfo.type === 'json' ? custom : !$.isEmptyObject(custom) ? '.set(' + JSON.stringify(custom) + ')' : '';
		},

		displayObjectExportGraphics : function(graphic)
		{
			var G = createjs.Graphics;
			var code = [];

			for ( var i = 0, g; i < graphic._instructions.length; i++ )
			{
				g = graphic._instructions[i];

				if ( g instanceof G.BeginPath || g instanceof G.ClosePath ) {}
				else if ( g instanceof G.LineTo ) { code.push('lt(' + g.x + ',' + g.y + ')'); }
				else if ( g instanceof G.MoveTo ) { code.push('mt(' + g.x + ',' + g.y + ')'); }
				else if ( g instanceof G.ArcTo ) { code.push('at(' + g.x1 + ',' + g.y1 + ',' + g.x2 + ',' + g.y2 + ',' + g.radius + ')'); }
				else if ( g instanceof G.Arc ) { code.push('a(' + g.x + ',' + g.y + ',' + g.radius + ',' + g.startAngle + ',' + g.endAngle + ',' + g.anticlockwise + ')'); }
				else if ( g instanceof G.QuadraticCurveTo ) { code.push('qt(' + g.cpx + ',' + g.cpy + ',' + g.x + ',' + g.y + ')'); }
				else if ( g instanceof G.BezierCurveTo ) { code.push('bt(' + g.cp1x + ',' + g.cp1y + ',' + g.cp2x + ',' + g.cp2y + ',' + g.x + ',' + g.y + ')'); }
				else if ( g instanceof G.Rect ) { code.push('r(' + g.x + ',' + g.y + ',' + g.w + ',' + g.h + ')'); }
				else if ( g instanceof G.Fill ) { code.push('f("' + g.style + '"' + (g.matrix ? ',' + g.matrix : '') + ')'); }
				else if ( g instanceof G.Stroke ) { code.push('s("' + g.style + '",' + g.ignoreScale + ')'); }
				else if ( g instanceof G.StrokeStyle ) { code.push('ss(' + g.width + ',' + g.caps + ',' + g.joints + ',' + g.miterLimit + ',' + g.ignoreScale + ')'); }
				else if ( g instanceof G.StrokeDash ) { code.push('sd(' + g.segments + ',' + g.offset + ')'); }
				else if ( g instanceof G.RoundRect ) { code.push('rr(' + g.x + ',' + g.y + ',' + g.w + ',' + g.h + ',' + g.radiusTL + ',' + g.radiusTR + ',' + g.radiusBR + ',' + g.radiusBL + ')'); }
				else if ( g instanceof G.Circle ) { code.push('dc(' + g.x + ',' + g.y + ',' + g.radius + ')'); }
				else if ( g instanceof G.Ellipse ) { code.push('de(' + g.x + ',' + g.y + ',' + g.w + ',' + g.h + ')'); }
				else if ( g instanceof G.PolyStar ) { code.push('dp(' + g.x + ',' + g.y + ',' + g.radius + ',' + g.sides + ',' + g.pointSize + ',' + g.angle + ')'); }
			}

			return code.length ? '.' + code.join('.') : '';
		},

		hierarchySetup : function()
		{
			$(document.body).append(
				'<div class="edit-box hierarchy" style="top:0">' +
					'<h3>Display Objects</h3>' +
					'<div class="edit-content" style="margin-bottom:18px">' +
						'<select name="type" style="width:70%">' +
							'<option value="container">Container</option>' +
							'<option value="spritesheet">Sprite</option>' +
							'<option value="bitmap">Bitmap</option>' +
							'<option value="shape">Shape</option>' +
							'<option value="text">Text</option>' +
						'</select> ' +
						'<input type="button" value="Add Type" />' +
						'<div class="type-container"></div>' +
						'<div class="type-spritesheet" style="display:none"></div>' +
						'<div class="type-bitmap" style="display:none"></div>' +
						'<div class="type-shape" style="display:none"></div>' +
						'<div class="type-text" style="display:none"></div>' +
					'</div>' +
					'<input type="button" value="Refresh" style="float:right;margin-top:4px" />' +
					'<h3>Hierarchy</h3>' +
					'<div class="edit-content" style="clear:both">' +
						'<ul style="margin:0"></ul>' +
					'</div>' +
				'</div>'
			);

			// for quicker reference, and to set the stage's id as a data-id attr
			this._ulObj = $('.edit-box.hierarchy div.edit-content:eq(1) ul').attr('data-id', this.stage.id);

			$('.edit-box.hierarchy ul').nestedSortable(
			{
				items : 'li',
				toleranceElement : '> div',
				placeholder : 'placeholder',
				forcePlaceholderSize : true,
				disableNestingClass : 'disabled',
				relocate : this.hierarchySort
			});

			$('.edit-box.hierarchy')
				.on('change', 'select[name="type"]', function()
				{
					$(this).parent().find('div').hide().filter('div[class="type-' + $(this).val() + '"]').show();
				})
				.on('change', 'select[name="spritesheet"]', function()
				{
					$(this).parent().find('select').not(this).hide().filter('select[data-id="' + $(this).val() + '"]').show();
				})
				.on('click', 'div:not(.edit-content)', function()
				{
					var id = parseFloat($(this).parent().attr('data-id'));

					if ( id )
						edit.displayObjectSet( edit.stage.getChildById(id, true) );
				})
				.on('dblclick', 'div:not(.edit-content)', function()
				{
					var ul = $(this).parent().find('ul:eq(0)').toggle();
					if ( ul.length )
						$(this).parent().find('span:eq(0)').html( ul.is(':visible') ? '-' : '+' );
				})
				// add the display object
				.on('click', 'input[value="Add Type"]', function()
				{
					var hObj = $('.edit-box.hierarchy .edit-content:eq(0)');
					var type = $(this).prev().val();
					var disObj;

					if ( type === 'bitmap' )
						disObj = edit.displayObjectAdd(type, hObj.find('.type-bitmap select').val());
					else if ( type === 'spritesheet' )
						disObj = edit.displayObjectAdd(type, hObj.find('select[name="spritesheet"]').val(), hObj.find('select[name="frameAnimation"]:visible').val());
					else
						disObj = edit.displayObjectAdd(type);

					if ( disObj )
					{
						// adds to the stage, or the selected container, or the parent of the selected if not a container
						var p = edit.stage;
						if ( edit.selected )
							p = edit.selected instanceof createjs.Container && !(edit.selected instanceof createjs.MovieClip) ? edit.selected : edit.selected.parent;

						p.addChild( disObj );
						edit.hierarchyListener(); // update the hierarchy
						edit.displayObjectSet( disObj ); // now we highlight it
					}
				})
				.on('click', 'input[value="Refresh"]', function()
				{
					edit.hierarchyListener();
				})
				.on('click', function()
				{
					$('.edit-box.display-object input').blur();
					$('.edit-box.display-object select').blur();
				});
		},

		hierarchyListener : function(parent)
		{
			parent = parent || edit.stage;

			// works for now
			if ( !edit._ulObj.find('li.placeholder').length )
			{
				// keep track of all the initial id's
				if ( parent === edit.stage )
				{
					edit._startIds = [];
					edit._endIds = [];

					edit._ulObj.find('li').each(function(i, li) { edit._startIds.push( parseFloat($(li).attr('data-id')) ); });
				}

				for ( var i = 0; i < parent.children.length; i++ )
				{
					var child = parent.children[i];
					var isContainer = child instanceof createjs.Container;// && !(child instanceof createjs.MovieClip);

					edit._endIds.push( child.id );

					var li = edit._ulObj.find('li[data-id="' + child.id + '"]');
					if ( !li.length )
						li = $('<li data-id="' + child.id + '" class="' + (!isContainer ? 'mjs-nestedSortable-disabled' : '') + '"><span>' + (isContainer ? '+' : '&nbsp;') + '</span><div>' + child.toString() + '</div>' + (isContainer ? '<ul style="display:none"></ul>' : '') + '</li>');

					// update the zIndex attribute
					li.attr('data-zIndex', this.zIndex ? child.zIndex : parent.children.indexOf(child));

					var ulObj;
					var liList;

					// add to the root UL because the parent is the stage
					if ( child.parent === edit.stage )
						ulObj = edit._ulObj;

					// add to the parent container
					// else if ( parseFloat(li.parent().parent().attr('data-id')) !== child.parent.id )
					else if ( parseFloat(li.parent().parent().attr('data-id')) !== child.parent.id )
						ulObj = edit._ulObj.find('li[data-id="' + child.parent.id + '"] ul:eq(0)');

					// add to it, find the others, and sort them, OR just sort
					if ( ulObj )
						liList = ulObj.append(li).find('> li');
					else
						liList = li.closest('ul').find('> li');

					if ( li.index() !== child.parent.children.indexOf(child) )
						liList.sort(edit.hierarchySort2).appendTo( ulObj || li.closest('ul') );

					// it has children
					if ( isContainer )
						edit.hierarchyListener(child);
				}
			}

			// start all over again
			if ( parent === edit.stage )
			{
				// remove all the li's that don't exist anymore
				for ( var i = 0; i < edit._endIds.length; i++ )
				{
					var index = edit._startIds.indexOf(edit._endIds[i]);
					if ( index > -1 )
						edit._startIds.splice(index, 1);
				}

				// removes them
				for ( i = 0; i < edit._startIds.length; i++ )
					edit._ulObj.find('li[data-id="' + edit._startIds[i] + '"]').remove();

				// stop the prvious, and then start again
				clearTimeout(edit._hierarchyTimeout);
				edit._hierarchyTimeout = setTimeout(edit.hierarchyListener, edit.hierarchyTimer);
			}
		},

		hierarchySort : function(e, obj)
		{
			var li = $(obj.item);
			var id = parseFloat( li.attr('data-id') );
			var parentId = parseFloat( li.parent().closest('li').attr('data-id') );

			var child = edit.stage.getChildById(id, true);
			var parent = isNaN(parentId) ? edit.stage : edit.stage.getChildById(parentId, true);

			var index = li.index();
			var lis = li.closest('ul').find('> li');
			var otherLi = null;
			var dir = 0;

			if ( this.zIndex )
			{
				if ( lis.eq(index + 1).length ) { otherLi = lis.eq(index + 1); dir = -1; }
				else if ( lis.eq(index - 1).length ) { otherLi = lis.eq(index - 1); dir = 1; }

				if ( otherLi )
				{
					child.zIndex = parseFloat(otherLi.attr('data-zIndex')) + dir;
					li.attr('data-zIndex', child.zIndex);
				}

				var pt = child.parent.localToLocal(child.x, child.y, parent);

				parent.addChild( child.set({ x : pt.x, y : pt.y }) );
			}
			else
				parent.addChildAt(child, index);
		},

		// called via hierarchyListener
		hierarchySort2 : function(a, b)
		{
			return parseFloat($(b).attr('data-zIndex')) < parseFloat($(a).attr('data-zIndex')) ? 1 : -1;
		}
	};

	function isNumber(n) { return !isNaN(parseFloat(n)) && isFinite(n); }

	function ucwords(s) { return s.toLowerCase().replace(/(^([a-zA-Z\p{M}]))|([ -][a-zA-Z\p{M}])/g, function($1) { return $1.toUpperCase(); }); }

	// add globally
	window.edit = window.edit || edit;

}, false);
(function()
{
	Number.prototype.limit = function(min, max)
	{
		return Math.min(max, Math.max(min, this));
	};

	Number.prototype.round = function(precision)
	{
		precision = Math.pow(10, precision || 0);
		return Math.round(this * precision) / precision;
	};

	Number.prototype.floor = function()
	{
		return Math.floor(this);
	};

	Number.prototype.ceil = function()
	{
		return Math.ceil(this);
	};

	Number.prototype.toInt = function()
	{
		return (this | 0);
	};

	Number.prototype.toRad = function()
	{
		return (this / 180) * Math.PI;
	};

	Number.prototype.toDeg = function()
	{
		return (this * 180) / Math.PI;
	};

	Number.prototype.sign = function()
	{
		if (this !== 0)
		{
			return this < 0 ? -1 : 1;
		}
		else if (this === 0)
		{
			return 0;
		}
	};

	Math.distance = function(point1, point2)
	{
		if (point1 instanceof Array && point2 instanceof Array)
		{
			return Math.sqrt(Math.pow((point1[0] - point2[0]), 2) + Math.pow((point1[1] - point2[1]), 2));
		}
		else
		{
			return Math.sqrt(Math.pow((point1.x - point2.x), 2) + Math.pow((point1.y - point2.y), 2));
		}
	};

	Math.clamp = function(a, low, high)
	{
		return a < low ? low : a > high ? high : a;
	};


	// extension of Math Object corresponding to the Number extension
	Math.lerp = function(current, target, time)
	{
		return current + time * (target - current);
	};


	// returns the number that is in the same relation to ostart and ostop segment
	// that x is to istart and istop segment.
	// expl Math.map(Math.random(), 0, 1, 10, 20); will provide a number between 10 and 20
	// It's linear interpolation.
	Math.map = function(x, istart, istop, ostart, ostop)
	{
		return ostart + (ostop - ostart) * ((x - istart) / (istop - istart));
	};

	// This is the same as clamp, why is it here?
	// returns either x, or the nearest limit if x is out of bounds.
	Math.limit = function(x, min, max)
	{
		return Math.min(max, Math.max(min, x));
	};

	// returns x rounded with the provided number of figures after the decimal.
	// expl1 : Math.roundAt(5.12345, 2) == 5.12  expl2 :  Math.roundAt(41624, -3) ==  42000
	Math.roundAt = function(x, precision)
	{
		if (!precision) return Math.round(x);
		precision = Math.pow(10, precision || 0);
		return Math.round(x * precision) / precision;
	};

	// returns an integer that has the same integer part.
	// if x>0 returns the nearest lowest number, if x<0, returns the nearest highest number ( toInt(-2.6) == -2 )
	Math.toInt = function(x)
	{
		return (x | 0);
	};

	Math.angle = function(pt1, pt2) {
		return Math.atan2(pt1.y - pt2.y, pt1.x - pt2.x);
	};

	//  convert the angle, provided in degrees (0-360), into radians (0-2*PI)
	Math.toRad = function(x)
	{
		return ((x * Math.PI) / 180);
	};

	//  convert the angle, provided in radians (0-2*PI), into degrees (0-360)
	Math.toDeg = function(x)
	{
		return ((x * 180) / Math.PI);
	};

	Math.getRandomArbitrary = function(min, max)
	{
		return Math.random() * (max - min) + min;
	};

	Math.range = function(min, max)
	{
		return Math.floor(Math.random() * (max - min + 1)) + min;
	};

	Math.isEpsilon = function(number)
	{
		return Math.abs(number) < 1e-4;
	};

	Math.lineIntersection = function(line1, line2)
	{
		/*
			line1 and line2 are objects of the form:
			{endpoint1: [x, y], endpoint2: [x, y]}

			the formulation of this function is based on
			https://en.wikipedia.org/wiki/Line-line_intersection#Given_two_points_on_each_line
		*/
		var intersection;
		var x1 = line1.endpoint1[0];
		var y1 = line1.endpoint1[1];
		var x2 = line1.endpoint2[0];
		var y2 = line1.endpoint2[1];
		var x3 = line2.endpoint1[0];
		var y3 = line2.endpoint1[1];
		var x4 = line2.endpoint2[0];
		var y4 = line2.endpoint2[1];

		var denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

		if (denominator === 0)
		{
			// if the denominator is 0, the lines are parallel and have no intersection point.
			intersection = null;
		}
		else
		{
			intersection = [
				((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) /
				denominator,

				((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) /
				denominator
			];
		}

		return intersection;
	};
})();
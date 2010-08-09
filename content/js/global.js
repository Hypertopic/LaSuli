var jsBaseDir = "chrome://lasuli/content/js/";

Array.prototype.remove = function(value)
{
		var j = 0;
		while (j < this.length)
		{
                        if (this[j] == value)
				this.splice(j, 1);
			else
				j++;
		}
}
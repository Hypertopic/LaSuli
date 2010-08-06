var jsBaseDir = "chrome://lasuli/content/js/";

Array.prototype.remove = function(items, value)
{
	var j = 0;
	while (j < items.length)
	{
		if (items[j] == value)
			items.splice(j, 1);
		else
			j++;
	}
}
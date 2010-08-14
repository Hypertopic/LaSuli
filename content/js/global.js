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

/*
* Recursively merge properties of two objects 
*/
function MergeRecursive(obj1, obj2) {

  for (var p in obj2) {
    try {
      // Property in destination object set; update its value.
      if ( obj2[p].constructor==Object ) {
        obj1[p] = MergeRecursive(obj1[p], obj2[p]);

      } else {
        obj1[p] = obj2[p];

      }

    } catch(e) {
      // Property in destination object not set; create it and set its value.
      obj1[p] = obj2[p];

    }
  }

  return obj1;
}
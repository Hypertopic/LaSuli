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

function randomUUID() {
  var s = [], itoh = '0123456789ABCDEF';
  for (var i = 0; i <36; i++) s[i] = Math.floor(Math.random()*0x10);
  s[14] = 4;  // Set 4 high bits of time_high field to version
  s[19] = (s[19] & 0x3) | 0x8;  // Specify 2 high bits of clock sequence
  for (var i = 0; i <36; i++) s[i] = itoh[s[i]];
  s[8] = s[13] = s[18] = s[23] = '';
  return s.join('');
}
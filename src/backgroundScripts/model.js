/*global browser, require */
import Resource from './Resource.js';
import Viewpoint from './Viewpoint.js';

const model = (function () {
  let cache = {};
  let services = [
    'http://argos2.test.hypertopic.org',
    'http://cassandre.hypertopic.org'
  ];
  let db = require('hypertopic')(services);
  let session_uri = services[0] + '/_session';
  let connected_user = '';

	const getDomain = (uri) => {
		if (uri.indexOf('/') === -1) {
			return uri;
		}
		let anchor = document.createElement('a');
		anchor.href = uri;
		return anchor.hostname;
	};

	const isWhitelisted = async (uri) => {
		let match = await browser.storage.local.get('whitelist');
		let list = match['whitelist'];
		if (!list) {
			await browser.storage.local.set({
				whitelist: ['cassandre.hypertopic.org']
			});
			return false;
		} else {
			return (list.indexOf(getDomain(uri)) !== -1);
		}
	};

	const getUuid = (size) => {
		size = size || 32;
		const chars="0123456789abcdef";
		return new Array(size).fill(0).map(function() {
			return chars[Math.floor(Math.random()*chars.length)];
		}).join("");
	}

	const createHighlight = async (uri,viewpoint,topic,coordinates) => {
		if (!topic) topic=getUuid();
		if (!viewpoint) viewpoint=getUuid();
		let items=await getItems(uri);
		if (items && items.item && items.item.length>0) {
			let itemId=items.item[0].id;
			let item=await db.get({_id:itemId})
				.catch(x=>console.error(x));
			var uuid=getUuid();
			item.highlights=item.highlights || {};
			let hl={
				coordinates:[coordinates.startPos,coordinates.endPos],
				text:coordinates.text,
				viewpoint:viewpoint,
				topic:topic
			};
			item.highlights[uuid]=hl;
			let res=await db.post(item);
			hl.id=uuid;
			return hl;
		}
		return false;
	}

	const removeHighlight = async (uri,viewpoint,topic,fragId) => {
		let items=await getItems(uri);
		if (items && items.item && items.item.length>0) {
			let itemId=items.item[0].id;
			let item=await db.get({_id:itemId})
				.catch(x=>console.error(x));
			if (fragId in item.highlights) {
				delete item.highlights[fragId];
				let res=await db.post(item);
				return res;
			}
			return new Promise().resolve();
		}
		return false
	}

	/*
	 * Fetch the item(s) for the given resource (URI)
	 */
	const getItems = async (uri) => {
		let view = await db.getView(`/item/?resource=${uri}`);
		let key = Object.keys(view)[0];
		return key && view[key]; // False if "key" is false
	};

	/*
	 * Fetch the highlights for the given item (corpus + id)
	 */
	const getItemHighlights = async (item) => {
		let view = await db.getView(`/item/${item.corpus}/${item.id}`);
		view = (view && view[item.corpus])
			? view[item.corpus][item.id]
			: {};
		// Only keep items containing highlights
		if (Object.keys(view).length > 2) {
			delete view['resource'];
			delete view['thumbnail'];
			for (let id in view) {
				view[id].id=id;
			}
			return Object.values(view);
		}
		return [];
	};

	const getHighlights = async (uri) => {
		let itemLists = (await getItems(uri)) || {};
		let items = [].concat(... Object.values(itemLists));

		// For each item, run getItemHighlights and getCorpusVps
		// Wait for all highlights and flatten the resulting array
		let hls = Promise.all(items.map(getItemHighlights));
		return {
			highlights: [].concat(... await hls),
		};
	};

	const getViewpoint = async (id) => {
		let view = (await db.getView(`/viewpoint/${id}`))[id];
		if (!view) {
			console.error(`no view for ${id}`);
			return {id:id,topics:[]};
		}
		let vp = {
			id: id,
			user: view.user,
			name: view.name,
			upper: view.upper,
		};
		delete view.user;
		delete view.name;
		delete view.upper;
		vp.topics = Object.keys(view).map(key => {
			view[key].id = key;
			return view[key];
		});
		return vp;
	};

	const getViewpoints = async (ids) => {
		let promises = ids.map(getViewpoint);
		return [].concat(... await Promise.all(promises));
	};

	const getSecond = () => {
		return Date.now() / 1000 | 0;
	};

  const getUserViewpoints = async () => {
    return (!connected_user)? []
      : db.getView(`/user/${connected_user}`)
          .then((x) => x[connected_user].viewpoint.map((y) => y.id))
  }

	/*
	 * Manage a shared cache of the resources (for 10 minutes)
	 */
	const getResource = async (uri, reload) => {
		uri = uri.split('#')[0]; // Remove the fragment if any
		if (!reload && cache[uri]) {
			// Cache invalidation: 10 sec
			if (cache[uri].updated + 10 >= getSecond()) {
				return cache[uri];
			}
		}

		let resolve, reject;
		cache[uri] = new Promise((res, rej) => {
			resolve = res;
			reject = rej;
		});
		cache[uri].updated = getSecond();

    try {
      let viewpoints = {};
      // USER VIEWPOINTS
      let user_viewpoints = await getUserViewpoints();
      user_viewpoints.forEach((id) => {
        viewpoints[id] = viewpoints[id] || new Viewpoint();
      });
      // HIGHLIGHTS VIEWPOINTS
      let data = await getHighlights(uri);
      let highlights = data.highlights;
      highlights.forEach((h) => {
        (h.topic || []).forEach(t => {
          let v = viewpoints[t.viewpoint] || new Viewpoint();
          v.topics[t.id] = v.topics[t.id] || [];
          v.topics[t.id].push(h);
          viewpoints[t.viewpoint] = v;
        });
        delete h.topic;
      });
      let highlights_viewpoints = Object.keys(viewpoints);
      // ALL VIEWPOINTS
      let all_viewpoints = [...new Set([...highlights_viewpoints, ...user_viewpoints])];
			(await getViewpoints(all_viewpoints)).forEach((v) => {
				let vp = viewpoints[v.id];
        vp.name = v.name && v.name[0] || '',
        v.topics.forEach((t) => {
          vp.topics[t.id] = vp.topics[t.id] || [];
          vp.topics[t.id].name = t.name && t.name[0] || ''; // vp.topics is an array with an attribute!
        });
      });

			let res = new Resource();
			res.viewpoints = viewpoints;

			cache[uri].updated = getSecond();
			resolve(res);
		} catch (err) {
			delete cache[uri]; // We failed, drop the entry
			console.error(err);
			reject(err);
			throw err;
		}
		return cache[uri];
	};

  const fetchSession = () => fetch(session_uri, {credentials: 'include'})
    .then(x => x.json());

  const openSession = (user, password) => fetch(session_uri, {
    method:'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body:`name=${user}&password=${password}`,
    credentials:'include'
  })
    .then((x) => {
      if (!x.ok) throw new Error('Bad credentials!');
      connected_user = user;
      return x;
    });

  const closeSession = () => fetch(session_uri, {
    method:'DELETE',
    credentials:'include'
  })
    .then((x) => {
      connected_user = '';
      return x;
    });

  return {
    fetchSession,
    openSession,
    closeSession,
    isWhitelisted,
    getResource,
    createHighlight,
    removeHighlight
  };
}());

export default model;

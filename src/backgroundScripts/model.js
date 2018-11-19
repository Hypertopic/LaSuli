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

  const renameTopic = (vpId,topicId,newName) => {
    return db.get({_id:vpId})
    .catch(x => {
      return {_id:vpId,topics:{},viewpoint_name:"",users:[]};
    })
    .then(vp => {
      if (vp.topics.constructor === Array) vp.topics={};
      vp.viewpoint_name=vp.viewpoint_name || "Sans nom";
      vp.users=vp.users || [];
      let topic=vp.topics[topicId] || {};
      if (!topic.name || topic.name != newName) {
        topic.name=newName;
        vp.topics[topicId]=topic;
        return db.post(vp).then( x => {
          return topic;
        });
      } else {
        return topic;
      }
    });
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

	const getCorpusVps = async (item) => {
		let view = await db.getView(`/corpus/${item.corpus}`);
		let topics = Object.keys(view[item.corpus])
			.filter(key => !(key in ['name', 'user']))
			.map(key => view[item.corpus][key])
			.map(res => Object.keys(res).map(k => res[k].topic));

		topics = [].concat(... [].concat(... topics).filter(Boolean));
		return Array.from(
			new Set(topics.map(t => t.viewpoint).filter(Boolean)));
	};

	const getHighlights = async (uri) => {
		let itemLists = (await getItems(uri)) || {};
		let items = [].concat(... Object.values(itemLists));

		// For each item, run getItemHighlights and getCorpusVps
		// Wait for all highlights and flatten the resulting array
		let hls = Promise.all(items.map(getItemHighlights));
		let vps = Promise.all(items.map(getCorpusVps));
		return {
			highlights: [].concat(... await hls),
			viewpoints: Array.from(new Set([].concat(... await vps)))
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
			let data = await getHighlights(uri);
			let highlights = data.highlights;

			let viewpoints = {};
			highlights.forEach(frag => {
				(frag.topic || []).forEach(t => {
					let v = viewpoints[t.viewpoint] || new Viewpoint();
					if (v === null){
						console.error("v is null for topic");
						return;
					}
					v.topics[t.id] = v.topics[t.id] || [];
					v.topics[t.id].push(frag);
					viewpoints[t.viewpoint] = v;
				});
				delete frag.topic;
			});
			(await getViewpoints(Object.keys(viewpoints))).forEach((v) => {
				if (v === null) {
					console.error ("v is null");
					return;
				}
				let vp = viewpoints[v.id];
				vp.name = String((v.name || [])[0]);
				vp.user = String((v.user || [])[0]);
				v.topics.forEach((t) => {
					if (!vp.topics[t.id]) {
						console.error('No viewpoint for:', t);
						return;
					}
					vp.topics[t.id].name = String((t.name || [])[0]);
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
      return x;
    });

  const closeSession = () => fetch(session_uri, {
    method:'DELETE',
    credentials:'include'
  });

  return {
    fetchSession,
    openSession,
    closeSession,
    isWhitelisted,
    getResource,
    createHighlight,
    removeHighlight,
    renameTopic
  };
}());

export default model;

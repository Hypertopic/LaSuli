/*global browser, require */
import Hypertopic from 'hypertopic';
import Resource from './Resource.js';
import Viewpoint from './Viewpoint.js';

const model = (function () {
  let cache = {};
  let connected_user = '';

  const getServices = async () => {
    let settings = await browser.storage.local.get('services');
    if (!settings.services) {
      await browser.storage.local.set({
        services: ['http://argos2.test.hypertopic.org/']
      });
    }
    return settings.services;
  }

  const getDB = async () => {
    return new Hypertopic(await getServices());
  }

  const getSessionURI = async () => getServices()
    .then((x) => x + '/_session');

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

  const createHighlight = (uri,viewpoint,topic,coordinates) => {
    let db = getDB();
    if (!topic) topic=getUuid();
    if (!viewpoint) viewpoint=getUuid();
    return getItems(uri)
      .then(items => {
        if (items && items.item && items.item.length>0) {
          let itemId=items.item[0].id;
          return db.then((x) => x.get({_id:itemId}));
        }
        throw new Error ("no items found for "+uri);
      })
      .then(item => {
        var uuid=getUuid();
        item.highlights=item.highlights || {};
        let hl={
          coordinates:[coordinates.startPos,coordinates.endPos],
          text:coordinates.text,
          viewpoint:viewpoint,
          topic:topic
        };
        item.highlights[uuid]=hl;
        return db.then((x) => x.post(item).then(createdItem => {
          hl.id=uuid;
          return hl;
        }));
      });
  }

  const removeHighlight = (uri,viewpoint,topic,fragId) => {
    let db = getDB();
    return getItems(uri)
      .then(items => {
        if (items && items.item && items.item.length>0) {
          let itemId=items.item[0].id;
          return db.then((x) => x.get({_id:itemId}));
        } else {
          throw new Error(`can't find item for ${uri}`);
        }
      })
      .then(item => {
        if (fragId in item.highlights) {
          delete item.highlights[fragId];
          return db.then((x) => x.post(item));
        } else {
        }
      });
  }

  const renameTopic = (vpId,topicId,newName) => {
    let db = getDB();
    return db.then((x) => x.get({_id:vpId}))
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
          return db.then((x) => x.post(vp).then(() => topic));
        } else {
          return topic;
        }
      });
  }

	/*
	 * Fetch the item(s) for the given resource (URI)
	 */
	const getItems = async (uri) => {
    let db = await getDB();
		let view = await db.getView(`/item/?resource=${uri}`);
		let key = Object.keys(view)[0];
		return key && view[key]; // False if "key" is false
	};

	/*
	 * Fetch the highlights for the given item (corpus + id)
	 */
	const getItemHighlights = async (item) => {
    let db = await getDB();
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
    let db = await getDB();
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
    let db = await getDB();
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

  const fetchSession = () => getSessionURI()
    .then((x) => fetch(x, {credentials: 'include'}))
    .then((x) => x.json());

  const openSession = (user, password) => getSessionURI()
    .then((x) => fetch(x, {
      method:'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body:`name=${user}&password=${password}`,
      credentials:'include'
    }))
    .then((x) => {
      if (!x.ok) throw new Error('Bad credentials!');
      connected_user = user;
      return x;
    });

  const closeSession = () => getSessionURI()
    .then((x) => fetch(x, {
      method:'DELETE',
      credentials:'include'
    }))
    .then((x) => {
      connected_user = '';
      return x;
    });

  const createViewpoint = (name) => getDB()
    .then((db) => db.post({
      viewpoint_name: name,
      users: [connected_user],
      topics: {}
    }));

  return {
    fetchSession,
    openSession,
    closeSession,
    isWhitelisted,
    getResource,
    createViewpoint,
    createHighlight,
    removeHighlight,
    renameTopic
  };
}());

export default model;

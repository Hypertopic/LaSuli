/*global browser, require */
import Resource from './Resource.js';
import Viewpoint from './Viewpoint.js';

const model = (function () {
	let cache = {};
	let db = require('hypertopic')([
		'http://argos2.hypertopic.org',
		'http://steatite.hypertopic.org'
	]);

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
			return Object.values(view);
		}
		return [];
	};

	const getHighlights = async (uri) => {
		let itemLists = (await getItems(uri)) || {};

		// For each item, run getItemHighlights
		// Wait for all highlights and flatten the resulting array
		let promises = [].concat(... Object.values(itemLists))
			.map(getItemHighlights);
		return [].concat(... await Promise.all(promises));
	};

	const getViewpoint = async (id) => {
		let view = (await db.getView(`/viewpoint/${id}`))[id];
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
			let highlights = await getHighlights(uri);

			let viewpoints = {};
			highlights.forEach(frag => {
				(frag.topic || []).forEach(t => {
					let v = viewpoints[t.viewpoint] || new Viewpoint();
					v.topics[t.id] = v.topics[t.id] || [];
					v.topics[t.id].push(frag);
					viewpoints[t.viewpoint] = v;
				});
				delete frag.topic;
			});
			(await getViewpoints(Object.keys(viewpoints))).forEach((v) => {
				let vp = viewpoints[v.id];
				vp.name = String((v.name || [])[0]);
				vp.user = String((v.user || [])[0]);
				v.topics.forEach((t) => {
					if (!vp.topics[t.id]) {
						console.log('No viewpoint for:', t);
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

	return {
		isWhitelisted,
		getResource
	};
}());

/*
 * Message handler
 */
browser.runtime.onMessage.addListener(async (msg) => {
	if (msg.aim === 'getResource') {
		return model.getResource(msg.uri, msg.reload);
	}
	if (msg.aim === 'isWhitelisted') {
		return model.isWhitelisted(msg.uri);
	}
});

export default model;

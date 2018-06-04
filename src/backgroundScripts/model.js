/*global browser, require */
class Resource {
	constructor() {
		this.highlights = [];
		this.viewpoints = [];
	}
}

const colors = [
	{r: 255, g: 255, b: 153},
	{r: 255, g: 153, b: 187},
	{r: 187, g: 153, b: 255},
	{r: 153, g: 255, b: 255},
	{r: 187, g: 255, b: 153},
	{r: 255, g: 187, b: 153},
	{r: 255, g: 153, b: 255},
	{r: 153, g: 187, b: 255},
	{r: 153, g: 255, b: 187}
];

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
			console.log('Corpus:', item.corpus);
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
			let res = new Resource();
			res.highlights = await getHighlights(uri);

			let viewpoints = {};
			res.highlights.forEach(frag => {
				frag.topic.forEach(t => {
					viewpoints[t.viewpoint] = 1;
				});
			});
			res.viewpoints = await getViewpoints(Object.keys(viewpoints));
			res.viewpoints.forEach((v, i) => {
				v.color = colors[i % colors.length];
			});

			cache[uri].updated = getSecond();
			resolve(res);
		} catch (err) {
			delete cache[uri]; // We failed, drop the entry
			console.error(err);
			reject(err);
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

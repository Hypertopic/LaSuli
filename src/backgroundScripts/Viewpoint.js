import colors from './colorList.js';

export default class Viewpoint {
	constructor(obj) {
		if (obj) {
			Object.assign(this, obj);
		}
		this.topics = this.topics || {};
		this.getHLCount = this.getHLCount.bind(this);
	}

	getHLCount() {
		return Object.values(this.topics).reduce(
			(sum, tp) => sum + tp.length, 0);
	}

	getFragments(vid) {
		return Object.keys(this.topics).reduce((frags, tid) => {
			return frags.concat(this.topics[tid].map(frag => ({
				coords: frag.coordinates,
				label: vid || tid
			})));
		}, []);
	}

	getLabels() {
		Object.values(this.topics).forEach((t, i) => {
			t.color = colors[i % colors.length];
		});
		return this.topics;
	}
}

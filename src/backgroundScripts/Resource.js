import Viewpoint from './Viewpoint';
import colors from './colorList.js';

export default class Resource {
	constructor(obj) {
		if (obj) {
			Object.assign(this, obj);
			Object.keys(this.viewpoints || {}).forEach(vid =>
				this.viewpoints[vid] = new Viewpoint(this.viewpoints[vid]));
		} else {
			this.viewpoints = {};
		}
	}

	getHLCount() {
		return Object.values(this.viewpoints).reduce(
			(sum, vp) => sum + vp.getHLCount(), 0);
	}

	getFragments() {
		return Object.keys(this.viewpoints).reduce((frags, vid) =>
			frags.concat(this.viewpoints[vid].getFragments(vid)), []);
	}

	getLabels() {
		let labels = {};
		Object.keys(this.viewpoints).forEach((vid, i) =>
			labels[vid] = {
				name: this.viewpoints[vid].name,
				color: colors[i % colors.length]
			});
		return labels;
	}
}

/*global browser, require */
const hypertopic = require('hypertopic');

let textNodes = [],
	highlights = [],
	textFragments = [],
	marks = [],
	db = hypertopic([
		'http://argos2.hypertopic.org',
		'http://steatite.hypertopic.org'
	]),
	items = null,
	viewpoints = [],
	baseColor = {hue: 60, sat: 100, light: .8};

const errorHandler = (error) => console.error(error);

const getItemsTable = async (url) => {
	if (!items) {
		let itemsWithUrl = await db.getView(`/item/?resource=${url}`);
		items = itemsWithUrl[Object.keys(itemsWithUrl)];
	}
	return items;
};

//Param : item {corpus : string , id : number}
//Output : array of HighlightsTable
const getHighlightsTable = async (item) => {
	return db.getView(`/item/${item.corpus}/${item.id}`);
};

const updateBufferHighlights = async (url) => {
	if (highlights.length !== 0) {
		return;
	}

	const itemsTable = await getItemsTable(url).catch(errorHandler);
	if (!itemsTable) {
		return;
	}

	const itemsKeyTable = Object.keys(itemsTable); // Item keys for this page
	for (let itemKey of itemsKeyTable) {
		for (let item of itemsTable[itemKey]) {
			let highlightsTable = await getHighlightsTable(item)
				.catch(errorHandler);
			highlightsTable = (highlightsTable)
				? highlightsTable[item.corpus][item.id]
				: {};
			if (Object.keys(highlightsTable).length > 2) { // has fragments
				delete highlightsTable['resource'];
				delete highlightsTable['thumbnail'];
				for (let fragments in highlightsTable) {
					highlights.push(highlightsTable[fragments]);
				}
			}
		}
	}
};

const getTreeWalker = async () => {
	let ignore = ['script']; // We can ignore more tags (link, style, title…)
	return document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
		acceptNode: node => {
			// Ignore empty or non-visible text nodes
			let tag = (node.parentNode)
				? node.parentNode.tagName.toLowerCase()
				: '';
			if (node.textContent.length === 0 || ignore.indexOf(tag) !== -1) {
				return NodeFilter.FILTER_REJECT;
			}
			return NodeFilter.FILTER_ACCEPT;
		}
	}, false);
};

class TextNode {
	constructor(offset, node) {
		this.text = node.textContent;
		this.length = this.text.length;
		this.start = offset;
		this.end = offset + this.length;
		this.fullNode = node;
		this.parentNode = node.parentNode;
	}
}

/*
 * Give a start and end position to every text node in the document.
 */
const updateTextNode = async () => {
	textNodes = [];
	let treeWalker = await getTreeWalker();
	let offset = 0;
	while (treeWalker.nextNode()) {
		let textNode = new TextNode(offset, treeWalker.currentNode);
		textNodes.push(textNode);
		offset += textNode.length;
	}
};

/*
 * Split text nodes and highlights with their coordinates
 * to build a simpler list of text fragments. A fragment
 * may refer to zero (non highlighted), one (highlighted)
 * or multiple viewpoints and topics.
 */
const updateSubFragParts = async () => {
	// Get a list of unique, sorted positions
	let allFragCoordinatesSet = new Set(); // No duplicates
	highlights.forEach(highlight => {
		allFragCoordinatesSet.add(highlight.coordinates[0][0]);
		allFragCoordinatesSet.add(highlight.coordinates[0][1]);
	});
	let sortedCoords = [...allFragCoordinatesSet]; 
	sortedCoords.sort((a, b) => a - b);

	textFragments = [];
	for (let i = 0; i <= sortedCoords.length - 2 ; ++i) {
		let tempViewpoints = new Set();
		let tempTopics = new Set();
		highlights.forEach(highlight => {
			if (highlight.coordinates[0][0] <= sortedCoords[i]
					&& sortedCoords[i+1] <= highlight.coordinates[0][1]) {
				tempViewpoints.add(highlight.topic[0]['viewpoint']);
				tempTopics.add(highlight.topic[0]['id']);
			}
		});
		textFragments.push({
			start: sortedCoords[i],
			end: sortedCoords[i+1],
			viewpoints: tempViewpoints,
			topics: tempTopics
		});
	}
};

// Replace the given node in the document with a <mark>
const insertMark = (nodeToMark, frag) => {
	if (nodeToMark.textContent.match(/^[\s]*$/) !== null) {
		return;
	}

	// Get a color for each viewpoint
	let hues = [];
	frag.viewpoints.forEach(vp => {
		let index = viewpoints.indexOf(vp);
		if (index === -1) {
			index = viewpoints.length;
			viewpoints.push(vp);
		}
		hues.push((baseColor.hue + (280 * index)) % 360);
	});
	// Get the mean hue (angle on the color wheel)
	hues = hues.map(hue => hue * Math.PI / 180); // To radians
	let hue = 180 / Math.PI * Math.atan2(
		hues.map(Math.sin).reduce((sum, n) => sum + n, 0) / hues.length,
		hues.map(Math.cos).reduce((sum, n) => sum + n, 0) / hues.length
	);
	// Negative mixing: darker
	let light = Math.pow(baseColor.light, hues.length);

	// Insert the <mark>
	let mark = document.createElement('mark');
	mark.textContent = nodeToMark.textContent;
	mark.style.backgroundColor =
		`hsl(${hue}, ${baseColor.sat}%, ${light * 100}%)`;
	mark.style.color = (light > .5)
		? 'black'
		: 'white';
	mark.title = [...frag.viewpoints].join(', ');
	marks.push(mark);
	nodeToMark.parentNode.replaceChild(mark, nodeToMark);
};

const showHighlights = async () => {
	let	j = 0;
	textFragments.forEach(frag => {
		// Skip this fragment if it is not highlighted
		if (frag.viewpoints.size === 0) {
			return;
		}
		let fragStart = frag.start;

		while (j < textNodes.length) {
			// Skip nodes until reaching this fragment
			let node = textNodes[j];
			if (node.end < fragStart) {
				++j;
				continue;
			}

			// Split the text node with the fragment boundaries
			// in order to know where to insert the <mark>
			let relStart = fragStart - node.start;
			let markNode = (relStart !== 0)
				? node.fullNode.splitText(relStart)
				: node.fullNode;
			let isFinished = (frag.end <= node.end);
			let relEnd = Math.min(frag.end, node.end) - fragStart;
			let endNode = (frag.end < node.end)
				? markNode.splitText(relEnd)
				: null;

			// Insert the <mark>
			let newNodes = [new TextNode(node.start, node.fullNode)];
			insertMark(markNode, frag);

			// Replace the previous textNode with the new ones
			if (relStart !== 0) {
				newNodes.push(new TextNode(fragStart, markNode));
			}
			if (endNode !== null) {
				newNodes.push(new TextNode(frag.end, endNode));
			}
			textNodes.splice(j, 1, ...newNodes);

			if (isFinished) {
				break; // Go to the next fragment
			} else {
				++j; // Go to the next node
				fragStart = node.end;
			}
		}
	});
};

const messageHandler = async (message) => {
	let returnMessage;
	switch (message.aim) {
	case 'showHighlights':
		try {
			await updateBufferHighlights(message.data);
			await updateTextNode();
			await updateSubFragParts();
			await showHighlights();
			returnMessage = 'Highlighted';
		} catch (e) { errorHandler(e); }
		break;
	case 'getAllHighlights':
		try {
			await updateBufferHighlights(message.data); //!
			returnMessage = highlights.length.toString();
		} catch (e) { errorHandler(e); }
		break;
	}
	return Promise.resolve({returnMessage});
};

browser.runtime.onMessage.addListener(messageHandler);


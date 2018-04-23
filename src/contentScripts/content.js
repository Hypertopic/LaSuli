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
	items = null;

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

const showHighlights = async () => {
	let	j = 0;
	textFragments.forEach(frag => {
		// Skip this fragment if empty
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

			// Insert the <mark> in the document
			if (markNode.textContent.match(/^[\s]*$/) === null) {
				let mark = document.createElement('mark');
				mark.textContent = markNode.textContent;
				marks.push(mark);
				// console.log(markNode, frag.viewpoints, frag.topics);
				markNode.parentNode.replaceChild(mark, markNode);
			}

			// Go to the next fragment if finished,
			// or to the next node otherwise
			if (isFinished) {
				break;
			} else {
				++j;
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

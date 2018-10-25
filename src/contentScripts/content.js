/*global browser */
import color from './color.js';

let marks = [];

const getTreeWalker = () => {
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

const getCoordinates = () => {
	let treeWalker = getTreeWalker();
  var selection = document.getSelection();

  var strContent = selection + "";
  strContent = strContent.trim();
  if(strContent == ""){
    //TODO replace with message in lasuli
    alert(_("null.content.selected"));
    return false;
  }
  var range = selection.getRangeAt(0);
  var startContainer = range.startContainer;
  var endContainer = range.endContainer;
  var startOffset = range.startOffset;
  var endOffset = range.endOffset;
	var curPos = 0;
  var startPos,endPos;
	while(treeWalker.nextNode()) {
    var node = treeWalker.currentNode;
    if(node===startContainer){
      startPos = curPos + startOffset;
      endPos = startPos + ('' + range).length;
      break;
    }
    curPos += node.data.length;
  }
  if(typeof startPos != "number" || typeof endPos != "number") return false;
  return {"startPos": startPos, "endPos": endPos, "text": strContent };

}

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
const getTextNodes = () => {
	let textNodes = [];
	let treeWalker = getTreeWalker();
	let offset = 0;
	while (treeWalker.nextNode()) {
		let textNode = new TextNode(offset, treeWalker.currentNode);
		textNodes.push(textNode);
		offset += textNode.length;
	}
	return textNodes;
};

/*
 * Merge fragments with interpolating coordinates
 * to build a simpler fragment list.
 */
const mergeFragments = (fragments) => {
	// Get a list of unique, sorted positions
	let coordList = [... new Set(
		[].concat(... fragments.map(f => f.coords[0]))
	)].sort((a, b) => a - b);

	let textFragments = [];
	for (let i = 0; i < coordList.length - 1; ++i) {
		let labels = new Set(fragments
			.filter(f => f.coords[0][0] <= coordList[i])
			.filter(f => coordList[i+1] <= f.coords[0][1])
			.map(f => f.label));
		textFragments.push({
			start: coordList[i],
			end: coordList[i+1],
			labels: [... labels]
		});
	}
	return textFragments;
};

/*
 * Replace the given node in the document with a <mark>
 */
const insertMark = (nodeToMark, frag, labels) => {
	if (nodeToMark.textContent.match(/^[\s]*$/) !== null) {
		return;
	}

	let flabs = Array.from(frag.labels).map(id => labels[id]).filter(Boolean);
	let rgb = color.blend(flabs.map(fl => fl.color));

	// Insert the <mark>
	let mark = document.createElement('mark');
	mark.textContent = nodeToMark.textContent;
	mark.title = flabs.map(fl => String(fl.name)).join(', ');
	mark.style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
	mark.style.color = color.isBright(rgb)
		? 'black'
		: 'white';

	marks.push(mark);
	nodeToMark.parentNode.replaceChild(mark, nodeToMark);
};

const showHighlights = (textNodes, fragments, labels) => {
	let j = 0;
	fragments.forEach(frag => {
		// Skip this fragment if it is not highlighted
		if (frag.labels.size === 0) {
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
			let nodeToMark = (relStart !== 0)
				? node.fullNode.splitText(relStart)
				: node.fullNode;
			let isFinished = (frag.end <= node.end);
			let relEnd = Math.min(frag.end, node.end) - fragStart;
			let endNode = (frag.end < node.end)
				? nodeToMark.splitText(relEnd)
				: null;

			// Insert the <mark>
			let newNodes = [new TextNode(node.start, node.fullNode)];
			insertMark(nodeToMark, frag, labels);

			// Replace the previous textNode with the new ones
			if (relStart !== 0) {
				newNodes.push(new TextNode(fragStart, nodeToMark));
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

const highlight = (fragments, labels) => {
	let nodes = getTextNodes();
	let frags = mergeFragments(fragments);
	showHighlights(nodes, frags, labels);
};

const erase = () => {
	marks.forEach(mark => {
		let parent = mark.parentNode;
		if (parent) {
			let text = document.createTextNode(mark.textContent);
			parent.replaceChild(text, mark);
			parent.normalize();
		}
	});
	marks.length = 0;
};

const messageHandler = async (message) => {
	switch (message.aim) {
	case 'isLoaded':
		return true;
	case 'erase':
		erase();
		return true;
	case 'highlight':
		erase();
		highlight(message.fragments, message.labels);
		return true;
	case 'getCoordinates':
		return getCoordinates();;
	}
};

browser.runtime.onMessage.addListener(messageHandler);

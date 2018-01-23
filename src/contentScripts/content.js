const hypertopic = require('hypertopic');
const getStdin = require('get-stdin');

let bufferTextNode,
	bufferHighlights,
	bufferTextOffset,
	bufferAllFragCoords = [],
	bufferSubFragParts = [],
	colorsFragMap = new Map(),
	db = hypertopic([
  "http://argos2.hypertopic.org",
  "http://steatite.hypertopic.org"
]);


const errorHandler = function (error){ error => console.error(error)};

const getItemsTable = async (url) => {
	const itemsWithUrl = await db.getView(`/item/?resource=${url}`);
	return itemsWithUrl[Object.keys(itemsWithUrl)]; //items without URL
}

//Param : item {corpus : string , id : number}
//Output : array of HighlightsTable
const getHighlightsTable = async (item) => {
	return db.getView(`/item/${item.corpus}/${item.id}`);
}

//param must be an item {corpus : string , id : number}
const updateBufferHighlights = async (url) => {
	try{
	const itemsTable = await getItemsTable(url);
	const highlightsArray = [];
	if (itemsTable) {
		const itemsKeyTable = Object.keys(itemsTable); // Keys of items for this webpage
		for (let itemKey of itemsKeyTable) {
			for (let item of itemsTable[itemKey]) {
				let currentHighlightsArray = await getHighlightsTable(item);
				if (Object.keys(currentHighlightsArray[item.corpus][item.id]).length > 2) { //it means that if there is fragments 
					//remove non fragments part
					delete currentHighlightsArray[item.corpus][item.id]['resource'];
					delete currentHighlightsArray[item.corpus][item.id]['thumbnail'];
					for (fragments in currentHighlightsArray[item.corpus][item.id]) {
						highlightsArray.push(currentHighlightsArray[item.corpus][item.id][fragments]);
					}
				}
			}
		}
	}
	bufferHighlights = highlightsArray;
	}catch(e){errorHandler(e)}
}

const getTreeWalker = async () => {
	return document.createTreeWalker(
		document.body,
		NodeFilter.SHOW_TEXT,
		{acceptNode: node => {
			// only get text content
			if(node.nodeType != 3 || node.textContent.length == 0)
				return NodeFilter.FILTER_REJECT;
			// Filter the <script> content
			let m_parent = node.parentNode;
			if(m_parent && (m_parent.tagName == "SCRIPT"))
				return NodeFilter.FILTER_REJECT;
			return NodeFilter.FILTER_ACCEPT;
	        }
      	},
      	false
    );
}

const updateTextNode = async () => {
	const nodes = [];
	let val = ``,
		actualNode,
		nodeText;
	try{
		let treeWalker = await getTreeWalker();
		while (treeWalker.nextNode()){
			nodeText = treeWalker.currentNode.textContent;
			nodes.push({
			    start: val.length,
			    end: (val += '' + nodeText).length, 
			    text : nodeText,
			    fullNode : treeWalker.currentNode,
			    parentNode : treeWalker.currentNode.parentNode
	    	});
		}
	bufferTextNode = nodes;
	}catch(e){errorHandler(e)}
}

//The aim of this function is to create an array containing all section of text between each fragments coordinates
//It means each portion of text highlighted, highlighted in different colors at the same time and non highlighted parts
//of the text between highlighted portions of text
//The array will contains coordinates of the text's part and all the viewpoints and topics referring to it.
const updateSubFragParts = async () => {
	let allFragCoordinatesSet = new Set(); //We create a set to remove duplicates value
	bufferHighlights.forEach(highlight => {
		allFragCoordinatesSet.add(highlight.coordinates[0][0]);
		allFragCoordinatesSet.add(highlight.coordinates[0][1]);
	});
	bufferAllFragCoords = [...allFragCoordinatesSet]; 
	bufferAllFragCoords.sort((a,b) => a-b);
	let tempSubFrag;
	bufferSubFragParts = []; //The array we'are looking for.
	for (let i = 0; i <= bufferAllFragCoords.length-2 ; i++) {
		let tempViewpoints = new Set();
		let tempTopics = new Set();
		bufferHighlights.forEach(highlight => {
			if(highlight.coordinates[0][0] <= bufferAllFragCoords[i] && bufferAllFragCoords[i+1] <= highlight.coordinates[0][1]){
				tempViewpoints.add(highlight.topic[0][`viewpoint`]);
				tempTopics.add(highlight.topic[0][`id`])
			}
		});
		bufferSubFragParts.push({beginIndex: bufferAllFragCoords[i], endIndex: bufferAllFragCoords[i+1], viewpoints:tempViewpoints, topics:tempTopics});
	}
}

const showHighlights = async () => {
	try{
		let	i = 0,
			j = 0;

		//We filter all nodes before the first node to highlight
		let textNode = bufferTextNode[j];
		while (textNode.end <= bufferSubFragParts[0].beginIndex){
			j++;
			textNode = bufferTextNode[j];
		}

		let firstPart = textNode.fullNode,
			absFragStart = bufferSubFragParts[i].beginIndex - textNode.start,
			absNodeEnd = textNode.end - textNode.start,
			cuttingCursor = absFragStart,
			remainingNode = firstPart.splitText(cuttingCursor); //Removing potential not highlighted part in the node before first highlighted fragment in the first node we have to interact with
			absFragStart = bufferSubFragParts[i].beginIndex - textNode.start - firstPart.textContent.length;
			absFragEnd = bufferSubFragParts[i].endIndex - textNode.start - firstPart.textContent.length;
			absNodeEnd -= firstPart.textContent.length;
			firstPart = remainingNode;

		//For each text node of the page's body
			while (i < bufferSubFragParts.length) {

				cuttingCursor = (absFragEnd < absNodeEnd) ? absFragEnd : absNodeEnd;
				remainingNode = firstPart.splitText(cuttingCursor);

				if (bufferSubFragParts[i].viewpoints.size != 0 && (firstPart.textContent.match(/^[\s]*$/) === null)) {
					element = document.createElement("mark");
					element.textContent = firstPart.textContent;
					remainingNode.parentNode.replaceChild(element,firstPart);
				}
				firstPart = remainingNode;

				if (absFragEnd <= absNodeEnd) {
					if (i++ > bufferSubFragParts.length) {
						break;
					}
				}
				//Checking if we have to go to the next node in the span tree
				if(absFragEnd >= absNodeEnd){
					j++;
					textNode = bufferTextNode[j];
					firstPart = textNode.fullNode;
					absNodeEnd = textNode.end - textNode.start;
					absFragStart = bufferSubFragParts[i].beginIndex - textNode.start;
					absFragEnd = bufferSubFragParts[i].endIndex - textNode.start;
				}
				else{
					absFragStart = bufferSubFragParts[i].beginIndex - textNode.start - cuttingCursor;
					absFragEnd = bufferSubFragParts[i].endIndex - textNode.start - cuttingCursor;
					absNodeEnd -= cuttingCursor;
				}	
			}
	}catch(e){console.log(e)}
}

const messageHandler = async (message) => {
	let returnMessage;
	//let selection = window.document.getSelection();
	switch(message.aim){
		case `showHighlights`:
			try{
				await updateBufferHighlights(message.data);
				await updateTextNode();
				await updateSubFragParts();
				await showHighlights();
				returnMessage = `Highlighted`;
			} catch(e){errorHandler(e)}
		break;
		case `getAllHighlights`:
			try{
				await updateBufferHighlights(message.data) //!
				returnMessage = bufferHighlights.length.toString();
			} catch(e){errorHandler(e)}
			
		break;
		case `scriptExecutionCheck`:
			returnMessage = "running";			
		break;
	}
  	return Promise.resolve({returnMessage: returnMessage});
}

browser.runtime.onMessage.addListener(messageHandler);
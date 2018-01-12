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

//This function will allow to create class for each color and color overlap
const colorFragmentsPart = async (quantifier) => {
	
// 	colorsFragMap
// 	let color = "lightblue";
// 	document.styleSheets[0].insertRule(`.Lasuli-color-${} {
//   background-color: ${color};
// }`, 0);
// 	console.log(document.styleSheets[0]);

}

const showHighlights = async () => {
	try{
		let	i = 0,
			j = 0;

		console.log(bufferHighlights);
		console.log(bufferSubFragParts);
		console.log(bufferTextNode);

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
				// console.log("while i");
				// console.log(`absFragStart = ${absFragStart}`);
				// console.log(`absFragEnd = ${absFragEnd}`);
				// console.log(`absNodeEnd = ${absNodeEnd}`);
				// console.log(`firstPart`);
				// console.log(firstPart);
				// console.log(`remainingNode`);
				// console.log(remainingNode);

				cuttingCursor = (absFragEnd < absNodeEnd) ? absFragEnd : absNodeEnd;
				remainingNode = firstPart.splitText(cuttingCursor);

				// console.log(`cuttingCursor = ${cuttingCursor}`);
				// console.log(`firstPart`);
				// console.log(firstPart);
				// console.log(`remainingNode`);
				// console.log(remainingNode);
				// console.log(`i = ${i}`);



				if (bufferSubFragParts[i].viewpoints.size != 0 && (firstPart.textContent.match(/^[\s]*$/) === null)) {
					element = document.createElement("mark");
					element.textContent = firstPart.textContent;
					console.log(`Marking "${element.textContent}"`);
					remainingNode.parentNode.replaceChild(element,firstPart);
				}
				firstPart = remainingNode;
				

				if (absFragEnd <= absNodeEnd) {
					if (i++ > bufferSubFragParts.length) {
						break;
					}
				}
				console.log(`i = ${i}`);
				//Checking if we have to go to the next node in the span tree
				if(absFragEnd >= absNodeEnd){
					console.log("j++");
					j++;
					textNode = bufferTextNode[j];
					firstPart = textNode.fullNode;
					absNodeEnd = textNode.end - textNode.start;
					absFragStart = bufferSubFragParts[i].beginIndex - textNode.start;
					absFragEnd = bufferSubFragParts[i].endIndex - textNode.start;
				}
				else{
					console.log("no j ++");
					absFragStart = bufferSubFragParts[i].beginIndex - textNode.start - cuttingCursor;
					absFragEnd = bufferSubFragParts[i].endIndex - textNode.start - cuttingCursor;
					absNodeEnd -= cuttingCursor;
				}
				
			}



				// console.log("j",absFragStart,absFragEnd,absNodeEnd,bufferSubFragParts[i]);

				//Here we create the element handling the text we highlight
				// let element = document.createElement("mark");
				//element.className = "test";
				//colorFragmentsPart(bufferSubFragParts[i].viewpoints);

				//If the subfragment cover all the node
				// if (absFragStart <= 0 && absFragEnd >= absNodeEnd) {
				// 	if(bufferSubFragParts[i].viewpoints.size != 0 && (textNode.text.match(/^[\s]*$/) === null)){
				// 		element.textContent = textNode.text;
				// 		textNode.fullNode.parentNode.replaceChild(element,textNode.fullNode);
				// 	}
				// 	//If the subfragment begin in a previou node AND finish in this node at coord = nodeEnd
				// 	if(absFragEnd == absNodeEnd) {
				// 		if (i++ > bufferSubFragParts.length) {
				// 			break highlighting;
				// 		}
				// 	}
				// }
				// //The fragment don't cover all the node
				// else {
				// 	//Do we have a fragment beginning in a previous node and ending in this node
				// 	let remainingNode = textNode.fullNode,
				// 		firstPart = remainingNode,
				// 		element;

				// 	//While we have fragment(s) which begin in this node and end in this node
				// 	while (absFragEnd <= absNodeEnd) {
				// 		element = document.createElement("mark");
				// 		firstPart = remainingNode;	//Cutting until the beginning of the mark part
				// 		remainingNode = firstPart.splitText(absFragEnd);

				// 		if (bufferSubFragParts[i].viewpoints.size != 0 && (firstPart.textContent.match(/^[\s]*$/) === null)) {
				// 			element.textContent = firstPart.textContent;
				// 			remainingNode.parentNode.replaceChild(element,firstPart);
				// 		}
				// 		if (i++ > bufferSubFragParts.length) {
				// 			break highlighting;
				// 		}
				// 		//If the fragment end in this node we don't calculate the abs
				// 		if(absFragEnd == absNodeEnd){
				// 			break;
				// 		}
				// 		absFragStart = bufferSubFragParts[i].beginIndex - textNode.start - firstPart.textContent.length;
				// 		absFragEnd = bufferSubFragParts[i].endIndex - textNode.start - firstPart.textContent.length;
				// 		absNodeEnd -= firstPart.textContent.length;
				// 	}

				// 	//Do we have a fragment beginning in this node and ending in an other node ?
				// 	if (absFragStart >= 0 && absFragEnd > absNodeEnd) {
				// 		element = document.createElement("mark");
				// 		if(bufferSubFragParts[i].viewpoints.size != 0 && (remainingNode.textContent.match(/^[\s]*$/) === null)){
				// 			if(i == 0){
				// 				firstPart = remainingNode;
				// 				remainingNode = firstPart.splitText(absFragStart);
				// 			}
				// 			element.textContent = remainingNode.textContent;
				// 			remainingNode.parentNode.replaceChild(element,remainingNode);
				// 		}
				// 	}
				// }
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
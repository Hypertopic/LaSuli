console.log("script launched");
const hypertopic = require('hypertopic');
const getStdin = require('get-stdin');

let bufferTreeWalker,
	bufferTextNode,
	bufferHighlights,
	bufferTextOffset,
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

const updateTreeWalker = () => {
	bufferTreeWalker = document.createTreeWalker(
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
		await updateTreeWalker();
		while (bufferTreeWalker.nextNode()){
			nodeText = (bufferTreeWalker.currentNode.textContent); //remove ending double space at end
			nodes.push({
			    start: val.length,
			    end: (val += '' + nodeText).length, 
			    text : nodeText
	    	});
		}
	bufferTextNode = nodes;
		//We are going to try to offset the text with the web page
		//to do that we will find the offset of the first fragment.
		//Then if the offset doesn't change for all of the fragments, we apply the offset on the nodes
		bufferTextOffset = bufferHighlights[0].coordinates[0][0]-val.indexOf(bufferHighlights[0].text);
		console.log(bufferTextOffset);
		try{
			bufferHighlights.forEach(node => {
				if (node.coordinates[0][0]-val.indexOf(node.text) != bufferTextOffset) {
					throw "differents ";
				}
				throw "same";
			})
		}catch(e){
			if (e == "same") {
				//Revoir le fonctionnement de map ou foreach
				bufferTextNode = bufferTextNode.map(node => {
					node.start += bufferTextOffset;
					node.end += bufferTextOffset;
					return node;
				})
			}
		}

	}catch(e){errorHandler(e)}
}

const highlight = async () => {
	await updateTextNode();
	console.log(bufferTextNode);
	console.log(bufferHighlights);
}

const messageHandler = async (message) => {
	let returnMessage;
	//let selection = window.document.getSelection();
	switch(message.aim){
		case `showHighlights`:
			try{
				await updateBufferHighlights(message.data);
				await highlight();
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
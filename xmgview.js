// xmgview.js

// Timestamp: 2017-09-29 Fri

// Draws beautiful SVG trees and feature structures based on XMG's boring XML output.
// Written by Timm Lichte (lichte@phil.hhu.de).

// TODO: revisit padding variables
var offsetxLabel = 3;
var offsetxFS = 0;
var offsetxFSval = 10;
var offsetxFSfeat = 5;
var offsetxNode = 40;
var offsetyNode = 50;

// global variables 
var svgRoot,										// root element of the svg tree
		entryName,									// name of the grammar entry 
		dimensionRoot;										// root node of the syntactic tree

// draw tree (standalone) 
function standaloneTree(){
		makeTree(document.getElementsByTagName("svg")[0],document.getElementsByTagName("entry")[0])
}

// draw frame (standalone)
function standaloneFrame() {
		makeFrame(document.getElementsByTagName("svg")[0],document.getElementsByTagName("entry")[0]);
}


// makeTree is used in the webgui
function makeTree(target,entry) {
		entryName = entry.getAttribute("name");
		svgRoot = target;

		// turn tree elements into daughters of the SVG root
		transformTree(entry.getElementsByTagName("tree")[0],svgRoot);  // TODO: remove second argument?
		for (var i = 0; i < svgRoot.children.length; i++) {
				if (svgRoot.children[i].getAttribute("type") == "tree") {
						dimensionRoot = svgRoot.children[i];
				}
		}	
		
		processTree(svgRoot);
		addTreeButtons(svgRoot);
}

// makeFrame is used in the webgui
function makeFrame(target,entry) {
		entryName = entry.getAttribute("name");
		svgRoot = target;

		var frame = entry.getElementsByTagName("frame")[0];
		var ypoint = 3;

		var new_frame = document.createElementNS("http://www.w3.org/2000/svg","svg");
		new_frame.setAttribute("type","frame");
		svgRoot.appendChild(new_frame);
		dimensionRoot = new_frame;
		
		// frame descriptions may consist of separate components
		for (var i = 0; i < frame.children.length; i++) {
				transformFS(frame.children[i],new_frame);  // TODO: remove second argument?			
		}
		for (var i = 0; i < new_frame.children.length; i++) {
				if (new_frame.children[i].getAttribute("type") == "fs") {
						var fs = new_frame.children[i];
						processFS(fs);
						fs.setAttribute("y",ypoint);  // paddin
						var fsHeight = fs.getBBox().height;
						// plot label of overall frame 
						if (fs.hasAttribute("label")) {
								addLabel(fs.getAttribute("label"),new_frame);
								var label = new_frame.lastElementChild;
								var labelSize = label.getBBox();
								fs.setAttribute("x",labelSize.width + 5);  // padding
								new_frame.lastElementChild.setAttribute("y",fsHeight > labelSize.height ? fsHeight/2 - labelSize.height/2 + ypoint : ypoint);
						}
						ypoint += fsHeight + 20;  // padding
				}
		}
		
		addFrameButtons(svgRoot); 
}

// turn inTree into an svg element and make it daughter of outParent
function transformTree (inTree,outParent) {
		var daughters;
		if (inTree.children.length > 1) {
				daughters = document.createElementNS("http://www.w3.org/2000/svg","svg");
				daughters.setAttribute("type","children");
				outParent.appendChild(daughters);
		}
		else { daughters = outParent; }
		for (var i = 0; i < inTree.children.length; i++){
				var child = inTree.children.item(i);
				var new_outParent = document.createElementNS("http://www.w3.org/2000/svg","svg");
				if (child.tagName=="node") {
						new_outParent.setAttribute("type","tree");
						daughters.appendChild(new_outParent);
						transformTree(child,new_outParent);
				}
				if (child.tagName=="narg") {
						new_outParent.setAttribute("type","node");
						if (child.parentNode.getAttribute("type") != "std"){ 
								new_outParent.setAttribute("mark",child.parentNode.getAttribute("type"));
						}
						outParent.appendChild(new_outParent);
						outParent.insertBefore(new_outParent,outParent.children[0]); // root node element comes first			
						transformFS(child.children[0],new_outParent);
						reorderFS(new_outParent);
				}
		}
}

// turn inFS into an svg element and make it a daughter of outParent
function transformFS(inFS,outParent) {
		var new_fs = document.createElementNS("http://www.w3.org/2000/svg","svg");
		new_fs.setAttribute("type","fs");
		if (inFS.hasAttribute("coref")) {
				new_fs.setAttribute("label",inFS.getAttribute("coref").replace("@",""));
		}

		// probably deprecated
		if (inFS.hasAttribute("type")) {
				new_fs.setAttribute("fstype",inFS.getAttribute("type").replace("[","").replace("]","").toLowerCase());
		}
		// following the new DTD which has a ctype element
		if (inFS.children.length > 0 && inFS.children[0].tagName == "ctype") {
				var ctype = inFS.children[0];
				var ctypeArray = [];
				for (var i = 0; i < ctype.children.length; i++){
						// ctypeArray.push(ctype.children[i].innerHTML);
						ctypeArray.push(ctype.children[i].getAttribute("val"));
				}
				new_fs.setAttribute("fstype",ctypeArray.toString());
				inFS.removeChild(ctype); // to make things easier when dealing with feature-value pairs afterwards
		}
		
		outParent.appendChild(new_fs);

		// feature-value pairs
		for (var i = 0; i < inFS.children.length; i++){
				var child = inFS.children.item(i);

				var new_feature = document.createElementNS("http://www.w3.org/2000/svg","svg");
				new_feature.setAttribute("type","feature");
				new_fs.appendChild(new_feature);

				var new_featureName = document.createElementNS("http://www.w3.org/2000/svg","text");
				new_featureName.innerHTML = child.getAttribute("name");
				new_feature.appendChild(new_featureName);

				if (child.children[0].tagName == "sym") {
						var new_value = document.createElementNS("http://www.w3.org/2000/svg","svg");
						new_value.setAttribute("type","value")
						if (child.children[0].hasAttribute("varname")) {
								new_value.setAttribute("label",child.children[0].getAttribute("varname").replace("@",""));
						}
						var	new_valueText = document.createElementNS("http://www.w3.org/2000/svg","text");
						new_valueText.innerHTML = child.children[0].getAttribute("value");	
						new_value.appendChild(new_valueText);
						new_feature.appendChild(new_value);
				}

				if (child.children[0].tagName == "fs") {
						var new_value = document.createElementNS("http://www.w3.org/2000/svg","svg");
						new_value.setAttribute("type","value");
						transformFS(child.children[0],new_value);
						new_feature.appendChild(new_value);
				}
		}
}

// first top, then bot
function reorderFS(node) {
		var top = -1, 
				bot = -1,
				fs = node.children[0];
		if (fs.getAttribute("type") != "fs") {return;}
		for (var i = 0; i < fs.children.length; i++){
				var featureName = fs.children[i].children[0].innerHTML;
				if (featureName == "bot") { bot = i; }
				if (featureName == "top") { top = i; }
				if (featureName == "cat") { 
						node.setAttribute("cat",fs.children[i].children[1].children[0].innerHTML); 
				}
				if (featureName == "phon") { 
						node.setAttribute("phon",fs.children[i].children[1].children[0].innerHTML); 
				}
		}
		if (top > -1) {
				fs.insertBefore(fs.children[top],fs.children[0]);
		}
		if ( bot > -1) {
				fs.insertBefore(fs.lastElementChild,fs.children[bot]);
		}
}

function processTree (tree) {
		for (var i = 0; i < tree.children.length; i++){
				var child = tree.children.item(i);
				if (child.getAttribute("type")=="tree") {
						processTree(child);
						drawTree(child);
				}
				if (child.getAttribute("type")=="children") {
						for (var j = 0; j < child.children.length; j++) {
								processTree(child.children[j]);
								drawTree(child.children[j]);
						}
				}
				if (child.getAttribute("type")=="node") {
						processNode(child);
				}
		}
}

function processNode (node) {
		var fs = node.children[0];
		processFS(fs);
		var fsHeight = fs.getBBox().height;
		var fsWidth = fs.getBBox().width;
		var markWidth = 0;
		var markHeight = 0;

		// process the mark attribute
		if (node.hasAttribute("mark")) {
				var markSVG = document.createElementNS("http://www.w3.org/2000/svg","svg");
				var mark = document.createElementNS("http://www.w3.org/2000/svg","path");
				if (node.getAttribute("mark")=="anchor") {
						mark.setAttribute("d","M 10 0 L 0 10 L 10 20 L 20 10 Z");
				}
				if (node.getAttribute("mark")=="subst") {
						mark.setAttribute("d","M 5 0 L 5 20 L 0 10 M 5 20 L 10 10");
				}
				if (node.getAttribute("mark")=="foot") {
						mark.setAttribute("d","M 10 10 L 0 10 M 10 10 L 10 0 M 10 10 L 2 2 M 10 10 L 18 18 M 10 10 L 20 10 M 10 10 L 10 20 M 10 10 L 2 18 M 10 10 L 18 2");
				}			
				mark.setAttribute("style", "stroke:green; fill:none;");
				mark.setAttribute("transform", "scale (.7)");
				markSVG.appendChild(mark);
				markSVG.setAttribute("x",parseInt(fs.getAttribute("x")) + fsWidth + 10);
				markSVG.setAttribute("type","mark"); 
				node.appendChild(markSVG);

				markHeight = markSVG.getBBox().height;
				markWidth = markSVG.getBBox().width;
		}

		// append cat label pr phon label
		if (node.hasAttribute("phon")) {
				addPhon(node.getAttribute("phon"),node);
		}
		else {
				addCategory(node.getAttribute("cat"),node);
		}

		//	collapse and expand node
		if (node.getAttribute("type") == "node"){
				var collapseExpandSVG = document.createElementNS("http://www.w3.org/2000/svg","svg");
				collapseExpandSVG.setAttribute("type","ce-switch");
				collapseExpandSVG.setAttribute("ce-status","expanded");
				var collapseSymbol = document.createElementNS("http://www.w3.org/2000/svg","path");
				var expandSymbol = document.createElementNS("http://www.w3.org/2000/svg","path");
				var collapseExpandRect = document.createElementNS("http://www.w3.org/2000/svg","rect");
				collapseSymbol.setAttribute("d","M 10 0 L 0 10 L 10 20 M 15 0 L 5 10 L 15 20");
				collapseSymbol.setAttribute("style", "stroke:gray; fill:none;");
				collapseSymbol.setAttribute("transform", "scale (.7)");
				collapseSymbol.setAttribute("display", "initial");;
				collapseExpandSVG.appendChild(collapseSymbol);
				expandSymbol.setAttribute("d","M 0 0 L 10 10 L 0 20 M 5 0 L 15 10 L 5 20");
				expandSymbol.setAttribute("style", "stroke:gray; fill:none;");
				expandSymbol.setAttribute("display", "none");
				expandSymbol.setAttribute("transform", "scale (.7)");
				collapseExpandSVG.appendChild(expandSymbol);
				collapseExpandRect.setAttribute("y",0);
				collapseExpandRect.setAttribute("x",0);
				collapseExpandRect.setAttribute("width",15);
				collapseExpandRect.setAttribute("height",20);
				collapseExpandRect.setAttribute("style", "fill:transparent;");
				collapseExpandRect.setAttribute("transform", "scale (.7)");
				collapseExpandRect.setAttribute("onclick","collapseExpandNodeEvent(evt)");
				collapseExpandRect.setAttribute("cursor","pointer");
				collapseExpandSVG.appendChild(collapseExpandRect);
				if (markHeight*2 > fsHeight) {
						collapseExpandSVG.setAttribute("x",parseInt(fs.getAttribute("x")) + fsWidth + markWidth + 10); //padding
				}
				else {
						collapseExpandSVG.setAttribute("x",parseInt(fs.getAttribute("x")) + fsWidth + 10); //padding
				}
				collapseExpandSVG.setAttribute("y",fsHeight/2 );
				node.appendChild(collapseExpandSVG);
				node.setAttribute("x",0);
		}	
}

function addLabel(labeltext,target) {
		var label = document.createElementNS("http://www.w3.org/2000/svg","svg");
		label.setAttribute("type","label");
		target.appendChild(label);

		var text = document.createElementNS("http://www.w3.org/2000/svg","text");
		text.setAttribute("font-size",11);
		text.setAttribute("text-anchor","start");
		text.setAttribute("x",2);
		text.setAttribute("y","1.2em");
		text.innerHTML = labeltext;
		label.appendChild(text);

		var box = document.createElementNS("http://www.w3.org/2000/svg","rect");
		box.setAttribute("x", 1);
		box.setAttribute("y", text.getBBox().y-1.2);
		box.setAttribute("width", text.getBBox().width+2);
		box.setAttribute("height", text.getBBox().height+1.2);
		box.setAttribute("name",labeltext);
		box.setAttribute("cursor","pointer");
		box.setAttribute("onclick","highlightLabel(evt)");
		box.setAttribute("style", "stroke:black; fill:transparent;");
		label.appendChild(box);
}

function addCategory(cat,node) {
		var catlabel = document.createElementNS("http://www.w3.org/2000/svg","text");
		catlabel.setAttribute("x",0);
		catlabel.setAttribute("y",25);
		catlabel.setAttribute("font-size",25);
		catlabel.setAttribute("text-anchor","start");
		catlabel.setAttribute("style","text-transform: uppercase;");
		catlabel.setAttribute("display","none");
		catlabel.setAttribute("type","catlabel");
		catlabel.innerHTML = cat;
		node.appendChild(catlabel);
}

function addPhon(phon,node) {
		var catlabel = document.createElementNS("http://www.w3.org/2000/svg","text");
		catlabel.setAttribute("x",0);
		catlabel.setAttribute("y",25);
		catlabel.setAttribute("font-size",25);
		catlabel.setAttribute("style", "font-style: italic;");
		catlabel.setAttribute("text-anchor","start");
		catlabel.setAttribute("display","none");
		catlabel.setAttribute("type","catlabel");
		catlabel.innerHTML = phon;
		node.appendChild(catlabel);
}

function processFS(fs) {
		fs.setAttribute("x",0); // needed for node marks
		var hasType = false;
		var ypoint = 3;

		// process type of feature structure
		if (fs.hasAttribute("fstype")) {
				var hasType = true;
				var type = document.createElementNS("http://www.w3.org/2000/svg","svg");
				type.setAttribute("type","type");
				fs.insertBefore(type,fs.firstChild);
				
				var text = document.createElementNS("http://www.w3.org/2000/svg","text");
				text.innerHTML = fs.getAttribute("fstype");
				text.setAttribute("y", "0.9em");
				text.setAttribute("font-size",15);
				text.setAttribute("style", "font-style: italic;");
				type.appendChild(text);

				// position type of feature structure
				type.setAttribute("x", 5);  //padding
				type.setAttribute("y", ypoint);			
				ypoint += type.getBBox().height + 5; //padding 
		}

		if (fs.children.length < 1) {
				return;
		}
	
		// assumption: if there is a type, it is the first child of the feature structure
		var firstFeatureChild = 0;
		if (hasType) { firstFeatureChild = 1;}

		// compute maxlength of feature names
		var maxlengthFeatures = 0;
		for (var i = firstFeatureChild; i < fs.children.length; i++){
				var feature = fs.children[i];
				var featureName = feature.children[0];

				featureName.setAttribute("font-size","13");
				featureName.setAttribute("y","1em");
				featureName.setAttribute("font-variant","normal");
				featureName.innerHTML = featureName.innerHTML.toUpperCase();
				
				if (featureName.getBBox().width > maxlengthFeatures) {
						maxlengthFeatures = featureName.getBBox().width;
				}	
		}

		//	process feature and value
		for (var i = firstFeatureChild; i < fs.children.length; i++){
				var feature = fs.children[i];
				var featureName = feature.children[0];
				var value = feature.children[1];
				var labelWidth = 0;

				featureName.setAttribute("x", 5); //padding
				value.setAttribute("x", maxlengthFeatures + 10); //padding 

				// value is label
				if (value.hasAttribute("label")) {
						addLabel(value.getAttribute("label"),value);
						labelWidth = value.lastElementChild.getBBox().width;
						// console.log("bla");
				}

				// value is text element
				if (value.children[0].tagName =="text") {
						value.children[0].setAttribute("y", "0.86em");
						value.children[0].setAttribute("font-size", "15");
						value.children[0].setAttribute("x", labelWidth);
				}

				// value is fs
				if (value.children[0].getAttribute("type")=="fs") {
						processFS(value.children[0]);
						if (value.children[0].hasAttribute("label")) {
								addLabel(value.children[0].getAttribute("label"),value);
								var label = value.lastElementChild;
								var labelSize = label.getBBox();
								labelWidth = labelSize.width;
								// place fs after label
								value.children[0].setAttribute("x",labelWidth + 5);
								// center label vertically
								label.setAttribute("y", value.children[0].getBBox().height/2 > labelSize.height/2 ? value.children[0].getBBox().height/2 - labelSize.height/2 - 2 : -2); // padding 
						} 
				}	
				
				// center feature name vertically
				featureName.setAttribute("y", value.getBBox().height/2-featureName.getBBox().height/2 + 12); // padding
				
				// set and increment y attribute
				feature.setAttribute("y", ypoint);
				ypoint += feature.getBBox().height + 5; //padding 

		}

		// draw squared brackets around fs	
		var left_x = 2;
		var right_x = fs.getBBox().width+9;
		var top_y = 2;
		var bot_y = fs.getBBox().height+7;
		var brackettip = 7; 	

		var FSrb = document.createElementNS("http://www.w3.org/2000/svg","path");
		FSrb.setAttribute("d","M "+left_x+" "+top_y+" H "+brackettip+" M "+left_x+" "+top_y+" L "+left_x+" "+bot_y+ " H "+brackettip );
		FSrb.setAttribute("style", "stroke:black; fill:none;");
		fs.appendChild(FSrb);

		var FSlb = document.createElementNS("http://www.w3.org/2000/svg","path");
		FSlb.setAttribute("d","M "+right_x+" "+top_y+" H "+(right_x-brackettip)+" M "+right_x+" "+top_y+" L "+right_x+" "+bot_y+" H "+(right_x-brackettip));//M "+ fs.getBBox().width +" 2 L "+ fs.getBBox().width +" " + fs.getBBox().height + "H 7" );
		FSlb.setAttribute("style", "stroke:black; fill:none;");
		fs.appendChild(FSlb);
}


function drawTree (tree) {	
		var root;
		var rootHeight;
		var rootWidth;
		var daughters;
		var daughtersXpoint = 0;

		for (var i = 0; i < tree.children.length; i++) {
				var child = tree.children[i];
				if (child.getAttribute("type")=="node") {
						root = child;
						rootHeight = root.getBBox().height;
						rootWidth = root.getBBox().width;
				}
				if (child.getAttribute("type")=="children") {
						daughters = child;
						daughters.setAttribute("x",0);
				}		
		}

		if (tree.children.length > 2) {
				// TODO: something is wrong; throw error
		}

		// position children element
		if (daughters) {
				daughters.setAttribute ("y", rootHeight + offsetyNode);

				//	position children next to each other
				for (var i = 0; i < daughters.children.length; i++){
						var child = daughters.children.item(i);
						child.setAttribute ("x", daughtersXpoint);
						daughtersXpoint += child.getBBox().width + offsetxNode; 
				}
		}

		// center root node
		if (daughters) {
				if (daughters.getBBox().width > rootWidth) { //padding

						root.setAttribute ("x",
															 (parseInt(daughters.lastElementChild.getAttribute("x")) +
																parseInt(daughters.lastElementChild.firstElementChild.getAttribute("x")) +
																daughters.lastElementChild.firstElementChild.getBBox().width)/2 -
															 rootWidth/2);
						// console.log(daughters.lastElementChild.firstElementChild.getBBox().width);
						// console.log(daughters.lastElementChild.getAttribute("x"));
				}
				else{
						root.setAttribute ("x", 0);
						daughters.setAttribute ("x", rootWidth/2 - daughters.getBBox().width/2);
				}
		}

		// draw edges
		if (daughters) {
				for (var i = 0; i < daughters.children.length; i++){
						var child = daughters.children.item(i);
						var edge = document.createElementNS("http://www.w3.org/2000/svg","line");
						edge.setAttribute("x1", parseInt(root.getAttribute("x")) + root.getBBox().width/2);
						edge.setAttribute("x2", parseInt(daughters.getAttribute("x")) + parseInt(child.getAttribute("x")) + parseInt(child.firstElementChild.getAttribute("x")) + child.firstElementChild.getBBox().width/2);
						edge.setAttribute("y1", rootHeight + 3);
						edge.setAttribute("y2", rootHeight + offsetyNode + 2);
						edge.setAttribute("style", "stroke:black; fill:none;");
						edge.setAttribute("type","edge");
						tree.appendChild(edge);
				}
		}
}


function redrawNode (node) {
		var content, mark, ceswitch;
		var markWidth = 0;
		var markHeight = 0;
		var contentHeight = 0;
		var contentWidth = 0;
		var ceswitchHeight = 0;
		var ceswitchWidth = 0;

		for (var i = 0; i < node.children.length; i++){
				if (node.children[i].getAttribute("display") == "initial") {
						content = node.children[i];
						contentHeight = content.getBBox().height;
						contentWidth = content.getBBox().width;
				}
				if (node.children[i].getAttribute("type") == "mark") {
						mark = node.children[i];
						markWidth = mark.getBBox().width;
						markHeight = mark.getBBox().height;
				}
				if (node.children[i].getAttribute("type") == "ce-switch") {
						ceswitch = node.children[i];
						ceswitchWidth = ceswitch.getBBox().width;
						ceswitchHeight = ceswitch.getBBox().height;						
				}
		}

		if (!content) {return;}  // TODO: add error message
		if (content.getAttribute("type") == "catlabel") {
				content.setAttribute("x",ceswitchWidth);
		}
		if (mark) {
				if (content.getAttribute("type") == "catlabel") {
						mark.setAttribute("x",parseInt(content.getAttribute("x")) + contentWidth + 5 ); //padding
				}
				else {
						mark.setAttribute("x",parseInt(content.getAttribute("x")) + contentWidth + 7); //padding
				}
		}
		if (ceswitch) {
				if (content.getAttribute("type") == "catlabel") {
						ceswitch.setAttribute("x",parseInt(content.getAttribute("x")) + contentWidth + markWidth + 10); //padding
						ceswitch.setAttribute("y",contentHeight/2 - ceswitchHeight/2);
				}
				else {
						ceswitch.setAttribute("y",contentHeight/2 );
						if (markHeight*2 > contentHeight) {
								ceswitch.setAttribute("x",parseInt(content.getAttribute("x")) + contentWidth + markWidth + 10); //padding
						}
						else {
								ceswitch.setAttribute("x",parseInt(content.getAttribute("x")) + contentWidth + 10); //padding
						}
				}
		}
}

function redrawTree (tree) {
		
		// remove all edges
		for (var i = tree.children.length-1; i > 0; i--) {    // children have to be traversed backwards, because removeChild influences the index of the other children
				if (tree.children[i].getAttribute("type") == "edge") {
						tree.removeChild(tree.children[i]);			
				}
		}

		// draw tree again
		drawTree(tree);

		// check whether tree.parentNode.parentNode really exists
		if (tree.parentNode.parentNode.tagName &&	tree.parentNode.parentNode.hasAttribute("type") && tree.parentNode.parentNode.getAttribute("type") == "tree") {
				redrawTree(tree.parentNode.parentNode);
		}
}


function highlightLabel (evt) {
		var evtlabel = evt.target;
		var evtlabelName = evtlabel.getAttribute("name");

		// case A: label is already red
		// make label transparent again and return
		if (evtlabel.getAttribute("style") =="stroke:black; fill:red;") {
				var evtlabels = document.getElementsByName(evtlabelName);
				for (var i = 0; i < evtlabels.length; i++){
						var label = evtlabels.item(i);
						label.setAttribute("style", "stroke:black; fill:transparent;");
				}
				return;
		}

		// case B: label is not yet red
		// first remove any marks that might be left from last click
		var labels = document.getElementsByTagName("rect");
		for (var i = 0; i < labels.length; i++){
				var label = labels.item(i);
				if (label.parentNode.getAttribute("type")=="label") {
						label.setAttribute("style", "stroke:black; fill:transparent;");;
						console.log(evtlabelName);
				}
		}

		// then draw the mark
		var evtlabels = document.getElementsByName(evtlabelName);
		for (var i = 0; i < evtlabels.length; i++){
				var label = evtlabels.item(i);
				label.setAttribute("style", "stroke:black; fill:red;");
		}
}


function collapseExpandNodeEvent (evt) {
		// just a wrapper for collapeExpandnode()
		var ceswitch = evt.target.parentNode;
		collapseExpandNode(ceswitch);

		// adapt latex export if necessary
		if (svgRoot.getElementById("latexExport")) {
				// remove element latexExport
				var element = svgRoot.getElementById("latexExport");
				element.parentNode.removeChild(element);
				// draw new latexExport
				exportLatex("tree");
		}
}  

function collapseExpandNode (ceswitch) {
		// change ce-symbol
		for (var i = 0; i < ceswitch.children.length; i++){
				var child = ceswitch.children[i];
				if (ceswitch.getAttribute("ce-status") == "expanded") { ceswitch.setAttribute("ce-status","collapsed") }
				else { ceswitch.setAttribute("ce-status","expanded")}
				if (child.hasAttribute ("display")) {  
						if (child.getAttribute("display")!="initial") {
								child.setAttribute("display","initial");
						}
						else { child.setAttribute("display","none"); }
				}	
		}

		//	change node display
		var node = ceswitch.parentNode;
		for (var i = 0; i < node.children.length; i++) {
				if (node.children[i].getAttribute("type")=="fs") {
						var fs = node.children[i]; 
						if (fs.hasAttribute("display") && fs.getAttribute("display")!="initial") {
								fs.setAttribute("display","initial");
						}
						else {fs.setAttribute("display","none"); }
				}
				if (node.children[i].getAttribute("type")=="catlabel") {
						var catlabel = node.children[i];
						if (catlabel.hasAttribute("display") && catlabel.getAttribute("display")!="initial") {
								catlabel.setAttribute("display","initial");
						}
						else {catlabel.setAttribute("display","none"); }
				}			
		}
		redrawNode(node); 	//drawTree(node);
		redrawTree(node.parentNode);  // remove all edges; draw new ones 

} 

function addTreeButtons (target) {
		var tree = target.getElementsByTagName("svg")[0];
		var xpos;

		var buttonExportSVG = generateButton("SVG","exportSVG(evt,\"tree\")",target);
		buttonExportSVG.setAttribute("x", 0);
		xpos = buttonExportSVG.getBBox().width+5;  // padding

		var buttonExportLatex = generateButton("LaTeX","toggleLatexButton(\"tree\")",target);
		buttonExportLatex.setAttribute("x", xpos);
		buttonExportLatex.setAttribute("id","buttonLatex");
		xpos += buttonExportLatex.getBBox().width+5; // padding

		var buttonCollapseAll = generateButton("collapse","collapseAll(evt)",target);
		buttonCollapseAll.setAttribute("x", xpos);
		xpos += buttonCollapseAll.getBBox().width+5; // padding

		var buttonExpandAll = generateButton("expand","expandAll(evt)",target);
		buttonExpandAll.setAttribute("x", xpos);

		tree.setAttribute("y", buttonExportSVG.getBBox().height+10); // padding
}

function addFrameButtons (target) {
		var frame = target.getElementsByTagName("svg")[0];
		var xpos;

		var buttonExportSVG = generateButton("SVG","exportSVG(evt,\"frame\")",target);
		buttonExportSVG.setAttribute("x", 0);
		xpos = buttonExportSVG.getBBox().width+5;  // padding

		var buttonExportLatex = generateButton("LaTeX","toggleLatexButton(\"frame\")",target);
		buttonExportLatex.setAttribute("x", xpos);
		buttonExportLatex.setAttribute("id","buttonLatex");
		xpos += buttonExportLatex.getBBox().width+5; // padding
		
		frame.setAttribute("y", buttonExportSVG.getBBox().height+10); // padding
}


function generateButton(label,action,target) {
		var button = document.createElementNS("http://www.w3.org/2000/svg","svg");
		target.appendChild(button);
		button.setAttribute("type","button"); 
		
		var text = document.createElementNS("http://www.w3.org/2000/svg","text");
		text.setAttribute("font-size",15);
		text.setAttribute("text-anchor","start");
		text.setAttribute("x",2);
		text.setAttribute("y","1.2em");
		text.setAttribute("style", "font-family: sans-serif; font-weight: bold;");
		text.setAttribute("type","buttonText");
		text.innerHTML = label;
		button.appendChild(text);

		var background = document.createElementNS("http://www.w3.org/2000/svg","rect");
		background.setAttribute("x", 1);
		background.setAttribute("y", text.getBBox().y-1.2);
		background.setAttribute("width", text.getBBox().width+2);
		background.setAttribute("height", text.getBBox().height+1.2);
		background.setAttribute("style", "fill:lightgray;");
		background.setAttribute("type", "buttonInnerRect");
		button.appendChild(background);
		
		button.insertBefore(background,text);
		
		var box = document.createElementNS("http://www.w3.org/2000/svg","rect");
		box.setAttribute("x", 1);
		box.setAttribute("y", text.getBBox().y-1.2);
		box.setAttribute("width", text.getBBox().width+2);
		box.setAttribute("height", text.getBBox().height+1.2);
		box.setAttribute("cursor","pointer");
		box.setAttribute("onclick",action);
		box.setAttribute("style", "stroke:gray; fill:transparent;");
		button.appendChild(box);

		return(button);
}

function exportSVG (evt,targetType) {
		var tree;
		var siblings = evt.target.parentNode.parentNode.children;
		for (var i = 0;  i< siblings.length; i++) {
				if (siblings[i].getAttribute("type")==targetType) {
						tree = siblings[i].cloneNode(true);
				}
		}
		
		// clean-up SVG: remove ce-switch and onclick-stuff
		var svgElements = tree.getElementsByTagName("svg");
		for (var i = 0; i<svgElements.length; i++) {
				if (svgElements[i].getAttribute("type") == "ce-switch") {
						svgElements[i].parentNode.removeChild(svgElements[i]);
				}
		}
		var rectElements = tree.getElementsByTagName("rect");
		for (var i = 0; i< rectElements.length; i++) {
				if (rectElements[i].hasAttribute("onclick")) {
						rectElements[i].removeAttribute("onclick");
				}
				if (rectElements[i].hasAttribute("cursor")) {
						rectElements[i].removeAttribute("cursor");
				}
		}

		var serializer = new XMLSerializer();
    var blob = new Blob([serializer.serializeToString(tree)],{type:'text/svg'});
		saveAs(blob, entryName+".svg");
}

function collapseAll () {
		var all = document.getElementsByTagName("*");
		for (var i=0, max=all.length; i < max; i++) {
				
				if (all[i].hasAttribute("type") && all[i].getAttribute("type") == "ce-switch" && all[i].getAttribute("ce-status") == "expanded") {
						for (var j=0; j < all[i].children.length; j++ ) {
								if (all[i].children[j].tagName == "rect") {
										collapseExpandNode(all[i].children[j].parentNode);
								}
						}
						all[i].setAttribute("ce-status","collapsed");	
				}
		}

		// adapt latex export if necessary
		if (svgRoot.getElementById("latexExport")) {
				// remove element latexExport
				var element = svgRoot.getElementById("latexExport");
				element.parentNode.removeChild(element);
				// draw new latexExport
				exportLatex("tree");
		}
}


function expandAll () {
		var all = document.getElementsByTagName("*");
		for (var i=0, max=all.length; i < max; i++) {
											
				if (all[i].hasAttribute("type") && all[i].getAttribute("type") == "ce-switch" && all[i].getAttribute("ce-status") == "collapsed") {
						for (var j=0; j < all[i].children.length; j++ ) {
								if (all[i].children[j].tagName == "rect") {
										collapseExpandNode(all[i].children[j].parentNode);
								}
						}
						all[i].setAttribute("ce-status","expanded");	
				}
		}

		// adapt latex export if necessary
		if (svgRoot.getElementById("latexExport")) {
				// remove element latexExport
				var element = svgRoot.getElementById("latexExport");
				element.parentNode.removeChild(element);
				// draw new latexExport
				exportLatex("tree");
		}

}


function toggleButtonDisplay (button) {
		if (button.getAttribute("status") == "pressed" ) {
				for (var i = 0; i < button.children.length; i++ ) {
						if (button.children[i].getAttribute("type") == "buttonText") {
								button.children[i].setAttribute("style", "font-family: sans-serif; font-weight: bold;");
						}
						if (button.children[i].getAttribute("type") == "buttonInnerRect") {
								button.children[i].setAttribute("style","fill: lightgray;");
						}
				}
				button.setAttribute("status","unpressed");
		}
		else {
				for (var i = 0; i < button.children.length; i++ ) {
						if (button.children[i].getAttribute("type") == "buttonText") {
								button.children[i].setAttribute("style","font-family: sans-serif; stroke: white; fill: white;");
						}
						if (button.children[i].getAttribute("type") == "buttonInnerRect") {
								button.children[i].setAttribute("style","fill: blue;");
						}
				}
				button.setAttribute("status","pressed");
		}
		
}


function toggleLatexButton (targetType) {
		var latexButton = document.getElementById("buttonLatex");
		toggleButtonDisplay(latexButton);
		exportLatex(targetType);
}


function exportLatex (targetType) {
		var texStringIndent = "\t";

		// delete latexExport element if it already exists
		if (svgRoot.getElementById("latexExport")) {
				// remove element latexExport
				var element = svgRoot.getElementById("latexExport");
				element.parentNode.removeChild(element);
				return;
		}

		// create latexExport element
		var foreignObject;
		foreignObject = document.createElementNS("http://www.w3.org/2000/svg","foreignObject");
		foreignObject.setAttribute("id","latexExport");
		foreignObject.setAttribute("width","100%");
		foreignObject.setAttribute("height","100%");
		svgRoot.appendChild(foreignObject);
		
		var bodyElement = document.createElementNS("http://www.w3.org/1999/xhtml","body");
		foreignObject.appendChild(bodyElement);
		
		var textArea = document.createElementNS("http://www.w3.org/1999/xhtml","textarea");
		bodyElement.appendChild(textArea);
		textArea.setAttribute("disabled","false");
		textArea.setAttribute("rows","25");
		textArea.setAttribute("cols","50");

		if (targetType == "tree") {
				textArea.innerHTML = "\\Forest{\n\t" + texifyTree(dimensionRoot,texStringIndent) + "\n}\n";
		}
		if (targetType == "frame") {
				textArea.innerHTML = texifyFrame(dimensionRoot,texStringIndent) + "\n";
		}
		
		foreignObject.setAttribute("y", dimensionRoot.getAttribute("y"));
		foreignObject.setAttribute("x", dimensionRoot.getBBox().width + 20);
}


function texifyTree (tree,texStringIndent) {
		var texString = "\[";

		// process children of tree
		for (var i = 0; i < tree.children.length; i++) {
				if (tree.children[i].getAttribute("type") == "node") {
						texString +=  texifyNode(tree.children[i]);
				}
				if (tree.children[i].getAttribute("type") == "children") {
						texStringIndent += "\t";
						for (var j = 0; j < tree.children[i].children.length; j++) {
								texString += "\n" + texStringIndent + texifyTree(tree.children[i].children[j],texStringIndent);
						}
				}
		}

		texString += "\]";
		return(texString);
}

function texifyFrame (frame,texStringIndent) {
		var texString = "";
		for (var i = 0; i < frame.children.length; i++) {
				if (frame.children[i].getAttribute("type")=="fs") {
						texString +=
								"\\begin{avm}\n" +
								(frame.children[i].hasAttribute("label") ? "\\@{"+frame.children[i].getAttribute("label")+"}" : "") +
								texifyFS(frame.children[i],texStringIndent) +
								"\n\\end{avm}\n\n";
				}
		}
		return(texString);
}


function texifyNode (node) {
		var texString = "{";
		for (var i = 0; i < node.children.length; i++) {
				if (node.children[i].getAttribute("type") == "fs" && node.children[i].getAttribute("display") != "none") {
						texString += "\\begin{avm}";
						texString += texifyFS(node.children[i]);
						texString += "\\end{avm}";
				}
				if (node.children[i].getAttribute("type") == "fs" && node.children[i].getAttribute("display") == "none") {
						if (node.hasAttribute("phon")) {
								texString += "\\textit{" + node.getAttribute("phon") + "}";
						}
						else {
								texString += node.getAttribute("cat").toUpperCase();
						}
				}
		}
		if (node.hasAttribute("mark")) {
				var mark = node.getAttribute("mark");
				if (mark == "subst") {texString += "$\\downarrow$";}
				if (mark == "anchor") {texString += "$\\diamond$";}
				if (mark == "foot") {texString += "*";}
		}
		texString += "}";
		return(texString);
}


function texifyFS (fs){
		var texString = "\\[";
		if (fs.hasAttribute("fstype")) {
				texString += "\\asort{" + fs.getAttribute("fstype") + "}";
		}
		for (var i = 0; i < fs.children.length; i++) {
				var feature = fs.children[i];
				if (feature.getAttribute("type") == "feature") {
						texString += feature.getElementsByTagName("text")[0].innerHTML.toLowerCase();
						texString += " &amp; ";
					  if (feature.getElementsByTagName("svg")) { // value
								var value = feature.getElementsByTagName("svg")[0];
								var labelString = "";
								var valueString = "";
								for (var j = 0; j < value.children.length; j++) {
										if (value.children[j].tagName == "text" ){
												valueString = value.children[j].innerHTML;
										}
										if (value.children[j].getAttribute("type") == "label") {
												labelString = "\\@{" +  value.children[j].getElementsByTagName("text")[0].innerHTML +"} "; 
										}
										if (value.children[j].getAttribute("type") == "fs") {
												valueString += texifyFS(value.children[j]);
										}
								}
								texString += labelString + valueString + " \\\\ ";
						}
				}
		}
		texString += "\\]";
		return(texString);
}

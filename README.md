#dujs
A Dataflow analysis tool for JavaScript. (working project)
##Goal
Propose a tool to build a JavaScript Dataflow test model automatically, which includes four types of dataflow graph, intra-procedural, inter-procedural, intra-page and inter-page.<br>
Then the tool can compute all valid Def-Use pairs and dataflow anomalies.

##Dependency:
[analyses](https://github.com/Swatinem/analyses): Using the work list algorithm.<br>
[esgraph](https://github.com/Swatinem/esgraph): Intra-procedural CFG builder<br>
[walkes](https://github.com/Swatinem/walkes): Walker for the AST parsed by [esprima](https://github.com/ariya/esprima)<br>
[esprima](https://github.com/ariya/esprima): JavaScript parser<br>
[Graphviz](http://www.graphviz.org): currently should be installed on local and add path to executable files in your system environment.<br>
[core-js](https://github.com/zloirock/core-js): Use polyfills for ES6 Map and WeakMap

##Usage
```
node bin/dujs.js -js [src_file_page1_1] [src_file_page1_2] ... [src_file_page1_i] -js [src_file_page2_1] [src_file_page2_2] ... [src_file_page2_i]
```

Result files will located under the <strong>out-[year]-[month]-[day]-[hour]-[minute]-[second]</strong> directory

##Limits
<ul>
    <li>Anonymous function call</li>
    <li>Closure</li>
    <li>HTML DOM object</li>
</ul>

##Sample
###Source
<em>At default, add window and document as global variables</em>
####HTML source
```
<!DOCTYPE html>
<html>
<head>
  <link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css" rel="stylesheet" type="text/css" />
  <script src="https://code.jquery.com/jquery.min.js"></script>
  <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min.js"></script>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Canvs Ex</title>
<style id="jsbin-css">
canvas {
  border: solid 1px;
}
</style>
</head>
<body>
  <div class="row">
    <div class="col-lg-4 col-lg-offset-4 col-md-6 col-md-offset-3 col-sm-12">
      <h3>Source Image</h3>
      <img id="srcImg" src="demo.jpg" class="img-responsive center-block">
      <h3>Grayscale Image</h3>
      <canvas class="img-responsive center-block"></canvas>
    </div>
  </div>
<script id="jsbin-javascript" src="./demo.js"></script>
</body>
</html>
```
###JavaScript source
```
var img, height, width, canvas, context;

function rgb2grayscale(r,g,b) {
    var gray = Math.floor(r * 0.21 + g * 0.71 + b * 0.07);
    return [gray,gray,gray];
}
  
function imgOnClick() {
    context.drawImage(img, 10, 10, width, height);
}

function canvasOnClick() {
	var imgData = context.getImageData(10,10,width, height);
    for (var index = 0; index < imgData.data.length; index += 4) {
        var pixel = rgb2grayscale(imgData.data[index],
                                  imgData.data[index+1],
                                  imgData.data[index+2]);
        imgData.data[index] = pixel[0];
        imgData.data[index+1] = pixel[1];
        imgData.data[index+2] = pixel[2];
    }
    context.putImageData(imgData, 10, 10);
}

function getSourceHeight() {
    height = window.getComputedStyle(img).getPropertyValue('height');
    height = height.slice(0, height.indexOf('px'));
    height = parseInt(height);
}
    
function getSourceWidth() {
    width = window.getComputedStyle(img).getPropertyValue('width');
    width = width.slice(0, width.indexOf('px'));
    width = parseInt(width);
}

function setCanvasSize() {
    canvas.width = width + 20;
    canvas.height = height + 20;
}

function initializeCanvas() {
	canvas = document.querySelector('canvas');
    setCanvasSize();
    context = canvas.getContext('2d');
    context.drawImage(img, 10, 10, width, height);
	canvas.addEventListener('click', canvasOnClick);
}

function initializeSource() {
	img=document.querySelector('#srcImg');
	img.addEventListener('click', imgOnClick);
}

initializeSource();
getSourceHeight();
getSourceWidth();
initializeCanvas();
```
##Result
###Intra-procedural Dataflow graph and Def-Use pairs
<img src="sampleOutputs/report_intraprocedural.svg" alt="Output for intra-procedural dataflow graph and def-use pairs">
###Inter-procedural Dataflow graph and Def-Use pairs
<img src="sampleOutputs/report_interprocedural.svg" alt="Output for inter-procedural dataflow graph and def-use pairs">
###Intra-page Dataflow graph and Def-Use pairs
<img src="sampleOutputs/report_intrapage.svg" alt="Output for intra-page dataflow graph and def-use pairs">
###Inter-page Dataflow graph and Def-Use pairs
<img src="sampleOutputs/report_interpage.svg" alt="Output for inter-page dataflow graph and def-use pairs">
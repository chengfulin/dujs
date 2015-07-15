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

##Demo
[Single page sample](http://chengfulin.github.io/dujs/)
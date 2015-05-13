#dujs
##Def-Use tool for JavaScript
(working project)

Aim to find the intra-procedural, inter-procedural and intra-page Def-Use pairs of the client-side JavaScript.

##Dependency:
[analyses](https://github.com/Swatinem/analyses): Using the work list algorithm.<br>
[esgraph](https://github.com/Swatinem/esgraph): CFG builder<br>
[walkes](https://github.com/Swatinem/walkes): AST walker for [esprima](https://github.com/ariya/esprima) parsed tree<br>
[esprima](https://github.com/ariya/esprima): AST parser<br>
[Graphviz](http://www.graphviz.org): should be installed on local and add path to executable files in your system environment.

##Usage
```
cat source_file | node bin/dujs.js
```
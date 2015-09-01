/*
 * Main execution
 * @lastmodifiedBy ChengFuLin
 * @lastmodifiedDate 2015-09-01
 */
var inputReader = require('../lib/dujs/inputreader'),
    sourceReader = require('../lib/dujs/sourcereader'),
    outputWriter = require('../lib/dujs/outputwriter'),
    reportGenerator = require('../lib/dujs/reportgenerator'),
    defuseAnalysisExecutor = require('../lib/dujs/defuseanalysisexecutor');

/* Main */
try {
    var jsFileNamesOfPages = inputReader.readInput(process.argv);
    var sourceContents = [];
    for (var index = 0; index < jsFileNamesOfPages.length; ++index) {
        var content = sourceReader.getSourceFromFiles(jsFileNamesOfPages[index]);
        outputWriter.createOutputDirectories(index);
        outputWriter.writeCombinedJSSource(content, index);
        sourceContents.push(content);
    }

    defuseAnalysisExecutor.initialize(sourceContents);
    defuseAnalysisExecutor.buildIntraProceduralModelsOfEachPageModels();
    outputWriter.writeIntraProceduralAnalysisResultFiles();

    defuseAnalysisExecutor.buildInterProceduralModelsOfEachPageModels();
    outputWriter.writeInterProceduralAnalysisResultFiles();

    defuseAnalysisExecutor.buildIntraPageModelsOfEachPageModels();
    outputWriter.writeIntraPageAnalysisResultFiles();

    defuseAnalysisExecutor.buildInterPageModelsOfEachPageModels();
    outputWriter.writeInterPageAnalysisResultFiles();

    reportGenerator.createReport();
} catch(err) {
    console.error('*** ERROR:  '+ err.message + '  ***');
}
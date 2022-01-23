import data from './wordAndPatternData.json';
const wordList = data.words;
const patternsList = data.patterns;

function getData(selector, value) {
     var matchingElements = [];
     (selector == "word" ? wordList : patternsList).forEach((element) => {
          if (element[0].toUpperCase().includes(value.toUpperCase()) || element[1].toUpperCase().includes(value.toUpperCase())) {
               matchingElements.push(element);
          }
     });
     return matchingElements;
}

function getSchema() {
     return data.$schema;
}

export { getData, getSchema };
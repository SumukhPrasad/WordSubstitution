import data from './wordAndPatternData.json';
const wordList = data.words;
const patternsList = data.patterns;

function getData(selector, filter, value) {
     var matchingElements = [];
     (selector == "word" ? wordList : patternsList).forEach((element) => {
          if (element[getSchema().indexOf(filter)].toUpperCase().includes(value.toUpperCase())) {
               matchingElements.push(element);
          }
     });
     return matchingElements;
}

function getSchema() {
     return data.$schema;
}

export { getData, getSchema };
# WordSubstitution

This is a simple browser extention to quickly see the differences between British and American English. Of course, you can customise this to your liking.
**How to customise:**
- Open [`src/src/lib/wordAndPatternData.json`](src/src/lib/wordAndPatternData.json).
- Edit the schema. (Schema order: `["lang1Name", "lang2Name", "additionalName"]`)
- Add words to the `words` (eg., `["anchor", "newsreader", "someone who reads the news on television/radio"]`) object and patterns (eg., `["e*", "oe*", "oestrogen"]`) to the patterns object.

For **Packaging For Extentions**, refer to [`src/README.md`](src/README.md)
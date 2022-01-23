<script>
     import { getData, getSchema } from "../lib/dataRetriever.js";
     import { currentSearchAndResults, currentWord } from '../lib/sharedData.js';
     import SearchSelect from "./subcomponents/SearchSelect.svelte";
     $currentWord = null;
     const schema = getSchema().slice(0, -1);
     $currentSearchAndResults = {
          content: [],
          search: null,
          searchFilter: schema[0],
          selector: "word"
     };
     function handleKeyup(e) {
          if (e.target.value == '') return;
          $currentSearchAndResults.search = e.target.value;
          $currentSearchAndResults.content = getData($currentSearchAndResults.selector, $currentSearchAndResults.searchFilter, $currentSearchAndResults.search);
     }
</script>

<section>
     <form on:submit|preventDefault>
          <input type="text" autocapitalize="false" autocomplete="false" spellcheck="false" placeholder="Word" on:keyup|preventDefault={handleKeyup}><br>
          Search for: <select bind:value={$currentSearchAndResults.selector}>
               <option value="word">Words</option>
               <option value="pattern">Patterns</option>
          </select><br>
          Search in: <select bind:value={$currentSearchAndResults.searchFilter}>
               {#each schema as option}
                    <option value={option}>{option}</option>
               {/each}
          </select>
     </form>
     <div>
          {#each $currentSearchAndResults.content as suggestion}
               <SearchSelect contentArray={suggestion}>{@html suggestion[schema.indexOf($currentSearchAndResults.searchFilter)].replaceAll($currentSearchAndResults.search, ("<b>" + $currentSearchAndResults.search + "</b>"))}</SearchSelect>
          {/each}
     </div>
</section>

<style>
     
</style>



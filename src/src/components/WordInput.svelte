<script>
     import { getData } from "../lib/dataRetriever.js";
     import { currentSearchAndResults } from '../lib/sharedData.js';
     $currentSearchAndResults = {
          content: [],
          search: null,
          selector: "word"
     };
     function handleKeyup(e) {
          if (e.target.value == '') return;
          $currentSearchAndResults.search = e.target.value;
          $currentSearchAndResults.content = getData($currentSearchAndResults.selector, $currentSearchAndResults.search);
     }
</script>

<main>
     <form on:submit|preventDefault>
          <input type="text" placeholder="Word" on:keyup|preventDefault={handleKeyup}><br>
          Search for: <select bind:value={$currentSearchAndResults.selector}>
               <option value="word">Words</option>
               <option value="pattern">Patterns</option>
          </select>
     </form>
     <div>
          {#each $currentSearchAndResults.content as suggestionArray}
               {@html (suggestionArray[0] + " / " + suggestionArray[1]).replaceAll($currentSearchAndResults.search, ("<b>" + $currentSearchAndResults.search + "</b>"))}<br>
          {/each}
     </div>
</main>

<style>
     
</style>



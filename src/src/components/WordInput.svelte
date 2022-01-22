<script>
     import { getData } from "../lib/dataRetriever.js";
     import { current } from '../lib/sharedData.js';
     $current = {
          content: [],
          search: null,
          selector: "word"
     };
     function handleKeyup(e) {
          if (e.target.value == '') return;
          $current.search = e.target.value;
          $current.content = getData($current.selector, $current.search);
     }
</script>

<main>
     <form on:submit|preventDefault>
          <input type="text" placeholder="Word" on:keyup|preventDefault={handleKeyup}><br>
          Search for: <select bind:value={$current.selector}>
               <option value="word">Words</option>
               <option value="pattern">Patterns</option>
          </select>
     </form>
     <div>
          {#each $current.content as suggestionArray}
               {@html (suggestionArray[0] + " / " + suggestionArray[1]).replaceAll($current.search, ("<b>" + $current.search + "</b>"))}<br>
          {/each}
     </div>
</main>

<style>
     
</style>



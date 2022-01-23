<script>
     import { currentSearchAndResults } from "../lib/sharedData.js";
     import { getSchema } from "../lib/dataRetriever.js";

     const schema = getSchema();
</script>

<main>
     {#if $currentSearchAndResults.search == null}
          No word/pattern selected.
     {:else}
     {#each $currentSearchAndResults.content as wordOrPatternArray}
          {schema[0]}: {wordOrPatternArray[0]}<br>
          {schema[1]}: {wordOrPatternArray[1]}<br>
          {schema[2]}: {wordOrPatternArray[2] == "" ? "None." : wordOrPatternArray[2]}<br>
     {/each}
     {/if}
</main>

<style>
     
</style>



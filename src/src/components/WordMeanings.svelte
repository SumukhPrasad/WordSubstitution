<script>
     import { currentWord } from "../lib/sharedData.js";
     import { getSchema } from "../lib/dataRetriever.js";

     const schema = getSchema();
</script>

<section>
     {#if $currentWord == null}
          No word/pattern selected.
     {:else}
          {schema[0]}: {$currentWord[0]}<br>
          {schema[1]}: {$currentWord[1]}<br>
          {schema[2]}: {$currentWord[2] == "" ? "None." : $currentWord[2]}<br>
     {/if}
</section>

<style>
     
</style>



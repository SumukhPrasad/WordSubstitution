<script>
     import { currentWord } from "../lib/sharedData.js";
     import { getSchema } from "../lib/dataRetriever.js";

     const schema = getSchema();
</script>

<section>
     {#if $currentWord == null}
          <div class="placeholder-text">
               No word/pattern selected.
          </div>
     {:else}
          <b>{schema[0]}</b>: {$currentWord[0]}<br>
          <b>{schema[1]}</b>: {$currentWord[1]}<br>
          <b>{schema[2]}</b>: {$currentWord[2] == "" ? "None." : $currentWord[2]}<br>
     {/if}
</section>

<style>
     .placeholder-text {
          color: rgba(0, 0, 0, 0.5);
          font-size: 25px;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -o-user-select: none;
     }
</style>



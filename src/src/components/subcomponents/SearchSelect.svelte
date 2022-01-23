<script>
     import { currentWord } from "../../lib/sharedData";
     function updateSearchTerm() {
          $currentWord = contentArray;
     }
     export let contentArray;
</script>

<div on:click={updateSearchTerm} class="searchResult" isActive={$currentWord == contentArray}>
     <slot />
</div>

<style>
     .searchResult[isActive="true"] { 
          background-color: #006cff;
          color: #fff;
     }
</style>
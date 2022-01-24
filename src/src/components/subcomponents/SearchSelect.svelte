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
     .searchResult {
          height: 20px;
          border-radius: 5px;
          padding-right: 2px;
          padding-left: 2px;
          width: auto;
          font-size: 17px;
     }
     .searchResult[isActive="true"] { 
          background-color: #006cff;
          color: #fff;
     }
</style>
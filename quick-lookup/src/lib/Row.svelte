<script>
  import Layer from "./Layer.svelte";

  export let activeLayer = 0;

  export let labelsSet = [];

  // TODO: use this for readability
  // $: isInShortcutsMode = activeLayer > 7;
</script>

<div class="flex">
  {#each labelsSet as labels}
    <div class="m-1">
      <Layer 
             isActive={labels.activeLayerIndexes.includes(activeLayer)} 
             labels = {
              activeLayer > 7 && labels.hasOwnProperty("shortcutsMode") 
                ? labels.shortcutsMode 
                : labels.normalMode
             }
             isVisitedByHoldingL1={labels.isVisitedByHoldingL1}
             isVisitedByHoldingR1={labels.isVisitedByHoldingR1} />
    </div>
  {/each}
</div>

<style>
  .flex {
    display: flex;
  }
  .m-1 {
    margin: 0.2rem;
  }
</style>

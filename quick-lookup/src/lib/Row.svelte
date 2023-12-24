<script>
  import Layer from "./Layer.svelte";

  export let activeLayer = 0;
  export let layerIndexFrom = 0;

  export let labelsSet = [];

</script>

<div class="flex">
  {#each labelsSet as labels,idx}
    <div class="m-1">
      <Layer isActive={idx+layerIndexFrom==activeLayer} 
             isMouseControls={idx+layerIndexFrom==4} 
             {labels} 
             isVisitedByHoldingL1={[1,3,5,7].includes(idx+layerIndexFrom)}
             isVisitedByHoldingR1={[2,3,6,7].includes(idx+layerIndexFrom)} />
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

<script>
  import Normal from "./Circle/Normal.svelte";
  import SpecialCircleContainer from "./SpecialCircleContainer.svelte";

  export let isActive = false;
  export let labels = {};
  export let isVisitedByHoldingL1 = false;
  export let isVisitedByHoldingR1 = false;
</script>

<div class="label">
  <div class="container">
    <span class="trigger left" class:active={isActive} class:down={isVisitedByHoldingL1}>L1</span>
    +
    <span class="trigger right" class:active={isActive} class:down={isVisitedByHoldingR1}>R1</span>
  </div>
</div>

<div class="keys-set-container" class:active={isActive}>
  <div class="flex">
    <div class="m-1">
      {#if labels.leftUpper.hasOwnProperty("special")}
        <SpecialCircleContainer {isActive} type={labels.leftUpper.special}/>
      {:else}
        <Normal {isActive} labels={labels.leftUpper}/>
      {/if}
    </div>
    <div class="m-1">
      {#if labels.rightUpper.hasOwnProperty("special")}
        <SpecialCircleContainer {isActive} type={labels.rightUpper.special}/>
      {:else}
        <Normal {isActive} labels={labels.rightUpper}/>
      {/if}
    </div>
  </div>
  <div class="flex">
    <div class="m-1">
      {#if labels.leftLower.hasOwnProperty("special")}
        <SpecialCircleContainer {isActive} type={labels.leftLower.special}/>
      {:else}
        <Normal {isActive} labels={labels.leftLower}/>
      {/if}
    </div>
    <div class="m-1">
      {#if labels.rightLower.hasOwnProperty("special")}
        <SpecialCircleContainer {isActive} type={labels.rightLower.special}/>
      {:else}
        <Normal {isActive} labels={labels.rightLower}/>
      {/if}
    </div>
  </div>
</div>

<style>
  .flex {
    display: flex;
  }
  .m-1 {
    margin: 0.15rem;
  }
  .keys-set-container {
    padding: 0.1rem;
    padding-top: 1rem;
    border-radius: 0.5em;
    border: 1px solid var(--on-background-color);
  }

  .active {
    border: 1px solid var(--active-highlight-color);
  }
  .label {
    position: relative;
    bottom: -10px;
    left: 8px;
  }

  /* styles for trigger-keys */
  .container{
    background-color: var(--background-color);
    width: fit-content;
    color: var(--on-background-color);
  }
  .trigger {
    display: inline-block;
    width: 1.7rem;
    padding: .3em 1em;
    font-weight: bold;
    font-size: .8em;
    background-color: var(--background-color);
    border: 1px solid var(--on-background-color);
    color: var(--on-background-color);
  }
  .trigger.active{
    border: 1px solid var(--active-highlight-color);
    color: var(--active-highlight-color);
  }
  .trigger.down {
    background-color: var(--on-background-color);
    border: 1px solid var(--on-background-color);
    color: var(--background-color);
  }
  .trigger.down.active{
    background-color: var(--active-highlight-color);
    border: 1px solid var(--active-highlight-color);
    color: var(--on-active-highlight-color);
  }
  .trigger.left{
    border-radius: 1em .2em .2em .2em;
    text-align: right
  }
  .trigger.right{
    border-radius: .2em 1em .2em .2em;
  }
</style>

<script>
  import CardinalKeysSet from "./CardinalKeysSet.svelte";
  import TriggersIndicator from "./TriggersIndicator.svelte";

  export let isActive = false;
  export let labels = [];
  export let stepNum = 0;

  export let isMouseControls = false;
</script>

<div class="label">
  <TriggersIndicator l1Down={stepNum>1} {isActive} r1Down={stepNum==1 || stepNum ==3}/>
</div>
<div class="keys-set-container" class:active={isActive}>
  <div class="flex">
    <div class="m-1"><CardinalKeysSet {isActive} labels={labels.slice(4,8)} 
      isCardinalMoveArrows={isMouseControls}/></div>
    <div class="m-1"><CardinalKeysSet {isActive} labels={labels.slice(12,16)} 
      isMouseButtons={isMouseControls}/></div>
  </div>
  <div class="flex">
    <div class="m-1"><CardinalKeysSet {isActive} labels={labels.slice(0,4)} 
      isMouseCursorMovement={isMouseControls}/></div>
    <div class="m-1"><CardinalKeysSet {isActive} labels={labels.slice(8,12)}
      isMouseScrollMovement={isMouseControls}/></div>
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
</style>

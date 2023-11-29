<script>
  import CardinalKeysSet from "./CardinalKeysSet.svelte";

  export let isActive = true;
  // export let labels = [];
  // export let stepNum = 0;

  export let isMouseControls = false;
  let labels = [
    "_",
    "Redo (Ctrl + Shift + z)",
    "_",
    "Undo (Ctrl + z)",
    "_",
    "_",
    "_",
    "_",
    "Select all (Ctrl + a)",
    "Copy (Ctrl + c)",
    "Paste (Ctrl + v)",
    "Cut (Ctrl + x)",
    "_",
    "_",
    "_",
    "_",
  ];

//  let labels = ['1','2','3','4','5','6','7','8','9','a','b','c','d','e','f','g','h'];
  function getNumbering(idx){
    if(idx==0) return 'N';
    else if (idx==1) return 'E';
    else if (idx==2) return 'S';
    else if (idx==3) return 'W';
    else if (idx==4) return 'n';
    else if (idx==5) return 'e';
    else if (idx==6) return 's';
    else if (idx==7) return 'w';
  }
</script>

<div class="flex items-center">
  <div class="mx-2">
    {#each labels.slice(0,8) as label,idx}
    <div class="label justify-end" class:mb-4={idx==3}>
        <div class="text">{label}</div>
        <div class="numbering">{getNumbering(idx)}</div>
    </div>
    {/each}
  </div>
    <div class="keys-set-container" class:active={isActive}>
      <div class="flex">
        <div class="m-1"><CardinalKeysSet {isActive} labels={["N","E","S","W"]} 
          isCardinalMoveArrows={isMouseControls}/></div>
        <div class="m-1"><CardinalKeysSet {isActive} labels={["N","E","S","W"]}  
          isMouseButtons={isMouseControls}/></div>
      </div>
      <div class="flex">
        <div class="m-1"><CardinalKeysSet {isActive} labels={["n","e","s","w"]} 
          isMouseCursorMovement={isMouseControls}/></div>
        <div class="m-1"><CardinalKeysSet {isActive} labels={["n","e","s","w"]}
          isMouseScrollMovement={isMouseControls}/></div>
      </div>
    </div>
  <div class="mx-2">
    {#each labels.slice(8,16) as label,idx}
    <div class="label" class:mb-4={idx==3}>
        <div class="numbering">{getNumbering(idx)}</div>
        <div class="text">{label}</div>
    </div>
    {/each}
  </div>
</div>

<style>
  .flex {
    display: flex;
  }
  .items-center{
    align-items: center;
  }
  .m-1 {
    margin: 0.15rem;
  }
  .keys-set-container {
    padding: 0.1rem;
    border-radius: 0.5em;
    border: 1px solid var(--on-background-color);
  }

  .active {
    border: 1px solid var(--active-highlight-color);
  }
  .label {
    display: flex;
    color: var(--on-background-color);
    align-items: center;
    margin-bottom: .25rem;
  }
  .label.justify-end {
    justify-content: end;
  }
  .label .numbering {
    background-color: #D9D9D9;
    color: black;
      border-radius: .3rem;
      min-height: 1.8em;
      min-width: 1.8em;
      display: flex;
      justify-content: center;
      align-items: center;
  }
  .label .text {
    background-color: var(--on-background-color);
    color: var(--background-color);
    padding: .25em;
    border-radius: .3rem;
  }
  .mb-4{
    margin-bottom: 1rem;
  }
  .mx-2{
    margin-left: .5rem;
    margin-right: .5rem;
  }
</style>


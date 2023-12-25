<script>
  import MouseButtons from "./Circle/MouseButtons.svelte";
  import DirectionArrows from "./Circle/DirectionalArrows.svelte";
  import MouseCursor from "./Circle/MouseCursor.svelte";
  import MouseScroll from "./Circle/MouseScroll.svelte";
  import ModifierKeys from "./Circle/ModifierKeys.svelte";

  export let isActive = false;
  export let type = "";
</script>

<div>
  {#if type == "mouse-buttons"}
    <MouseButtons {isActive} />
  {:else if type == "mouse-scroll"}
    <MouseScroll {isActive} />
  {:else if type == "mouse-cursor"}
    <MouseCursor {isActive} />
  {:else if type == "directional-arrows"}
    <DirectionArrows {isActive} />
  {:else if type == "shortcuts-modifier-keys"}
    <ModifierKeys {isActive} />
  {:else}
    (Unknown special circle)
  {/if}
</div>

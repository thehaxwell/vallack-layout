<script>
  import {listen} from './events';
//  import ShortcutsLayer from "./lib/ShortcutsLevel/index.svelte";
//	import { fly } from 'svelte/transition';
  //TODO: make Inter font work
  import './lib/fonts/fonts.css';

  import Layout from "./lib/Layout.svelte";

  let activeLayer = 0;

  listen((payload) => {
    activeLayer = payload.layer;
  });
</script>


<div class="flex justify-center">
  <div class="m-1">
    <Layout activeLayer={activeLayer} />
  </div>
  <div class="shortcuts-indicator-container" class:active={activeLayer > 7}>
    Hold <strong>R2</strong> to go to Ctrl mode
  </div>
  <!-- {#if activeLayer === 8} -->
  <!--   <div class="overlay" transition:fly={{x:50}}> -->
  <!--     <ShortcutsLayer/> -->
  <!--   </div> -->
  <!-- {/if} -->
</div>

<style>
:global(html) {
  --background-color: white;
  --on-background-color: #3c3c3c;
  --active-highlight-color: #4B6BFB;
  --on-active-highlight-color: white;
}

:global(html[data-theme='dark']) {
  --background-color: #1A1A1A;
  --on-background-color: #828282;
  --active-highlight-color: #1C4F82;
  --on-active-highlight-color: #fefefe;
}

:global(body) {
  background-color: var(--background-color);
  font-family: Inter;
}

.flex {
  display: flex;
}
.overlay {
  background-color: var(--background-color);
  position: absolute;
  margin: auto;
  padding: 2rem;
  box-shadow: 8px 12px 42px -10px rgba(0,0,0,0.47);
  -webkit-box-shadow: 8px 12px 42px -10px rgba(0,0,0,0.47);
  -moz-box-shadow: 8px 12px 42px -10px rgba(0,0,0,0.47);
  border-radius: 10px;
  border: 1px solid var(--on-background-color);
}
.justify-center {
  justify-content: center;
}
.shortcuts-indicator-container {
  background-color: var(--on-background-color);
  border-radius: 20px;
  margin: 8px;
  writing-mode: vertical-rl;
  text-orientation: mixed;
  padding: 16px 8px;
  color:  var(--background-color);
}
.shortcuts-indicator-container.active {
  background-color: var(--active-highlight-color);
  color: var(--on-active-highlight-color);
}
</style>

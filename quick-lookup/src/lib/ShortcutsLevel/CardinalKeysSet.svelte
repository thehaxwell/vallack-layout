<script>
  export let labels = [];
  export let isActive = false;

</script>

<div class="switches-container" class:active={isActive}>
    <div class="flex">
      <div class="kbd">{labels[0]}</div>
      <div class="kbd">{labels[1]}</div>
    </div>
    <div class="flex">
      <div class="kbd">{labels[3]}</div>
      <div class="kbd">{labels[2]}</div>
    </div>
</div>

<style>
  .switches-container {
    width: fit-content;
    padding: .4rem;
    border-radius: 100%;
    rotate: 45deg;
    border: 1px solid transparent;
    background-color: var(--on-background-color);
  }
  .switches-container.active {
    background-color: var(--active-highlight-color);
    border: 1px solid var(--active-highlight-color);
  }

  .kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-width: 1px;
      border-color: hsl(215 28% 17%);
      background-color: #D9D9D9;
      border-radius: .3rem;
      border-bottom-width: 2px;
      min-height: 1.8em;
      min-width: 1.8em;
      margin: .1em;
      rotate: -45deg;
  }
  .flex {
    display: flex;
  }
</style>

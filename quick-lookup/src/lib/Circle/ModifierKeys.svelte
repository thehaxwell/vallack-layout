<script>
  export const labels = [];
  export let isActive = false;
</script>

<div class="switches-container" class:active={isActive}>
    <div class="flex">
      <div class="kbd">Win</div>
      <div class="kbd">Shift</div>
    </div>
    <div class="flex">
      <div class="kbd">Alt</div>
      <div class="kbd">Ctrl</div>
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
    font-size: 0.6rem;
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
      min-height: 1.8rem;
      min-width: 1.8rem;
      margin: .1em;
      rotate: -45deg;
  }
  .flex {
    display: flex;
  }
</style>

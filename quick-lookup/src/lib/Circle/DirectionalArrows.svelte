<script>
  export const labels = [];
  export let isActive = false;
</script>
<div class="switches-container" class:active={isActive}>
    <div class="flex">
      <div class="kbd">
        <!-- Up arrow icon -->
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.94 0L0 6H4V16H6V6H10L4.94 0Z" fill="black"/>
        </svg>
      </div>
      <div class="kbd">
        <!-- Right arrow icon -->
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 0V4H0V6H10V10L16 4.94L10 0Z" fill="black"/>
        </svg>
      </div>
    </div>
    <div class="flex">
      <div class="kbd">
        <!-- Left arrow icon -->
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 0L0 5.06L6 10V6H16V4H6V0Z" fill="black"/>
        </svg>
      </div>
      <div class="kbd">
        <!-- Down arrow icon -->
        <svg width="10" height="16" viewBox="0 0 10 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 0V10H0L5.06 16L10 10H6V0H4Z" fill="black"/>
        </svg>
      </div>
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

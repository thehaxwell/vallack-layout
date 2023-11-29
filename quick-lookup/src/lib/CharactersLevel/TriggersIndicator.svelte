<script>
  export let l1Down = false;
  export let r1Down = true;
  export let isActive = false;
</script>

<div class="container">
  <span class="trigger left" class:active={isActive} class:down={l1Down}>L1</span>
  +
  <span class="trigger right" class:active={isActive} class:down={r1Down}>R1</span>
</div>

<style>
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

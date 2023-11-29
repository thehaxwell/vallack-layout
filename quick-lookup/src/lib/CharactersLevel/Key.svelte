
<div class="kbd">
  <slot/>
</div>

<style>
:root {
  --nc: 212 19% 87%;
  --b1: 0 0% 100%;
  --b2: 0 0% 95%;
  --b3: 180 2% 90%;
  --bc: 215 28% 17%;
}

.kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-width: 1px;
    border-color: hsl(var(--bc)/var(--tw-border-opacity));
    --tw-border-opacity: .2;
    --tw-bg-opacity: 1;
    background-color: hsl(var(--b2)/var(--tw-bg-opacity));
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    border-radius: var(--rounded-btn,.5rem);
    border-bottom-width: 2px;
    min-height: 2.2em;
    min-width: 2.2em;
}
</style>

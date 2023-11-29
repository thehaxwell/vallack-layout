<script>
  import ControllerKeysSet from "./ControllerKeysSet.svelte";

  export let activeLayer = 0;

  let level1Labels = [
    [
      "t","h","e","r",  "T","H","E","R",
      "i","o","a","n",  "I","O","A","N",
    ],
    [
      "w","c","s","u",  "W","C","S","U",
      "y","f","v","m",  "Y","f","V","M",
    ],
    [
      "l","p","d","⌫",  "L","P","D","Esc",
      "k","➟","b","g",  "K","↵","B","G",
    ],
    [
      "z","","","j",    "Z","","","J",
      "q","x","","",    "Q","X","","",
    ],
  ];

 let level2Labels = [
    [
      "","","","",      "","","","",
      "","","","",      "","","","",
    ],
    [
    "1","2","3","4",  "!","@","#","$",
    "5","6","7","8",  "%","^","&","*",
    ],
    [
    "9","0",".",",",  "(",")",">","<",
    "'",";","]","[",  "\"",":","}","{",
    ],
    [
    "-","/","=","`",  "_","?","+","~",
    "⇥","\\","","",  "⇤","|","","",
    ],
  ];

</script>

<div>
  <div class="flex">
    {#each level1Labels as labels,idx}
      <div class="m-1"><ControllerKeysSet isActive={idx==activeLayer} {labels} stepNum={idx}/></div>
    {/each}
  </div>
  <div class="instructions">
    Double-click <span class="l1">L1</span> or <span class="r1">R1</span> to go up or down (Hold to go back on release)
  </div>
  <div class="flex">
    {#each level2Labels as labels,idx}
      <div class="m-1">
        <ControllerKeysSet isActive={idx+4==activeLayer} {labels} stepNum={idx}
        isMouseControls={idx==0}/></div>
    {/each}
  </div>
</div>

<style>
  .flex {
    display: flex;
  }
  .m-1 {
    margin: 0.2rem;
  }
  .instructions {
    margin-top: 1rem;
    text-align: center;
    color: var(--on-background-color);
  }
  .r1,.l1 {
    display: inline-block;
    width: 1.7rem;
    padding: .3em 1em;
    font-weight: bold;
    font-size: .8em;
    background-color: var(--active-highlight-color);
    border: 1px solid var(--active-highlight-color);
    color: var(--on-active-highlight-color);
  }

  .l1{
    border-radius: 1em .2em .2em .2em;
    text-align: right;
  }
  .r1{
    border-radius: .2em 1em .2em .2em;
    text-align: left;
  }
</style>

<script>
  import Row from "./Row.svelte";

  export let activeLayer = 0;


  // there are 8 layers, the first 4 (indexed 0 to 3)
  // are at the top. The last 4 (indexed 4 to 7)
  // are at the bottom.
  let layers = [
    // 0
    {
      rightUpper: { north: "I", east: "O", south: "A", west: "N", },
      rightLower: { north: "i", east: "o", south: "a", west: "n", },
      leftUpper: { north: "T", east: "H", south: "E", west: "R", },
      leftLower: { north: "t", east: "h", south: "e", west: "r", },
    },
    // 1
    {
      rightUpper: { north: "K", east: "↵", south: "B", west: "G", },
      rightLower: { north: "k", east: "➟", south: "b", west: "g", },
      leftUpper: { north: "L", east: "P", south: "D", west: "Esc", },
      leftLower: { north: "l", east: "p", south: "d", west: "⌫", },
    },
    // 2
    {
      rightUpper: { north: "Y", east: "F", south: "V", west: "M", },
      rightLower: { north: "y", east: "f", south: "v", west: "m", },
      leftUpper: { north: "W", east: "C", south: "S", west: "U", },
      leftLower: { north: "w", east: "c", south: "s", west: "u", },
    },
    // 3
    {
		  leftUpper: { north: "Z", east: "", south: "", west: "J", },
      leftLower: { north: "z", east: "", south: "", west: "j", },
		  rightUpper: { north: "Q", east: "X", south: "👁️", west: "", },
      rightLower: { north: "q", east: "x", south: "", west: "", },
    },


    // 4
    {
		  rightUpper: { special: "mouse-buttons", },
      rightLower: { special: "mouse-scroll", },
		  leftUpper: { special: "directional-arrows", },
      leftLower: { special: "mouse-cursor", },
    },
    // 6
    {
      rightUpper: { north: "%", east: "^", south: "&", west: "*", },
      rightLower: { north: "5", east: "6", south: "7", west: "8", },
      leftUpper: { north: "!", east: "@", south: "#", west: "$", },
      leftLower: { north: "1", east: "2", south: "3", west: "4", },
    },
    // 5
    {
      rightUpper: { north: "\"", east: ":", south: "}", west: "{", },
      rightLower: { north: "'", east: ";", south: "]", west: "[", },
      leftUpper: { north: "(", east: ")", south: ">", west: "<", },
      leftLower: { north: "9", east: "0", south: ".", west: ",", },
    },
    // 7
    {
      rightUpper: { north: "⇤", east: "|", south: "👁️", west: "", },
      rightLower: { north: "⇥", east: "\\", south: "", west: "", },
      leftUpper: { north: "_", east: "?", south: "+", west: "~", },
      leftLower: { north: "-", east: "/", south: "=", west: "`", },
    },
  ];
</script>

<div>
  <Row labelsSet={layers.slice(0,4)} activeLayer={activeLayer}/>
  <div class="instructions">
    Double-click <span class="l1">L1</span> or <span class="r1">R1</span> to go up or down (Hold to go back on release)
  </div>
  <Row labelsSet={layers.slice(4,8)} activeLayer={activeLayer} mouseControlsAtIndex={0} layerIndexFrom={4}/>
</div>

<style>
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

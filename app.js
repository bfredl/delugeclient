import {loadlib} from "./lib.js";

/** @type {MIDIAccess} */
let midi = null;
/** @type {MIDIInput} */
let delugeIn = null;
/** @type {MIDIOutput} */
let delugeOut = null;
let theInterval = null;

let lib = null;
loadlib(function(l) {
  lib = l;
  window.lib = l;
})


function $(name) {
  return document.getElementById(name)
}

function setstatus(text) {
  $("midiStatus").innerText = text
}

function setInput(input) {
  if (delugeIn == input) {
    return;
  }
  if (delugeIn != null) {
    delugeIn.removeEventListener("midimessage", handleData);
  }
  delugeIn = input;
  if (input != null) {
    input.addEventListener("midimessage", handleData);
  }
}

function populateDevices() {
  for (const entry of midi.inputs) {
    const port = entry[1];
    const opt = new Option(port.name, port.id);
    $("chooseIn").appendChild(opt);
    if (port.name.includes("Deluge MIDI 3")) {
      opt.selected = true;
      setInput(port);
    }
  }
  for (const entry of midi.outputs) {
    const port = entry[1];
    const opt = new Option(port.name, port.id);
    $("chooseOut").appendChild(opt);
    if (port.name.includes("Deluge MIDI 3")) {
      opt.selected = true;
      delugeOut = port;
    }
  }
}

function onChangeIn(ev) {
  const id = ev.target.value;
  setInput(midi.inputs.get(id))
}

function onChangeOut(ev) {
  const id = ev.target.value;
  console.log("choose the id:" + id)
  delugeOut = midi.outputs.get(id) || null;
  console.log("choose the port:" + delugeOut)
}

function onStateChange(ev) {
  const port = ev.port;
  const delet = (port.state == "disconnected");
  if (port.type == "input") {
    let found = false;
    let children = $("chooseIn").childNodes;
    for (let i=0; i < children.length; i++) {
      if (children[i].value == port.id) {
        found = true;
        if (delet) {
          children[i].remove();
          if (port == delugeIn) {
            $("noneInput").selected = true;
            // or maybe not, if id: are preserved during a disconnect/connect cycle
            setInput(null);
          }
          break;
        }
      }
    }
    if (!found && !delet) {
      const opt = new Option(port.name, port.id);
      $("chooseIn").appendChild(opt);
    }
  } else {
    let found = false;
    let children = $("chooseOut").childNodes;
    for (let i=0; i < children.length; i++) {
      if (children[i].value == port.id) {
        found = true;
        if (delet) {
          children[i].remove();
          if (port == delugeOut) {
            $("noneOutput").selected = true;
            // or maybe not, if id: are preserved during a disconnect/connect cycle
            delugeOut = null;
          }
          break;
        }
      }
    }
    if (!found && !delet) {
      const opt = new Option(port.name, port.id);
      $("chooseOut").appendChild(opt);
    }
  }
}

function onMIDISuccess(midiAccess) {
  setstatus("webmidi ready");
  midi = midiAccess; // store in the global (in real usage, would probably keep in an object instance)
  populateDevices()
  midi.addEventListener("statechange", onStateChange)
  
  // TODO: on statechange
}

function onMIDIFailure(msg) {
  setstatus(`Failed to get MIDI access :( - ${msg}`);
}

window.addEventListener('load', function() {
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({ sysex: true }).then( onMIDISuccess, onMIDIFailure );
  } else {
    setstatus("webmidi unavail, check browser permissions");
  }

  $("pingButton").addEventListener("click", pingTest)
  $("getOledButton").addEventListener("click", getOled)
  $("intervalButton").addEventListener("click", setRefresh)
  $("testDecodeButton").addEventListener("click", () => decode(testdata))

  $("chooseIn").addEventListener("change", onChangeIn)
  $("chooseOut").addEventListener("change", onChangeOut)
  return;
});


function pingTest() {
    delugeOut.send([0xf0, 0x7d, 0x00, 0xf7]);
}

function oldCodes() {
   for (const entry of midi.inputs) {
    const input = entry[1];
    console.log(
      `Input port [type:'${input.type}']` +
        ` id:'${input.id}'` +
        ` manufacturer:'${input.manufacturer}'` +
        ` name:'${input.name}'` +
        ` version:'${input.version}'`,
    );
  }

  for (const entry of midi.outputs) {
    const output = entry[1];
    console.log(
      `Output port [type:'${output.type}'] id:'${output.id}' manufacturer:'${output.manufacturer}' name:'${output.name}' version:'${output.version}'`,
    );
  }
}

function getOled() {
    delugeOut.send([0xf0, 0x7d, 0x02, 0x00, 0x01, 0xf7]);
}

function setRefresh() {
  if (theInterval != null) {
    clearInterval(theInterval)
    theInterval = null;
  }

  let value = parseInt($("msInput").value);

  if (value > 0) {
    theInterval = setInterval(getOled, value);
  }
}

let lastmsg

/** @param {MIDIMessageEvent} msg */
function handleData(msg) {
  lastmsg = msg
  console.log(msg.data);
  setstatus("got some data.");
  if (msg.data.length > 8) {
    $("dataLog").innerText = "size: " + msg.data.length
  }
  decode(msg.data)
}

/** @param {Uint8Array} data */
function decode(data) {
  if (data.length < 3 || data[0] != 0xf0 || data[1] != 0x7d) {
    console.log("foreign sysex?")
    return;
  }

  if (data.length >= 5 && data[2] == 0x02 && data[3] == 0x40) {
    console.log("found OLED!")

    if (data[4] != 1) {
      console.log("DO NOT DO THAT")
      return;
    }

    let packed = data.subarray(6,data.length-1)
    console.log("packed size "+ packed.length);

    let unpacked = lib.wrap_array(lib.fn.unpack_7to8_rle, packed)
    console.log("unpacked size "+ unpacked.length);

    /** @type {CanvasRenderingContext2D} */
    let ctx = $("myCanvas").getContext("2d")

    let px_height = 5;
    let px_width = 5;
    let indist = 0.5;
    let offx = 20;
    let offy = 10;

    let blk_width = 128;
    ctx.fillStyle = "#111111";
    ctx.fillRect(offx,offy,px_width*128,px_height*48)

    ctx.fillStyle = "#eeeeee";
    for (let blk = 0; blk < 6; blk++) {
      for (let rstride = 0; rstride < 8; rstride++) {
        let mask = 1 << (rstride);
        for (let j = 0; j < blk_width; j++) {
          if ((blk*blk_width+j) > unpacked.lenght) {
            break;
          }
          let idata = (unpacked[blk*blk_width+j] & mask);

          let y = blk*8 + rstride;

          if (idata > 0) {
            ctx.fillRect(offx+j*px_width+indist,offy+y*px_height+indist, px_width-2*indist, px_height-2*indist);
          }

        }
      }
    }
    return;
  }
}

let testdata = new Uint8Array([
    240, 125, 2, 64, 1, 0, 126, 127, 0, 102, 0, 66, 76, 71, 18, 44, 100, 0, 6, 8, 112, 36, 8, 6, 0, 126, 8, 16, 16, 32, 126, 0, 68, 2, 67, 126, 68, 2, 2, 0, 126, 70, 16, 67, 126, 126, 127, 0, 114, 0, 71, 64, 72, 0, 69, 124, 68, 108, 3, 124, 120, 68, 0, 67, 96, 69, 120, 70, 12, 69, 120, 57, 96, 0, 0, 112, 124, 27, 28, 124, 112, 0, 68, 0, 69, 124, 69, 76, 5, 124, 120, 48, 68, 0, 69, 124, 68, 12, 10, 28, 120, 112,
    68, 0, 20, 48, 120, 124, 108, 69, 76, 67, 0, 84, 0, 67, 96, 69, 120, 70, 12, 69, 120, 67, 96, 68, 0, 69, 124, 71, 76, 66, 12, 86, 0, 69, 124, 68, 12, 10, 28, 120, 112, 70, 0, 69, 124, 70, 108, 66, 12, 70, 0, 69, 124, 98, 0, 68, 7, 68, 6, 0, 7, 3, 70, 0, 68, 3, 70, 6, 68, 3, 12, 0, 4, 7, 3, 70, 1, 12, 3, 7, 4, 0, 68, 7, 28, 0, 1, 7, 6, 4, 68, 0, 68, 7, 68, 6, 4, 7, 3, 1,
    68, 0, 66, 2, 70, 6, 4, 7, 3, 1, 86, 0, 68, 3, 70, 6, 68, 3, 70, 0, 68, 7, 94, 0, 68, 7, 68, 6, 4, 7, 3, 1, 70, 0, 68, 7, 72, 6, 70, 0, 68, 7, 72, 6, 126, 98, 0, 247
]);

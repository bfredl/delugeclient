let midi = null;
let delugeIn = null;
let delugeOut = null;

function $(name) {
  return document.getElementById(name)
}

function setstatus(text) {
  $("midiStatus").innerText = text
}

function onMIDISuccess(midiAccess) {
  setstatus("webmidi ready");
  midi = midiAccess; // store in the global (in real usage, would probably keep in an object instance)
}

function onMIDIFailure(msg) {
  setstatus(`Failed to get MIDI access :( - ${msg}`);
}

window.addEventListener('load', function() {
  decode(testdata)
  return;

  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({ sysex: true }).then( onMIDISuccess, onMIDIFailure );
  } else {
    setstatus("webmidi unavail, check browser permissions");
  }

  $("connectButton").addEventListener("click", connect)
  $("getOledButton").addEventListener("click", getOled)
});

function connect() {
   for (const entry of midi.inputs) {
    const input = entry[1];
    console.log(
      `Input port [type:'${input.type}']` +
        ` id:'${input.id}'` +
        ` manufacturer:'${input.manufacturer}'` +
        ` name:'${input.name}'` +
        ` version:'${input.version}'`,
    );

     if (input.name.includes("Deluge MIDI 3")) {
       delugeIn = input;
     }
  }

  for (const entry of midi.outputs) {
    const output = entry[1];
    console.log(
      `Output port [type:'${output.type}'] id:'${output.id}' manufacturer:'${output.manufacturer}' name:'${output.name}' version:'${output.version}'`,
    );

     if (output.name.includes("Deluge MIDI 3")) {
       delugeOut = output;
     }
  }

  if (delugeIn != null && delugeOut != null) {
    setstatus("found deluge!");
    delugeIn.addEventListener("midimessage",  handleData);
    delugeOut.send([0xf0, 0x7d, 0x00, 0xf7]);
  } else {
    setstatus("no deluge.");
  }
}

function getOled() {
    delugeOut.send([0xf0, 0x7d, 0x02, 0x00, 0x01, 0xf7]);
}

let lastmsg

function handleData(msg) {
  lastmsg = msg
  console.log(msg.data);
  setstatus("found deluge! got some data.");
  if (msg.data.length > 8) {
    $("dataLog").innerText = "size: " + msg.data.length
  }
  decode(msg.data)
}

testdata = new Uint8Array ([
    240, 125, 2, 64, 1, 0, 126, 127, 0, 102, 0, 66, 76, 71, 18, 44, 100, 0, 6, 8, 112, 36, 8, 6, 0, 126, 8, 16, 16, 32, 126, 0, 68, 2, 67, 126, 68, 2, 2, 0, 126, 70, 16, 67, 126, 126, 127, 0, 114, 0, 71, 64, 72, 0, 69, 124, 68, 108, 3, 124, 120, 68, 0, 67, 96, 69, 120, 70, 12, 69, 120, 57, 96, 0, 0, 112, 124, 27, 28, 124, 112, 0, 68, 0, 69, 124, 69, 76, 5, 124, 120, 48, 68, 0, 69, 124, 68, 12, 10, 28, 120, 112,
    68, 0, 20, 48, 120, 124, 108, 69, 76, 67, 0, 84, 0, 67, 96, 69, 120, 70, 12, 69, 120, 67, 96, 68, 0, 69, 124, 71, 76, 66, 12, 86, 0, 69, 124, 68, 12, 10, 28, 120, 112, 70, 0, 69, 124, 70, 108, 66, 12, 70, 0, 69, 124, 98, 0, 68, 7, 68, 6, 0, 7, 3, 70, 0, 68, 3, 70, 6, 68, 3, 12, 0, 4, 7, 3, 70, 1, 12, 3, 7, 4, 0, 68, 7, 28, 0, 1, 7, 6, 4, 68, 0, 68, 7, 68, 6, 4, 7, 3, 1,
    68, 0, 66, 2, 70, 6, 4, 7, 3, 1, 86, 0, 68, 3, 70, 6, 68, 3, 70, 0, 68, 7, 94, 0, 68, 7, 68, 6, 4, 7, 3, 1, 70, 0, 68, 7, 72, 6, 70, 0, 68, 7, 72, 6, 126, 98, 0, 247
]);

function decode(data) {
  if (data.length < 3 || data[0] != 0xf0 || data[1] != 0x7d) {
    console.log("foreign sysex?")
    return;
  }

  if (data.length >= 5 && data[2] == 0x02 && data[3] == 0x40) {
    console.log("found OLED!")

    if (data[4] != 1) {
      console.log("DO NOT DO THAT")
    }

    let packed = data.subarray(6,data.length-1)
    console.log("packed size "+ packed.length);

    return;
  }

}


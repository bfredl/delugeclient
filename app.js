let midi = null;
let delugeIn = null;
let delugeOut = null;
let statusmsg = null;

function setstatus(text) {
  statusmsg.innerText = text
}

function onMIDISuccess(midiAccess) {
  setstatus("webmidi ready");
  midi = midiAccess; // store in the global (in real usage, would probably keep in an object instance)
}

function onMIDIFailure(msg) {
  setstatus(`Failed to get MIDI access :( - ${msg}`);
}

window.addEventListener('load', function() { 
  statusmsg = document.getElementById("midiStatus")
  var navigator = window.navigator;
  if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess({ sysex: true }).then( onMIDISuccess, onMIDIFailure );
  } else {
    setstatus("webmidi unavail, check browser permissions");
  }
});

function dobuton() {
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
    delugeIn.onmidimessage = handleData;
    delugeOut.send([0xf0, 0x7d, 0x00, 0xf7]);
  } else {
    setstatus("no deluge.");
  }
}

function handleData(msg) {
  console.log(msg.data);
  setstatus("found deluge! got some data.");
}


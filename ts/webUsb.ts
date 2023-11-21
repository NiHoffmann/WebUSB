import * as dapjs from 'dapjs';

let dropEl = document.getElementById("drop");
let fileEl = document.getElementById("file");
let selectEl = document.getElementById("select");
let buttonEl = document.getElementById("button");
let labelEl = document.getElementById("label");
let statusEl = document.getElementById("status");
let transferEl = document.getElementById("transfer");
let barEl = document.getElementById("bar");

let buffer: any = null;

const setStatus = (state: string) => {
    labelEl!.textContent = state;
}

const setTransfer = (progress?: number) => {
    if (!progress) {
        statusEl!.style.visibility = "hidden";
        return;
    }
    selectEl!.style.visibility = "hidden";
    statusEl!.style.visibility = "visible";
    barEl!.style.width = `${progress * 100}%`;
    transferEl!.textContent = `${Math.ceil(progress * 100)}%`;
}

// Load a firmware image
const setImage = (file: any) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = evt => {
        buffer = evt.target!.result;
        setStatus(`Firmware image: ${file.name}`);
        selectEl!.style.visibility = "visible";
    }
    reader.readAsArrayBuffer(file);
}

// Choose a device
const selectDevice = async () => {
    setStatus("Selecting device...");
    setTransfer();

    try {
        const device = await navigator.usb.requestDevice({
            filters: [{vendorId: 0xD28}]
        });
        await update(device);
    } catch (error) {
        statusEl!.style.visibility = "hidden";
        setStatus(<string>error);
    }
}

// Update a device with the firmware image
const update = async (device: USBDevice) => {
    if (!buffer) return;

    const transport = new dapjs.WebUSB(device);
    const target = new dapjs.DAPLink(transport);

    target.on(dapjs.DAPLink.EVENT_PROGRESS, (progress: any) => {
        setTransfer(progress);
    });

    try {
        // Push binary to board
        setStatus(`Flashing binary file ${buffer.byteLength} words long...`);
        await target.connect();
        await target.flash(buffer);

        setStatus("Disconnecting...");
        await target.disconnect();

        setStatus("Flash complete!");
        setTransfer();
        (<HTMLInputElement>fileEl!).value = "";
    } catch (error) {
        statusEl!.style.visibility = "hidden";
        setStatus(<string>error);
    }
}

fileEl!.addEventListener("change", event => {
    setImage((<HTMLInputElement>event.target).files![0]);
});

dropEl!.addEventListener("drop", event => {
    setImage(event.dataTransfer!.files[0]);
});

buttonEl!.addEventListener("click", selectDevice);

["drag", "dragstart", "dragend", "dragover", "dragenter", "dragleave", "drop"].forEach(eventName => {
    dropEl!.addEventListener(eventName, event => {
        event.preventDefault();
        event.stopPropagation();
    });
});

["dragover", "dragenter"].forEach(eventName => {
    dropEl!.addEventListener(eventName, event => {
        dropEl!.classList.add("hover");
    });
});

["dragleave", "dragend", "drop"].forEach(eventName => {
    dropEl!.addEventListener(eventName, event => {
        dropEl!.classList.remove("hover");
    });
});

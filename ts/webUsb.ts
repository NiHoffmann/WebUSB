import * as dapjs from 'dapjs';
import { compile as mpyCrossCompileV6, CompileResult } from '@pybricks/mpy-cross-v6';

//const mpyCrossCompileV6 = require('@pybricks/mpy-cross-v6')

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

enum  DEVICE_TYPES {
    USB_FLASH = 0,
    USB = 1,
    BLE = 2
}

/** Pybricks service UUID. */
export const pybricksServiceUUID = 'c5f50001-8280-46da-89f4-6d8051e4aeef';
/** Pybricks control/event characteristic UUID. */
export const pybricksControlEventCharacteristicUUID =
    'c5f50002-8280-46da-89f4-6d8051e4aeef';
/** Pybricks hub capabilities characteristic UUID. */
export const pybricksHubCapabilitiesCharacteristicUUID =
    'c5f50003-8280-46da-89f4-6d8051e4aeef';

/** Device Information service UUID. */
export const deviceInformationServiceUUID = 0x180a;

/** nRF UART Service UUID. */
export const nordicUartServiceUUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';

//this can be changed by a drop down menu later on
let mode = DEVICE_TYPES.BLE;
// Choose a device
const selectDevice = async () => {
    setStatus("Selecting device...");
    setTransfer();

    let device : USBDevice | BluetoothDevice;
    try {
        switch (mode) {
            case DEVICE_TYPES.USB_FLASH:
                device = await navigator.usb.requestDevice({
                    filters: []
                });
                await flash_firmware(device);
                break;
            case DEVICE_TYPES.BLE:
                device = await navigator.bluetooth.requestDevice(({
                    filters: [{ services: [pybricksServiceUUID] }],
                    optionalServices: [
                        pybricksServiceUUID,
                        deviceInformationServiceUUID,
                        nordicUartServiceUUID,
                    ]
                }));

                console.log(new TextDecoder().decode(buffer))
                await compile(new TextDecoder().decode(buffer)).then(program =>
                    download_user_program_ble(<BluetoothDevice>device,program)
                );
                break;

            case DEVICE_TYPES.USB:
                break;
        }

    } catch (error) {
        statusEl!.style.visibility = "hidden";
        setStatus(<string>error);
    }
}


// Update a device with the firmware image
const flash_firmware = async (device: USBDevice ) => {
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


const maxWriteSize = 23;
const maxProgramSize = 100;

enum SERVICE_UUIDS {
    PYBRICKS_SERVICE_UUID = 'c5f50001-8280-46da-89f4-6d8051e4aeef',
    PYBRICKS_COMMAND_EVENT_UUID = 'c5f50002-8280-46da-89f4-6d8051e4aeef'
}

enum COMMANDS {
    STOP_USER_PROGRAM = 0,
    START_USER_PROGRAM = 1,
    START_REPL = 2,
    WRITE_USER_PROGRAM_META = 3,
    COMMAND_WRITE_USER_RAM = 4,
    PBIO_PYBRICKS_COMMAND_REBOOT_TO_UPDATE_MODE = 5,
    WRITE_STDIN = 6
}

const download_user_program_ble = async (device: BluetoothDevice, program : Blob) => {
    await write_gatt(device,SERVICE_UUIDS.PYBRICKS_COMMAND_EVENT_UUID , new Uint8Array([COMMANDS.STOP_USER_PROGRAM]));
    //if file format == MultiMpy6
    const payload_size =  maxWriteSize - 5;

    //invalidate old programm data
    await write_gatt(
        device,
        SERVICE_UUIDS.PYBRICKS_COMMAND_EVENT_UUID,
        createWriteUserProgramMetaCommand(0)
    );

    const chunkSize = program.size / payload_size;

    for (let i = 0; i < program.size; i += chunkSize) {
        const data = await program.slice(i, i + chunkSize).arrayBuffer()
        await write_gatt(
            device,
            SERVICE_UUIDS.PYBRICKS_COMMAND_EVENT_UUID,
            createWriteUserRamCommand(i, data)
        );
    }


    await write_gatt(
        device,
        SERVICE_UUIDS.PYBRICKS_COMMAND_EVENT_UUID,
        createWriteUserProgramMetaCommand(program.size)
    );

    await write_gatt(device, SERVICE_UUIDS.PYBRICKS_COMMAND_EVENT_UUID, new Uint8Array([COMMANDS.START_USER_PROGRAM]));
};

const write_gatt = async (device: BluetoothDevice, service_uuid: SERVICE_UUIDS, data_or_command: BufferSource) => {

    let server: BluetoothRemoteGATTServer;
    let service: BluetoothRemoteGATTService;
    let characteristic: BluetoothRemoteGATTCharacteristic;

    await device.gatt?.connect().then(async value => {
        server = value;
        await server.getPrimaryService(SERVICE_UUIDS.PYBRICKS_SERVICE_UUID).then(async value => {
            service = value;
            await service.getCharacteristic(service_uuid).then(async value => {
                characteristic = value;
                await characteristic.writeValueWithResponse(data_or_command);
            }).catch(
                reason => console.log(reason)
            );
        }).catch(
            reason => console.log(reason)
        );
    }).catch(
        reason => console.log(reason)
    );
};

function encodeUInt32LE(value: number): ArrayBuffer {
    const buf = new ArrayBuffer(4);
    const view = new DataView(buf);
    view.setUint32(0, value, true);
    return buf;
}

function cString(str: string): Uint8Array {
    return new TextEncoder().encode(str + '\x00');
}

async function compile(file : string) {
    const blob: BlobPart[] = [];

    await mpyCrossCompileV6(
        '__main__.py',
        file,
        undefined,
        new URL(
            '@pybricks/mpy-cross-v6/build/mpy-cross-v6.wasm',
            //import.meta.url,
        ).toString(),
    ).then(result => {
            // each file is encoded as the size, module name, and mpy binary
            // @ts-ignore
            blob.push(encodeUInt32LE(result.mpy.length));
            blob.push(cString('__main__'));
            // @ts-ignore
            blob.push(result.mpy);
        }
    )
    return new Blob(blob);
}

export function createWriteUserRamCommand(
    offset: number,
    payload: ArrayBuffer,
): Uint8Array {
    const msg = new Uint8Array(5 + payload.byteLength);
    const view = new DataView(msg.buffer);
    view.setUint8(0, COMMANDS.COMMAND_WRITE_USER_RAM);
    view.setUint32(1, offset, true);
    msg.set(new Uint8Array(payload), 5);
    return msg;
}

export function createWriteUserProgramMetaCommand(size: number): Uint8Array {
    const msg = new Uint8Array(5);
    const view = new DataView(msg.buffer);
    view.setUint8(0, COMMANDS.WRITE_USER_PROGRAM_META);
    view.setUint32(1, size, true);
    return msg;
}



'use strict';
const fs = require('fs');
const threads = require('worker_threads');
const { Worker, isMainThread } = threads;

class CountingSemaphore {
    constructor(shared, offset = 0, initial){
        this.counter = new Int32Array(shared, offset, 1);
        if(typeof  initial === 'number'){
            Atomics.store(this.counter, 0, initial);
        }
    }

    enter(callback){
        Atomics.wait(this.counter, 0, 0);
        Atomics.sub(this.counter,0,1);
        setTimeout(callback, 0);
    }

    leave(){
        Atomics.add(this.counter, 0, 1);
        Atomics.notify(this.counter, 0, 1);
    }
}

if(isMainThread){
    const buffer = new SharedArrayBuffer(4);
    const semaphore = new CountingSemaphore(buffer,0,10);
    for(let i = 0; i < 20; i++){
        new Worker(__filename, { workerData: buffer});
    }
}else{
    const { threadId, workerData } = threads;
    const semaphore = new CountingSemaphore(workerData);
    console.log({ threadId, semaphore: semaphore.counter[0]});
    const file = `file-${threadId}.dat`;
    const REPEAT_COUNT = 1000000;
    semaphore.enter(() =>{
        const data = `Data from file-${threadId}.dat `.repeat(REPEAT_COUNT);
        fs.writeFile(file, data, () => {
            fs.unlink(file, () =>{
                semaphore.leave();
            })
        })
    })
}


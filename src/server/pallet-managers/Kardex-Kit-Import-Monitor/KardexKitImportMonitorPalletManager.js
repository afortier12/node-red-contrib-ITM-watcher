const  { PalletManager } = require('../PalletManager');
const isNull  = require('util');
const fs = require('fs');
const chokidar = require('chokidar');


class KardexKitImportMonitorPalletManager extends PalletManager {

    constructor(RED, palletConfig, node){
        super(RED, palletConfig, node);

        this._self.config = palletConfig;
        this._self.palletType = 'Kardex kit import monitor';

        this.onInput = this.onInput.bind(this._self);

    }

    onInput(msg){

        const { path, action } = msg.payload;
        var errorMsg = "";
        var errorCode = 0;      


        const startListening = (path, action, timeout) => 
            new Promise((resolve, reject)=>{
                const watcher = chokidar.watch(path, {
                    persistent: true,
                    depth: 0,
                    ignoreInitial: true,
                    awaitWriteFinish:true,
                    usePolling:true,
                    alwaysStat: true,
                    useFsEvents : true,
                    binaryInterval: 1000
                  }); 

                  var id = this.id;
    
                watcher.on('unlink',(filename) => {
                    id++;
                    this._processSuccess(action + " processed; "+ filename + " deleted");
                    msg.topic = "import_status";
                    let import_status = {"id": id, "type": 2, "message":action + " processed; "+ filename + " deleted"};
                    msg.import_status = import_status;
                    this.send([null,msg,null]);
                    watcher.close();
                    resolve('');
                })
    
                watcher.on('ready', () => {
                    this._processWaiting("Waiting for: " + action)
                    msg.topic = "import_status";
                    let import_status = {"id": id, "type": 1, "message":"Waiting for: " + action + "..."};
                    msg.import_status = import_status;
                    this.send([null,msg,null]);
                    setTimeout(() => {
                        id++;
                        msg.topic = "import_status";
                        let import_status = {"id": id, "type": 3, "message":"Error: " + action + " failed!"};
                        msg.import_status = import_status;
                        watcher.close();
                        reject(Error(err))
                    }, timeout)
                  }).on('error', () => {
                    id++;
                    msg.topic = "import_status";
                    let import_status = {"id": id, "type": 3, "message":"Error: " + action + " failed!"};
                    msg.import_status = import_status;
                    watcher.close();
                    reject(Error(err))
                  })
            }).catch(error => {
                throw error;
            });

        
        (async() => {

            try {
				var fo = fs.openSync(path, 'w');
				fs.closeSync(fo, 'w');
            
				if (fs.existsSync(path))
					await filewatcher(path, action, 60000);

            } catch (error) {
                this._processError(error);
                this.error(error);
                msg.payload = error;
                this.send([null,msg]);
            }
        })();


    }

}

module.exports = { KardexKitImportMonitorPalletManager };
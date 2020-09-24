const  { PalletManager } = require('../PalletManager');
const isNull  = require('util');


class KardexKitImportPalletManager extends PalletManager {

    constructor(RED, palletConfig, node){
        super(RED, palletConfig, node);

        this._self.config = palletConfig;
        this._self.palletType = 'Kardex kit import';

        this.onInput = this.onInput.bind(this._self);

    }
    

    onInput(msg){

        const { jobnumber, bom, bom_bins, kits, kit_bins } = msg.payload;
        var errorMsg = "";
        var errorCode = 0;          //0-no error, 1-message only, 2-kit number invalid, 3-job kit mismatch, 4- empty cells
        var kitJobNumber = "";
        var kitNumber = [];
        const { assert, Console } = require('console');
        

        const createBOMBinImportFile = async(data) =>{
            var fields = Object.keys(data[0]);
            var replacer = function(key, value) { 
                return value === null ? '' : value } 
            var csv = data.map(function(row){
            return fields.map(function(fieldName){
                return JSON.stringify(row[fieldName], replacer).replace(/\\"/g, '"');
            }).join(',')
            })

            csv.unshift(fields.join(',')) // add header column
            csv = csv.join('\r\n');

            
            let prefix = "Virtual_BIN_Import,001,01,"
            for (var di=0; di < data.length; di++){
                
            }

        };
    
        const createJobImportFile = async(data) =>{
            

        };

        const createKitImportFile = async(data) =>{

            var fields = Object.keys(data[0]);
            var replacer = function(key, value) { 
                return value === null ? '' : value } 
            var csv = data.map(function(row){
            return fields.map(function(fieldName){
                return JSON.stringify(row[fieldName], replacer).replace(/\\"/g, '"');
            }).join(',')
            })

            csv.unshift(fields.join(',')) // add header column
            csv = csv.join('\r\n');
            console.log(csv)

            
            let prefix = "Virtual_BIN_Import,001,01,"
            for (var di=0; di < data.length; di++){
                
            }

        };

        const createKitBinImportFile = async(data) =>{
            let prefix = "Virtual_BIN_Import,001,01,"
            for (var di=0; di < data.length; di++){
                
            }

        };


    
      
        
        (async() => {

            try {
                let job_import = await createBOMBinImportFile(bom_bins);
                if (kitNumberCheck === false){
                    if (errorCode === 2){
                        msg.topic = "Invalid Kit Number!";
                    } else {
                        msg.topic = "Job Number/Kit Mismatch!";
                    }
                    msg.errorCode = errorCode;
                    msg.payload = errorMsg;                
                    this.send([null,msg]);
                } else {
                    this.send([msg, null]);
                }
            } catch (error) {
                this._processError(error);
                this.error(error);
                msg.payload = errorMsg;
                this.send([null,msg]);
            }
        })();


    }

}

module.exports = { KardexKitImportPalletManager };
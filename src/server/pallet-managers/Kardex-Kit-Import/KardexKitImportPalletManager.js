const  { PalletManager } = require('../PalletManager');
const isNull  = require('util');
const fs = require('fs');


class KardexKitImportPalletManager extends PalletManager {

    constructor(RED, palletConfig, node){
        super(RED, palletConfig, node);

        this._self.config = palletConfig;
        this._self.palletType = 'Kardex kit import';

        this.onInput = this.onInput.bind(this._self);

    }
    

    onInput(msg){

        const { path, job_folder, bin_folder, kit_folder,
            jobnumber, bom, bom_bins, kits, kit_bins } = msg.payload;
        var errorMsg = "";
        var errorCode = 0;          //0-no error, 1-failed to create trigger file, 2-failed to wrtie csv file
        var kitJobNumber = "";
        var kitNumber = [];
        const { assert, Console } = require('console');
        

        const createBOMBinImportFile = async(data, path, folder, jobnumber) =>{
           
            var fields = Object.keys(data[0]);
            var replacer = function(key, value) { 
                return value === null ? '' : value } 
            var csv = data.map(function(row){
            return fields.map(function(fieldName){
                return JSON.stringify(row[fieldName], replacer).replace(/\\"/g, '"');
            }).join(',')
            });

            let prefix = "Virtual_BIN_Import,001,01";
            for (var i=0; i < csv.length; i++){
                let csv_line = csv[i].split(",");
                
                for (var j=0; j < csv_line.length; j++){
                    let isnum = /^\d+\.?\d*$/.test(csv_line[j]);
                    if (isnum) csv_line[j] = csv_line[j]*100;
                    else if (typeof csv_line[j] === 'string')
                            csv_line[j] = csv_line[j].replace(/"/g,'');
                }
                csv_line.unshift(prefix);
                csv[i] = csv_line.join(",");
            }

            csv = csv.join('\r\n');

            //let filepath =  path + "\\" + folder + "\\";
            let filepath = ".";
            let filename = filepath + "\\" + jobnumber.toString() + "_bin.csv";
            
            try{
                fs.writeFileSync(filename, csv);
            } catch (err) {
                errorCode = 2;
                errorMsg = err;
                return false;
            }

            //create trigger file
            filename = filepath + "\\trigger_bin.txt";

            try {
                var fo = fs.openSync(filename, 'w');
                fs.closeSync(fo, 'w');
            } catch (err) {
                errorCode = 1;
                errorMsg = err;
                return false;
            }   
            
            return true;
        };
    
        const createJobImportFile = async(data, path, folder, jobnumber) =>{
            var fields = Object.keys(data[0]);
            var replacer = function(key, value) { 
                return value === null ? '' : value } 
            var csv = data.map(function(row){
            return fields.map(function(fieldName){
                return JSON.stringify(row[fieldName], replacer).replace(/\\"/g, '"');
            }).join(',')
            });

            csv = csv.join('\r\n');

            //let filepath =  path + "\\" + folder + "\\";
            let filepath = ".";
            let filename = filepath + "\\" + jobnumber.toString() + ".csv";
            
            try{
                fs.writeFileSync(filename, csv);
            } catch (err) {
                errorCode = 2;
                errorMsg = err;
                return false;
            }

            //create trigger file
            filename = filepath + "\\trigger.txt";

            try {
                var fo = fs.openSync(filename, 'w');
                fs.closeSync(fo, 'w');
            } catch (err) {
                errorCode = 1;
                errorMsg = err;
                return false;
            }   
            
            return true;

        };

        const createKitImportFile = async(data, path, folder, jobnumber, kit_bins) =>{

            //let filepath =  path + "\\" + folder + "\\";
            let filepath = ".";
            let filename = '';

            for (var idx=0; idx < data.length; idx++){

                let bom = data[idx].bom;
                var fields = Object.keys(bom[0]);
                var replacer = function(key, value) { 
                    return value === null ? '' : value } 
                var csv = bom.map(function(row){
                return fields.map(function(fieldName){
                    return JSON.stringify(row[fieldName], replacer).replace(/\\"/g, '"');
                }).join(',')
                });

                for (var i=0; i < csv.length; i++){
                    let csv_line = csv[i].split(",");

                    for (var j=0; j < csv_line.length; j++)
                        if (typeof csv_line[j] === 'string')
                            csv_line[j] = csv_line[j].replace(/"/g,'');
                    
                    let isnum = /^\d+\.?\d*$/.test(csv_line[0]);
                    if (isnum){
                        let line_num = i.toString();
                        let material = csv_line[2] + "(DET#" + csv_line[0] + ")";
                        let kit_name = await getKitDescription(kit_bins, jobnumber, data[idx].kit);
                        let qty = csv_line[4];
                        let command = "Default";

                        let temp = [line_num, material, kit_name, qty, command];
                        csv[i] = temp.join(",");
                    }
                }
                csv = csv.join('\r\n');

                filename = filepath + "\\" + jobnumber.toString() + "_" + data[idx].kit + ".csv";
                try{
                    fs.writeFileSync(filename, csv);
                } catch (err) {
                    errorCode = 2;
                    errorMsg = err;
                    return false;
                }
            }

            //create trigger file
            filename = filepath + "\\trigger.txt";

            try {
                var fo = fs.openSync(filename, 'w');
                fs.closeSync(fo, 'w');
            } catch (err) {
                errorCode = 1;
                errorMsg = err;
                return false;
            }  
            
            return true;

        };

        const createKitBinImportFile = async(data) =>{
            
            //let filepath =  path + "\\" + folder + "\\";
            let filepath = ".";
            let filename = '';

            var fields = Object.keys(data[0]);
            var replacer = function(key, value) { 
                return value === null ? '' : value } 
            var csv = data.map(function(row){
            return fields.map(function(fieldName){
                return JSON.stringify(row[fieldName], replacer).replace(/\\"/g, '"');
            }).join(',')
            });

            let prefix = "Virtual_BIN_Import,001,01";
            for (var i=0; i < csv.length; i++){
                let csv_line = csv[i].split(",");
                
                for (var j=0; j < csv_line.length; j++){
                    let isnum = /^\d+\.?\d*$/.test(csv_line[j]);
                    if (isnum) csv_line[j] = csv_line[j]*100;
                    else if (typeof csv_line[j] === 'string')
                            csv_line[j] = csv_line[j].replace(/"/g,'');
                }
                csv_line.unshift(prefix);
                csv[i] = csv_line.join(",");
            }

            csv = csv.join('\r\n');

            filename = filepath + "\\" + jobnumber.toString() + + "_kit_bins.csv";           
            try{
                fs.writeFileSync(filename, csv);
            } catch (err) {
                errorCode = 2;
                errorMsg = err;
                return false;
            }

            //create trigger file
            filename = filepath + "\\trigger_bin.txt";

            try {
                var fo = fs.openSync(filename, 'w');
                fs.closeSync(fo, 'w');
            } catch (err) {
                errorCode = 1;
                errorMsg = err;
                return false;
            }   
            
            return true;

        };


        const getKitDescription = async(data, jobnumber, kit) =>{
      
            for (var i=0; i < data.length; i++){
                if (data[i].kit === kit){
                    return jobnumber.toString() +"_"+ kit + "(" + data[i].description +")";
                }
            }
            return kit;

        };
        
        (async() => {

            try {
                let bom_bin_import = await createBOMBinImportFile(bom_bins, path, bin_folder, jobnumber);
                if (bom_bin_import === false){
                    msg.topic = "Bin import file creation error!";
                    msg.errorCode = errorCode;
                    msg.payload = errorMsg;                
                    this.send([null,msg]);
                } else {
                    let job_import = await createJobImportFile(bom, path, job_folder, jobnumber)
                    if (job_import === false){
                        msg.topic = "Job import file creation error!";
                        msg.errorCode = errorCode;
                        msg.payload = errorMsg;                
                        this.send([null,msg]);
                    } else {
                        let kit_bom_import = await createKitImportFile(kits, path, kit_folder, jobnumber, kit_bins)
                        if (kit_bom_import === false){
                            msg.topic = "Kit import file creation error!";
                            msg.errorCode = errorCode;
                            msg.payload = errorMsg;                
                            this.send([null,msg]);
                        } else {
                            let kit_bin_import = await createKitBinImportFile(kit_bins, path, bin_folder, jobnumber)
                            if (kit_bin_import === false){
                                msg.topic = "Kit bin import file creation error!";
                                msg.errorCode = errorCode;
                                msg.payload = errorMsg;                
                                this.send([null,msg]);
                            } else {
                                var newMsg = {};
                                this._extendMsgPayload(newMsg, {});
                                this.send([msg, null]);
                            }
                        }
                    }
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
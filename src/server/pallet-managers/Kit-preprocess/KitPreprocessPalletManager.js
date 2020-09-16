const  { PalletManager } = require('../PalletManager');
const { isNull } = require('util');

class KitPreprocessPalletManager extends PalletManager {

    constructor(RED, palletConfig, node){
        super(RED, palletConfig, node);

        this._self.config = palletConfig;
        this._self.palletType = 'Kit pre-process';

        this.onInput = this.onInput.bind(this._self);

    }
    

    onInput(msg){

        const { jobnumber, bom, data } = msg.payload;
        var errorMsg = "";
        var errorCode = 0;          //0-no error, 1-message only, 2-kit number invalid, 3-job kit mismatch, 4- empty cells
        var kitJobNumber = "";
        var kitNumber = [];
        const { assert, Console } = require('console');
        
    
        const verifyKitNumber = async(data) =>{
            var tempKitNumber = "";
            var breakloop = false;
            data.forEach(function (file, idx, arr){
                if (breakloop) return;
                var filename = file.filename;
                var pos =  filename.lastIndexOf(".");
                if (pos > 0) {
                    var tempfilename = filename.substring(0, pos);
                    pos = tempfilename.indexOf(":");
                    if (pos > 0){
                        tempfilename = tempfilename.substring(pos + 1, tempfilename.length);
                        tempfilename = tempfilename.trim();
                    }
                    if (filename.lastIndexOf("-") > 0){
                        kitJobNumber = tempfilename.substring(0,tempfilename.lastIndexOf("-"));
                        tempKitNumber = tempfilename.substring(tempfilename.lastIndexOf("-") + 1, tempfilename.length);
                    } else if (filename.lastIndexOf("_") > 0){
                        kitJobNumber = tempfilename.substring(0,tempfilename.lastIndexOf("_"));
                        tempKitNumber = tempfilename.substring(tempfilename.lastIndexOf("_") + 1, tempfilename.length);
                    } else {
                        errorCode = 2;
                        errorMsg = "Invalid kit number " + filename + "! Must be of the form JOB#-K##";
                        breakloop = true;
                    }
                    
                    if (!isNaN(tempKitNumber)){
                        tempKitNumber = "K" + tempKitNumber;
                    }else if (!tempKitNumber.match(/(?:[Kk]+\d{2}?)/)){
                        errorCode = 2;
                        errorMsg = "Invalid kit number ${tempKitNumber}! Must be of the form K##";
                        breakloop = true;
                    }
                    if (kitJobNumber !== jobnumber){
                        errorCode = 3;
                        errorMsg = "Kit number " + kitJobNumber + " does not match job number " + jobnumber;
                        breakloop = true;
                    }

                } else {
                    errorCode = 1;
                    errorMsg = "Invalid filename: " + filename;
                    breakloop = true;
                }
                if (!breakloop){
                    kitNumber.push(tempKitNumber);
                }
            });
            return !breakloop;

        };
    
        const formatKitBOM = async(data) =>{

            let new_bom = [];
            var breakloop = false;


            data.forEach(function (strdata, idx, arr){
                if (breakloop || !((Object.prototype.toString.call(strdata.data) === '[object String]') && strdata.data.includes("\n"))) return;
                var kitdata = strdata.data.split("\n");
                var new_kit = {kit:"", bom:[]};
                new_kit.kit = kitNumber[idx];
                for (var ri = 0; ri < kitdata.length; ri++){
                    if ((Object.prototype.toString.call(kitdata[ri]) === '[object String]') && kitdata[ri].includes(",")){
                        var kit_item = [];
                        var kitrow = kitdata[ri].split(",");
                        for (var ci = 1; ci < kitrow.length; ci++){
                            if ((ci < 6) && (kitrow[ci] === null || typeof kitrow[ci] === 'undefined' ||kitrow[ci].toString().length === 0)){
                                v
                            } else {
                                let str = kitrow[ci].toString();
                                //remove quotation marks
                                str = str.replace("\"", "");
                                //remove commas (delimiter for Kardex import)
                                //str = str.replace(",", "");

                                if(ci === 3){
                                    //replace characters that cause import issues
                                    if (str.includes("Ø")){
                                        str = str.replace(/Ø/gi, ""); //diameter symbol 
                                    }
                                    if (str.includes(" X ")){
                                        str = str.replace(" X ", " x ");
                                    }
                                    if (str.includes("dia") || str.includes("DIA") ||str.includes("Dia")){
                                        str = str.replace(/dia/gi, "");
                                    }
                                }

                                //check if any text is greater than 35 chars
                                if (str.length > 35){
                                    str = str.substring(0, 35);
                                }
                                kit_item.push(str);
                            }
                        }
                    }
                    if (kit_item.length > 0 ){
                        new_kit.bom.push(kit_item);
                    }
                }
                if (new_kit.bom.length > 0){
                    new_bom.push(new_kit);
                }
            });
            if (breakloop) return null;
            else return new_bom;
        };


        const checkBOMAgainstKit = async(bom, data) =>{
            let new_bom_line = [];
            let new_bom = [];
            let kit_number = "";
            
            bom.forEach(function (item, idx, arr){
                let bom_det = item[1];
                let bom_qty = item[5];
                let item_found = false;
                let kit_total_qty = 0;
                let bom_split1 = item.slice(0,4);
                let bom_split2 = item.slice(6);

                let isnum = /^\d+$/.test(bom_qty);

                if (isnum){
                    for (idx = 0; idx < data.length; idx++){
                        let kit_item_found = false;
                        let kit_qty = 0;
                        
                        kit_number = data[idx].kit;
                        let kit_bom = data[idx].bom;
                        for (let kidx=0; kidx < kit_bom.length; kidx++){
                            var kit_item = kit_bom[kidx];
                            var kit_det = kit_item[0];
                            isnum = /^\d+$/.test(kit_item[0]);
                            if (isnum){
                                if (kit_det==bom_det && !kit_item_found){
                                    kit_item_found = true;
                                    item_found = true;
                                    kit_qty = kit_item[4];
                                    isnum = /^\d+$/.test(kit_qty);
                                    if (isnum){
                                        kit_total_qty = kit_total_qty + parseInt(kit_qty);
                                    } else {
                                        errorCode = 7;
                                        errorMsg = "Kit item has and invalid quantity value: DET#" + kit_det + ", quantity=" + kit_qty +"!";
                                    }
                                }
                            }
                        }
                        if (kit_item_found){
                            new_bom_line = bom_split1.concat([kit_qty])
                            new_bom_line = new_bom_line.concat([kit_number])
                            new_bom_line = new_bom_line.concat(bom_split2);
                            new_bom.push(new_bom_line);
                            new_bom_line = [];
                        }
                    }
                    if (parseInt(bom_qty) < kit_total_qty && item_found){
                        errorCode = 5;
                        errorMsg = "Kit required quantity (" + kit_total_qty.toString() + ") is higher than BOM quantity ("+ bom_qty.toString() + ")!";
                    } else if (parseInt(bom_qty) > kit_total_qty && item_found){
                        new_bom_line = bom_split1.concat([kit_qty])
                        new_bom_line = new_bom_line.concat(["None"])
                        new_bom_line = new_bom_line.concat(bom_split2);
                        new_bom.push(new_bom_line);
                        new_bom_line = [];
                    }
                } 

            });
            return new_bom;
        };
       
        
        (async() => {

            try {
                let kitNumberCheck = await verifyKitNumber(data);
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
                    let new_data = await formatKitBOM(data);
                    if (new_data === null || typeof new_data === 'undefined'){
                        if (errorCode === 4){
                            msg.topic = "Empty Cells!";
                        } else {
                            msg.topic = "Error!";
                        }
                        msg.errorCode = errorCode;
                        msg.payload = errorMsg;                
                        this.send([null,msg]);
                    } else {
                        let new_bom = await checkBOMAgainstKit(bom, new_data);
                        if (new_bom === null || typeof new_bom === 'undefined'){
                            if (errorCode === 5){
                                msg.topic = "Kit item not found in BOM!";
                            } else {
                                msg.topic = "Error!";
                            }
                            msg.errorCode = errorCode;
                            msg.payload = errorMsg;                
                            this.send([null,msg]);
                        } else {
                            var newMsg = {};
                            this._extendMsgPayload(newMsg, { "jobnumber":jobnumber, "bom": new_bom, "data":new_data });
                            this.send([newMsg, null]);
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

module.exports = { KitPreprocessPalletManager };
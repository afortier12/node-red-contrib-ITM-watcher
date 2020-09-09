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

        const { jobnumber, data } = msg.payload;
        var errorMsg = "";
        var errorCode = 0;          //0-no error, 1-message only, 2-kit number invalid, 3-job kit mismatch, 4- empty cells
        var kitJobNumber = "";
        var kitNumber = "";
        const { assert, Console } = require('console');
        
    
        const verifyKitNumber = async(data) =>{
            
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
                        kitNumber = tempfilename.substring(tempfilename.lastIndexOf("-") + 1, tempfilename.length);
                    } else if (filename.lastIndexOf("_") > 0){
                        kitJobNumber = tempfilename.substring(0,tempfilename.lastIndexOf("-"));
                        kitNumber = tempfilename.substring(tempfilename.lastIndexOf("-") + 1, tempfilename.length);
                    } else {
                        errorCode = 2;
                        errorMsg = "Invalid kit number " + filename + "! Must be of the form JOB#-K##";
                        breakloop = true;
                    }
                    
                    if (!isNaN(kitNumber)){
                        kitNumber = "K" + kitNumber;
                    }else if (!kitNumber.match(/(?:[Kk]+\d{2}?)/)){
                        errorCode = 2;
                        errorMsg = "Invalid kit number ${kitNumber}! Must be of the form K##";
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
            });
            return !breakloop;

        };
    
        const formatKitBOM = async(data) =>{

            let rowarray = [];
            let new_bom =[];
            var breakloop = false;
            data.forEach(function (strdata, idx, arr){
                if (breakloop || !((Object.prototype.toString.call(strdata.data) === '[object String]') && strdata.data.includes("\n"))) return;
                var kitdata = strdata.data.split("\n");
                for (var ri = 0; ri < kitdata.length; ri++){
                    if ((Object.prototype.toString.call(kitdata[ri]) === '[object String]') && kitdata[ri].includes(",")){
                        var kitrow = kitdata[ri].split(",");
                        for (var ci = 1; ci < kitrow.length; ci++){
                            if ((ci < 6) && (kitrow[ci] === null || typeof kitrow[ci] === 'undefined' ||kitrow[ci].toString().length === 0)){
                                errorCode = 4;
                                errorMsg = "Empty cell found at row " + ri.toString() + ", column "+ ci.toString();
                                breakloop = true;
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
                                rowarray.push(str);
                            }
                        }
                    }
                    if (rowarray.length > 0 ){
                        new_bom.push(rowarray);
                    }
                    rowarray = [];
                }
                if (breakloop) return null;
                else return new_bom;
            });
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
                    msg.errorCode = errorcode;
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
                    } else {
                        var newMsg = {};
                        this._extendMsgPayload(newMsg, { "jobnumber":jobnumber, "data":new_data });
                        this.send([newMsg, null]);
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
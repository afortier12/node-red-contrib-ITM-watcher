const  { PalletManager } = require('../PalletManager');
const { isNull } = require('util');

class BOMPreprocessPalletManager extends PalletManager {

    constructor(RED, palletConfig, node){
        super(RED, palletConfig, node);

        this._self.config = palletConfig;
        this._self.palletType = 'BOM pre-process';
        this.last_column = 10;

        this.onInput = this.onInput.bind(this._self);

    }
    

    onInput(msg){

        const {sheetname, file, bom } = msg.payload;
        var errorMsg = "";
        var errorCode = 0;          //0-no error, 1-message only, 2-job number prompt
        const { assert, Console } = require('console');
        
    
        const getJobNumber = async(file) =>{
            var jobNumber = "";
            var pos =  file.lastIndexOf("\\");
            if (pos > 0) {
                var filename = file.slice(pos+1, file.length);
            } else {
               var filename = file;
            }

            if (isNaN(filename.slice(0,1))){
                jobNumber = filename.slice(0,5);
                if (isNaN(jobNumber.substring(1, 5))){
                    errorCode = 2;
                    errorMsg = "Invalid job number! Must be 4-5 digits or a letter followed by 4 digits";
                    return;
                }
            } else if (isNaN(filename.slice(4,5)) || (filename.slice(4,5) === ' ')){
                jobNumber = filename.slice(0,4);
                if (isNaN(jobNumber)){
                    errorCode = 2;
                    errorMsg = "Invalid job number! Must be 4-5 digits or a letter followed by 4 digits";
                }
            } else {
                jobNumber = filename.slice(0,5);
                if (isNaN(jobNumber)){
                    errorCode = 2;
                    errorMsg = "Invalid job number! Must be 4-5 digits or a letter followed by 4 digits";
                }
            }
            
            if (errorCode > 0) return null;
            else return jobNumber;

        };


        const removeDuplicates = async(bom) => {
            let new_bom = [];
            for (var idx = 0; idx < bom.length; idx++){
                let bom_det = bom[idx][1]; 
                let bom_qty = bom[idx][5];

                let found = false;
                let isnum = /^\d+$/.test(bom_det);

                if (isnum && bom[idx].length > 8){
                    for (var ri = new_bom.length - 1; ri >= 0; ri--){
                        if (new_bom[ri][1] == bom_det){
                            new_bom[ri][5] = bom_qty + new_bom[ri][5];
                            found = true;
                        } 
                    }
                    if (!found){
                        new_bom.push(bom[idx]);
                    }
                }
            }
            return new_bom;
        };
        
        const formatBOM = async(bom) =>{
            let rowarray = [];
            let new_bom =[];
            let str = "";

            bom = await removeDuplicates(bom);

            for (var ri = 0; ri < bom.length; ri++){
                if (bom[ri].length < 9){
                    continue;
                } else if (bom[ri].length > 9) {
                    bom[ri] = bom[ri].slice(0,10);
                } 
                for (var ci = 0; ci < bom[ri].length; ci++){
                    if ((ci < 6) && (bom[ri][ci] === null || typeof bom[ri][ci] === 'undefined' || bom[ri][ci].toString().length === 0)){
                        errorCode = 3;
                        errorMsg = "Empty cell found at row ${ ri }, column ${ci}";
                        return null;
                    } else if (Object.prototype.toString.call(bom[ri][ci]) === '[object String]'){
                        str = bom[ri][ci].toString();
                        //remove quotation marks
                        str = str.replace("\"", "");
                        //remove commas (delimiter for Kardex import)
                        str = str.replace(",", "");

                        if(ci === 3){
                            //replace characters that cause import issues
                            let str = bom[ri][3];
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
                    } else if (typeof bom[ri][ci] === 'number'){
                        str = "" + bom[ri][ci];
                    } else if (typeof bom[ri][ci] === 'undefined'){
                        str = "";
                    } else {
                        errorCode = 4;
                        errorMsg = "Unrecognized data type at row ${ ri }, column ${ci}";
                        return null;
                    }

                    //check if any text is greater than 35 chars
                    if (str.length > 35){
                        str = str.substring(0, 35);
                    }
                    rowarray.push(str);
                }
                if (rowarray.length > 0 ){
                    new_bom.push(rowarray);
                }
                rowarray = [];
            }

            return new_bom;
            
        };


       
        
        (async() => {

            try {
                let jobNumber = await getJobNumber(file);
                if (jobNumber === null){
                    if (errorCode === 2){
                        msg.topic = "Invalid Job Number!";
                    } else if(errorCode === 3){
                        msg.topic = "Empty cell found!";
                    } else {
                        msg.topic = "Filename Invalid!";
                    }
                    msg.errorCode = errorCode;
                    msg.payload = errorMsg;                
                    this.send([null,msg]);
                } else {
                    msg.jobNumber = jobNumber;
                    let new_bom = await formatBOM(bom);
                    if (new_bom === null){
                        if(errorCode === 3){
                            msg.topic = "Empty cell found!";
                        } else {
                            msg.topic = "Error";
                        }
                        msg.errorCode = errorCode;
                        msg.payload = errorMsg;                
                        this.send([null,msg]);
                    } else {
                        var newMsg = {}
                        this._extendMsgPayload(newMsg, { "jobnumber":jobNumber, "bom":new_bom });
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

module.exports = { BOMPreprocessPalletManager };
const  { PalletManager } = require('../PalletManager');
const { isNull } = require('util');

class BOMPreprocessPalletManager extends PalletManager {

    constructor(RED, palletConfig, node){
        super(RED, palletConfig, node);

        this._self.config = palletConfig;
        this._self.palletType = 'BOM pre-process';

        this.onInput = this.onInput.bind(this._self);

    }
    

    onInput(msg){

        const {sheetname, file, bom } = msg.payload;
        var errorMsg = "";
        const { assert, Console } = require('console');
        
    
        const getJobNumber = async(file) =>{
            var pos =  file.lastIndexOf("/");
            if (pos > 0) {
                var filename = file.slice(pos+1, file.length);
                if (isNaN(filename.slice(0,1))){
                    return filename.slice(0,5);
                } else if (isNaN(filename.slice(4,5))){
                    return filename.slice(0,4);
                } else {
                    return filename.slice(0,5);
                }

            } else {
                errorMsg = "Path not found in file name";
                return null;
            }
        }
        
        const formatBOM = async(bom) => {
            let rowarray = [];
            let new_bom =[];

            for (var ri = 4; ri < bom.length; ri++){
                let emptyFlag = false;
                //check for empty values
                if (bom[ri][3] === null || typeof bom[ri][3] === 'undefined'|| bom[ri][3].toString().length === 0){
                    emptyFlag=true;
                } 
                if (bom[ri][2] === null || typeof bom[ri][2] === 'undefined'|| bom[ri][2].toString().length === 0) {
                    emptyFlag=true;
                }
                if (bom[ri][1] === null || typeof bom[ri][1] === 'undefined'|| bom[ri][1].toString().length === 0) {
                    emptyFlag=true;
                }
                if (bom[ri][5] === null || typeof bom[ri][5] === 'undefined'|| bom[ri][5].toString().length === 0){
                     emptyFlag=true;
                }
                if (emptyFlag) return null;
                
                for (var ci = 0; ci < bom[ri].length; ci++){
                    let str = bom[ri][ci].toString();
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

                    //check if any text is greater than 35 chars
                    if (str.length > 35){
                        str = str.substring(0, 35);
                    }
                    rowarray.push(str);
                }
                new_bom.push(rowarray);
                rowarray = [];
            }

            return new_bom;
            
        };


       
        
        (async() => {

            try {
                let jobNumber = await getJobNumber(file);
                if (jobNumber === null){
                    msg.payload = errorMsg;
                    this.send([null,msg]);
                } else {
                    msg.jobNumber = jobNumber;
                    let new_bom = await formatBOM(bom);
                    msg.bom = new_bom;
                    //this._extendMsgPayload(msg, excelJSON);
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

module.exports = { BOMPreprocessPalletManager };
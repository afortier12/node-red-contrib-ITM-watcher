const  { PalletManager } = require('../PalletManager');
const isNull  = require('util');
const isNumber= require('lodash');
const fs = require('fs');

class KardexKitImportPreprocessPalletManager extends PalletManager {

    constructor(RED, palletConfig, node){
        super(RED, palletConfig, node);

        this._self.config = palletConfig;
        this._self.palletType = 'Kardex kit import pre-process';
        

        this.onInput = this.onInput.bind(this._self);

    }
    

    onInput(msg){

        const { jobnumber, bom, data } = msg.payload;
        var errorMsg = "";
        var errorCode = 0;          
        var kitJobNumber = "";
        var kitNumber = [];
        const { assert, Console } = require('console');
      
        const checkKitItemInBOM = async(bom, data) =>{
            
            let check = 0;
            for (var idx = 0; idx < data.length; idx++){
                let kit_item_found = false;
                
                let kit_bom = data[idx].bom;
                for (var kidx=0; kidx < kit_bom.length; kidx++){
                    var kit_item = kit_bom[kidx];
                    var kit_det = kit_item[0];
                    var kit_qty = kit_item[4];
                    let found = false;

                    let isnum = /^\d+\.?\d*$/.test(kit_det); 
                    if (isnum){
                        isnum = /^\d+\.?\d*$/.test(kit_qty);
                        if (!isnum){
                            errorCode = 5;
                            errorMsg = "Kit item has and invalid quantity value: DET#" + kit_det + ", quantity=" + kit_qty +"!";
                            check = -1;
                        } else {
                            for (var ri=0; ri < bom.length; ri++){
                                let bom_det = bom[ri][1];
                                let isnum = /^\d+\.?\d*$/.test(bom_det);

                                if (isnum){
                                    if (kit_det === bom_det){
                                        found = true;
                                        break;
                                    }

                                }
                            }
                            if (!found){
                                errorCode = 6;
                                errorMsg = "Kit item not found in main BOM: DET#" + kit_det + "!";
                                check = -1;
                            }
                        }
                    }
                
                }
            }
            return check;
        
        };


        //check if BOM and kit match
        //if BOM item is in multiple kits, add additional entries in BOM
        //verify kit quantity is less than or equal to BOM qty
        const checkBOMAgainstKit = async(bom, data) =>{
            let new_bom_line = [];
            let new_bom = [];
            let kit_number = "";

            let check = await checkKitItemInBOM(bom, data);

            if (check === -1) return null;
            
            bom.forEach(function (item, idx, arr){
                let bom_det = item[1];
                let bom_qty = item[5];
                let item_found = false;
                let kit_total_qty = 0;
                let bom_split1 = item.slice(0,5);
                let bom_split2 = item.slice(6);

                let isnum = /^\d+\.?\d*$/.test(bom_qty);

                if (isnum){
                    for (idx = 0; idx < data.length; idx++){
                        let kit_item_found = false;
                        let kit_qty = 0;
                        
                        kit_number = data[idx].kit;
                        let kit_bom = data[idx].bom;
                        for (let kidx=0; kidx < kit_bom.length; kidx++){
                            var kit_item = kit_bom[kidx];
                            var kit_det = kit_item[0];
                            isnum = /^\d+\.?\d*$/.test(kit_item[0]);
                            if (isnum){
                                if (kit_det==bom_det && !kit_item_found){
                                    kit_item_found = true;
                                    item_found = true;
                                    kit_qty = kit_item[4];
                                    isnum = /^\d+\.?\d*$/.test(kit_qty);
                                    if (isnum){
                                        kit_total_qty = kit_total_qty + parseInt(kit_qty);
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
                        errorCode = 7;
                        errorMsg = "Kit required quantity (" + kit_total_qty.toString() + ") is higher than BOM quantity ("+ bom_qty.toString() + ")!";
                    } else if (parseInt(bom_qty) > kit_total_qty && item_found){
                        new_bom_line = bom_split1.concat([kit_total_qty])
                        new_bom_line = new_bom_line.concat(["None"])
                        new_bom_line = new_bom_line.concat(bom_split2);
                        new_bom.push(new_bom_line);
                        new_bom_line = [];
                    }
                } 

            });
            return new_bom;
        };

        const findCMP = async(jobnumber, bom) =>{
            
            let p20Pattern = new RegExp("\\s*[A-Oa-oQ-Zq-z]*\\s*(P\\s*.?\\s*20)\\s*", "i");
            let hhp20Pattern = new RegExp("\\s*(HH\\s*.?\\s*P\\s*.?\\s*20)\\s*", "i");
            let unilifterPattern = new RegExp("\\W*uni(?:[- ]*)lifter\\W*", "i");
            let moldmaxPattern = new RegExp("\\W*mold(?:[- ]*)max\\W*");
            let liftCarriagePattern = new RegExp(".*car.*ge", "i");
            let liftPattern = new RegExp("(^LFT)", "i");
            let lcpPattern = new RegExp("(^LCP)", "i");
            let srtPattern = new RegExp("(^srt)", "i");
            let sclPattern = new RegExp("(^sci)", "i");
            let orcPattern = new RegExp("(^orc)", "i");
            let liftDescriptionPattern = new RegExp(".*lifter","i");
            let insPattern = new RegExp(".*ins(\\s+|ert+).*", "i");
            let whiteSpacePattern = new RegExp("^\\s*$", "i");

            for (var ri=0; ri < bom.length; ri++){
                let found = false;

                let bom_std = bom[ri][3];
                let bom_mat = bom[ri][4];
                let bom_type = bom[ri][9];
                let bom_desc = bom[ri][2];
                let bom_qty = bom[ri][5];
                let bom_cmp = bom[ri][10];
            
                let p20Match = p20Pattern.exec(bom_mat);
                let hhp20Match = hhp20Pattern.exec(bom_mat);
                let liftMatch = liftPattern.exec(bom_type);
                let lcpMatch = lcpPattern.exec(bom_type);
                let srtMatch = srtPattern.exec(bom_type);
                let sclMatch = sclPattern.exec(bom_type);
                let uniMatch = unilifterPattern.exec(bom_desc);
                let carMatch = liftCarriagePattern.exec(bom_desc);
                let orcMatch = orcPattern.exec(bom_type);
                let insMatch = insPattern.exec(bom_desc);
                let liftDescMatch = liftDescriptionPattern.exec(bom_desc);
                let moldmaxMatch = moldmaxPattern.exec(bom_mat);
                let spaceMatch = whiteSpacePattern.exec(bom_type);
                let p20CmpMatch = p20Pattern.exec(bom_cmp);

                if (p20Match !== null && hhp20Match !== null){
                    if (insMatch !==null || srtMatch !==null){
                        found = true;
                    } else if (liftMatch !== null){
                        found = true;
                    }
                } else if (p20Match !== null && p20CmpMatch !== null){
                    found = true;
                } else if (p20Match !== null && hhp20Match === null && sclMatch !== null){
                    found = true;
                } else if (p20Match !== null && hhp20Match === null && srtMatch !== null){
                    found = true;
                } else if (p20Match !== null && liftDescMatch !== null){
                    found = true;
                } else if (p20Match !== null && insMatch !== null && spaceMatch !== null){
                    found = true;
                } else if (carMatch !== null && (orcMatch !== null || lcpMatch !== null || liftDescMatch !==null)){
                    found = true;
                } else if (liftMatch !== null || lcpMatch !== null || uniMatch !== null){
                    found = true;
                } else if (moldmaxMatch !== null && liftDescMatch !== null && liftMatch !== null){
                    found = true;
                } else if (moldmaxMatch !== null && liftDescMatch !== null && spaceMatch !== null){
                    found = true;
                } else if (moldmaxMatch !== null && insMatch !== null && (liftMatch !== null || srtMatch !== null)){
                    found = true;
                }

                if (found){
                    let divisor = 1;

                    let metricPattern = new RegExp("(?:(\\d+)(?:[a-z]+\\s*[a-z]*\\W*[a-z]?\\s*)(\\d+))", "i");
                    let metricPattern2 = new RegExp("(?:\\s*)(?:M)(\\d+\\.?\\d*)(?:\\s*[Xx]\\s*)(\\d+\\.?\\d*)(?:\\s*)", "i");

                    let metricMatch = metricPattern.exec(bom_std);
                    if (metricMatch === null) {
                        metricMatch = metricPattern2.exec(bom_std);
                        if (metricMatch !== null) divisor = 26;
                    } else {
                        divisor = 26;
                    }
                   
                    let dimArray = [];
                    let dimCount = 0;
                    var cmpArea = 0;
                    let dimPattern = new RegExp("(?:(\\d+\\.?\\d*)(?:[^a-zA-Z0-9_\\-]+\\s*[a-z]*[^a-zA-Z0-9_\\-]+[a-z]?\\s*)(\\d+\\.?\\d*))", "i");

                    let dimMatches = dimPattern.exec(bom_std);
                    if (dimMatches !== null){
                        for (var idx=0; idx < dimMatches.length; idx++){
                            let isnum = /^\d+\.?\d*$/.test(dimMatches[idx]);
                            if (isnum){
                                dimArray.push(dimMatches[idx]);
                                dimCount++;
                            }
                        }

                        if (dimCount <= 3 && dimCount > 1){
                            if (dimArray[0] < 36 && dimArray[1] < 36){
                                cmpArea = (dimArray[0]/divisor)*(dimArray[1]/divisor)*bom_qty;
                            } else {
                                bom[ri].push(-1);
                            }
                            bom[ri].push(cmpArea);
                        }
                    } else if (carMatch !== null && (lcpMatch !== null || orcMatch !== null)) {
                        //estimated dimensions of lifter carriange = 5"x5"
                        cmpArea = 5*bom_qty*5;
                        bom[ri].push(cmpArea);
                    }

                }

            } 
            return bom;

        };

        const createBinsKit = async(data) =>{

            let kit_bins = [];
            let file_data  = fs.readFileSync("./assets/kit_bin_sizes.json",{encoding:'utf8', flag:'r'});

            if (file_data === null || typeof file_data === 'undefined'){
                errorCode = 8;
                errorMsg = "Missing file 'kit_bin_sizes.json' file in project assets directory!";

            } else {
                let kit_bin_sizes = JSON.parse(file_data);

                for (var di=0; di < data.length; di++){
                    for (var idx=0; idx < kit_bin_sizes.length; idx++){
                        if (data[di].kit === kit_bin_sizes[idx].kit){
                            kit_bins.push(kit_bin_sizes[idx]);
                            break;
                        }
                    }
                }
                
            }

            return kit_bins;

        }

        const createBinsBOM = async(jobnumber, last_column, bom) =>{
            let cmpArea = 0;
            let cmpTrayCount = 1;
            let bom_bins = [];
            let cmpBinName = jobnumber.toString() + "cmp";
            let stdBinName = jobnumber.toString() + "s";

            let maxTrayDepth = 34;
            let maxCmpTrayWidth = Math.ceil(48 * 0.9);
            let maxStdTrayWidth = Math.ceil(96 * 0.8);

            for (var ri=0; ri < bom.length; ri++){
                //check if cmp bin
                if (bom[ri].length > last_column){
                    let area = bom[ri].pop();
                    let isnum = /^\d+\.?\d*$/.test(area);
                    if (isnum){
                        cmpArea = cmpArea + area;
                        if (Math.ceil(cmpArea) > Math.ceil(maxTrayDepth*maxCmpTrayWidth)){
                            cmpArea = 0
                            cmpTrayCount++;
                            
                        }
                    }
                    bom[ri].push(cmpBinName);
                } else {
                    bom[ri].push(stdBinName);
                }
            }

            bom_bins.push({"kit":stdBinName, "width":maxStdTrayWidth});
            bom_bins.push({"kit":cmpBinName, "width":48});

            if (cmpTrayCount > 1){  
                for (var idx = 1; idx < cmpTrayCount-1; idx++){
                    bom_bins.push({"kit":cmpBinName + idx.toString(), "width":48});
                }
                bom_bins.push({"kit":cmpBinName + idx.toString(), "width":Math.max(cmpArea, 24)});
            }
            
            return bom_bins;

        };

        
        (async() => {

            try {
                const last_column = 11;
                let new_bom = await checkBOMAgainstKit(bom, data);
                if (new_bom === null || typeof new_bom === 'undefined'){
                    if (errorCode === 5){
                        msg.topic = "Kit item not found in BOM!";
                    } else {
                        msg.topic = "Error!";
                    }
                    msg.errorCode = errorCode;
                    msg.payload = errorMsg;                
                    this.send([null,msg]);
                }else {
                    new_bom = await findCMP(jobnumber, new_bom);
                    let bom_bins = await createBinsBOM(jobnumber, last_column, new_bom);
                    let kit_bins = await createBinsKit(data);
                    var newMsg = {};
                    this._extendMsgPayload(newMsg, { "jobnumber":jobnumber, "bom": new_bom, "bom_bins": bom_bins,"kits":data, "kit_bins":kit_bins });
                    this.send([newMsg, null]);
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

module.exports = { KardexKitImportPreprocessPalletManager };
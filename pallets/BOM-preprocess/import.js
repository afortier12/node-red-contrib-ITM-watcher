
const { ExcelImportPalletManager } = require('../../src/server/pallet-managers/excel-import/ExcelImportPalletManager');
const  MODULE_NAME = 'node-red-contrib-excel-import';

console.log(module);

module.exports = function(RED) {
    "use strict";
    function importExcelNode(config){

        RED.nodes.createNode(this, config);

        const node = this;

        let palletManager = new ExcelImportPalletManager(RED, config, node);

        node.on('input', function(msg){
            palletManager.onInput(msg);
        });

            
    }

    RED.nodes.registerType('import',importExcelNode);
}
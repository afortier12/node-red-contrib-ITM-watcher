const _ = require('lodash');
const  MODULE_NAME = 'pallet-manager';

class PalletManager {
    constructor(RED, palletConfig, node){
        this._self = node
        this._self._processError = this._processError.bind(this._self);
        this._self._processSuccess = this._processSuccess.bind(this._self);
        this._self._process = this._process.bind(this._self);
        this._self._processWaiting = this._processWaiting.bind(this._self);
        this._self._extendMsgPayload = this._extendMsgPayload.bind(this._self);
    }

    _processError(err){
        const message = _.isString(err) ? err : err.message;
        if (this._debug) {
            this.error(message);
        }
        this.status({ fill:"red", shape:"dot", text: message});
    }
  
    _processSuccess(message) {
        this.status({ fill:"green", shape:"dot", text: message });
    }

    _processWaiting(message) {
        this.status({ fill:"yellow", shape:"ring", text: message });
    }
  
    _process(message, fill = 'grey', shape = "dot") {
        this.status({ fill, shape, text: message });
    }

    _extendMsgPayload(msg, object) {
        msg.payload = _.isObject(msg.payload) ? msg.payload : {};
        this.status({});
        _.extend(msg.payload, object);
    }

   
}

    module.exports = { PalletManager }; 

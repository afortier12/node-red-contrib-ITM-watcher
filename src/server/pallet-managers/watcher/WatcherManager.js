const { PalletManager } = require("../PalletManager");
const fs = require("fs");
const chokidar = require("chokidar");

class WatcherManager extends PalletManager {
	constructor(RED, palletConfig, node) {
		super(RED, palletConfig, node);

		this._self.config = palletConfig;
		this._self.palletType = "Kardex kit import monitor";
		this._self.watcher = null;

		this.onInput = this.onInput.bind(this._self);
		this.onClose = this.onClose.bind(this._self);
	}

	onClose() {
		if (!(this.watcher == null || typeof this.watcher === "undefined"))
			this.watcher.close();
	}

	onInput(msg) {
		const { path, action, timeout } = msg.payload;
		var errorMsg = "";
		var errorCode = 0;

		const startListening = (path, action, timeout) =>
			new Promise((resolve, reject) => {
				this.watcher = chokidar.watch(path, {
					persistent: true,
					depth: 0,
					ignoreInitial: true,
					awaitWriteFinish: true,
					usePolling: true,
					alwaysStat: true,
					useFsEvents: true,
					binaryInterval: 1000,
				});

				var id = this.id;

				this.watcher.on("unlink", (filename) => {
					this._processSuccess(
						action + " processed; " + filename + " deleted"
					);
					msg.topic = "import_status";
					let import_status = {
						type: 2,
						message:
							action + " processed; " + filename + " deleted",
					};
					msg.payload = import_status;
					this.send([msg, msg, null]);
					this.watcher.unwatch(filename);
					//resolve("");
				});

				this.watcher
					.on("ready", () => {
						this._processWaiting("Waiting for: " + action);
						msg.topic = "import_status";
						let import_status = {
							type: 1,
							message: "Waiting for: " + action + "...",
						};
						msg.payload = import_status;
						this.send([msg, null, null]);
						setTimeout(() => {
							msg.topic = "import_status";
							let err = action + " timeout!";
							let import_status = { type: 3, message: err };
							msg.import_status = import_status;
							this.watcher.close();
							reject(Error(err));
						}, timeout);
					})
					.on("error", () => {
						msg.topic = "import_status";
						let err = action + " failed!";
						let import_status = { type: 3, message: err };
						msg.payload = import_status;
						this.watcher.close();
						reject(Error(err));
					});
			}).catch((error) => {
				throw error;
			});

		(async () => {
			try {
				//var fo = fs.openSync(path, "w");
				//fs.closeSync(fo, "w");

				if (fs.existsSync(path)) {
					await startListening(path, action, 60000);
				} else {
					this._processError("Error creating trigger file: " + path);
					this.error("Error creating trigger file: " + path);
					msg.payload = "Error creating trigger file: " + path;
					this.send([msg, null, msg]);
				}
			} catch (error) {
				this._processError(error);
				this.error(error);
				msg.payload = error;
				this.send([msg, null, msg]);
			}
		})();
	}
}
module.exports = { WatcherManager };

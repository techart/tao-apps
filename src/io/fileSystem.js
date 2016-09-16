
let window = window || global;

class FileSystem {
    static init(options = {persistent: true, persistentQuota: 1024*1024*500}) {
        this.options = options;
        this.device = window.device || {};
        this.nativeRequestFileSystem = window.webkitRequestFileSystem ? window.webkitRequestFileSystem.bind(window) : null;
        this.request = window.requestFileSystem ? window.requestFileSystem.bind(window) : null;
        if (this.device && this.device.platform == 'browser' && this.nativeRequestFileSystem) {
            this.request  = this.nativeRequestFileSystem;
        }
        this._fs = null;
        this.isCordova = typeof window.cordova !== 'undefined' && this.device.platform != 'browser';
        this.CDV_INTERNAL_URL_ROOT = 'cdvfile://localhost/'+(options.persistent? 'persistent/':'temporary/');
        this.CDV_URL_ROOT = '';
        return this;
    }

    static requestPersist() {
        let request = (resolve, reject) => {
            return this.request(window.LocalFileSystem.PERSISTENT, 0, (fs) => {
                this._fs = fs;
                resolve(fs);
            }, reject);
        };
        return new Promise((resolve, reject) => {
            if (this.device.platform == 'browser' && window.navigator.webkitPersistentStorage) {
                window.navigator.webkitPersistentStorage.requestQuota(this.options.persistentQuota, (_grantedBytes) => {
                    return request(resolve, reject);
                }, reject);
            }
            return request(resolve, reject);
        });
    }



    static getDirName(path) {
        path = path.substr(0, path.lastIndexOf('/') + 1);
        if (path[0] === '/') {
            path = path.substr(1);
        }
        return path;
    }

    static getFilename(str) {
        return str.substr(str.lastIndexOf('/')+1);
    }

    static normalize(str){
        str = str || '';
        if(str[0] === '/') str = str.substr(1);

        var tokens = str.split('/'), last = tokens[0];

        // check tokens for instances of .. and .
        for(var i=1;i < tokens.length;i++) {
            last = tokens[i];
            if (tokens[i] === '..') {
                // remove the .. and the previous token
                tokens.splice(i-1,2);
                // rewind 'cursor' 2 tokens
                i = i - 2;
            } else if (tokens[i] === '.') {
                // remove the .. and the previous token
                tokens.splice(i,1);
                // rewind 'cursor' 1 token
                i--;
            }
        }

        str = tokens.join('/');
        if(str === './') {
            str = '';
        } else if(last && last.indexOf('.') < 0 && str[str.length - 1] != '/'){
            str += '/';
        }
        return str;
    }

    static mkdir(path, {exclusive = false} = {}) {
        var folders = path.split('/');
        return new Promise((resolve, reject) => {
            function _createDir(rootDir) {
                if (folders[0] == '.' || folders[0] == '') {
                    folders = folders.slice(1);
                }
                if (folders.length > 0 && folders[0]) {
                    rootDir.getDirectory(folders[0], {create: true, exclusive: exclusive},
                        (dirEntry) => {
                            if (folders.length) {
                                folders = folders.slice(1);
                                _createDir(dirEntry);
                            } else {
                                resolve(dirEntry);
                            }
                        },
                        reject
                    );
                } else {
                    resolve(rootDir);
                }
            }
            _createDir(this._fs.root);
        });

    }

    static file(path, {exclusive=false, mkdir=false, create=false} = {}) {
        if (mkdir) {
            let dir = this.getDirName(path);
            return new Promise((resolve, reject) => {
                this.mkdir(dir, {exclusive: exclusive}).then((dir) => {
                    dir.getFile(this.getFilename(path), {create: create, exclusive: exclusive}, resolve, reject);
                });
            });
        }
        return new Promise((resolve, reject) => {
           this._fs.root.getFile(path, {create: create, exclusive: exclusive}, resolve, reject);
        });
    }

    static create(path, {exclusive=false, mkdir=false} = {}) {
        return this.file(path, {exclusive, mkdir, create: true});
    }

    static write(path, data, {exclusive=false, mkdir=true} = {}) {
        return new Promise((resolve, reject) => {
            this.create(path, {exclusive, mkdir})
                .then((fileEntry) => {
                    fileEntry.createWriter((fileWriter) => {
                        fileWriter.onerror = (e) => {
                            reject(e);
                        };
                        fileWriter.onwriteend = () => {
                            resolve(fileEntry);
                        };
                        fileWriter.write(data);
                    });
                });
        });
    }

    static read(path, method='readAsText') {
        return new Promise((resolve, reject) => {
            this.file(path, {exclusive: false, mkdir: false, crate: false})
                .then((fileEntry) => {
                    fileEntry.file((file) => {
                        var reader = new FileReader();
                        reader.onloadend = function() {
                            resolve(this.result);
                        };
                        reader[method](file);
                    }, function(e) {
                        reject(e);
                    });
                });
        });
    }

    static getType(path) {
        return new Promise((resolve, reject) =>  {
            this.file(path).then((fileEntry) => {
                fileEntry.file((file) => {
                    return resolve(file.type);
                }, reject);
            });
        });
    }

    static readJSON(path){
        return this.read(path).then(JSON.parse);
    }

    static readBlob(path, type=null){
        let _creadBlob = (path, type) => {
            return this.read(path, 'readAsArrayBuffer').then((result) => {
                return new Blob([new Uint8Array(result)], {type : type});
            });
        };
        if (!type) {
            return this.getType(path).then((type) => {
                return _creadBlob(path, type);
            });
        } else {
            return _creadBlob(path, type);
        }
    }

    static toURL(path) {
        return this.file(path).then((fileEntry) => {
            return fileEntry.toURL();
        });
    }

    static toURLSync(path){
        path = this.normalize(path);
        if (this.isCordova) {
            return path.indexOf('://') < 0 ? this.CDV_URL_ROOT + path : path;
        } else {
            return this.toInternalURLSync(path);
        }
    }

    static toInternalURLSync(path){
        path = this.normalize(path);
        if (this.isCordova) {
            return path.indexOf('://') < 0 ? this.CDV_INTERNAL_URL_ROOT + path : path;
        } else {
            return 'filesystem:'+location.origin+(this.options.persistent? '/persistent/':'/temporary/') + path;
        }
    }

    static toInternalURL (path) {
        return this.file(path).then((fileEntry) => {
            return this.isCordova ? fileEntry.toInternalURL() : fileEntry.toURL();
        });
    }

    static toDataURL(path) {
        return this.read(path,'readAsDataURL');
    }

    static getFileList(path) {
        return new Promise((resolve, reject) => {
            this.fs.root.getDirectory(path, { create: false, exclusive: true },
                function(dir) {
                    var _reader = dir.createReader();
                    var _entries = [];

                    var _readEntries = function () {
                        _reader.readEntries(function (results) {
                            if (!results.length) {
                                resolve(_entries);
                            } else {
                                _entries = _entries.concat(results.slice(0));
                                _readEntries();
                            }
                        }, reject)
                    };

                    _readEntries();

                }, reject);
        });
    }

    static isEmpty(path) {
        return this.getFileList(path).then((entries) => {
            return entries.length === 0;
        });
    }
}

export default FileSystem;
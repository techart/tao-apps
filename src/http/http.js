import FS from '../io/fileSystem';


class HTTP {
    
    static getBlob(url) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'blob';
        xhr.timeout = 1*60*1000; // 1 minutes
        var promise = new Promise((resolve, reject) => {
            xhr.onload = function() {
                if (this.status == 200) {
                    resolve(this.response, this);
                } else {
                    reject(this);
                }
            };
            xhr.ontimeout = reject;
        });
        xhr.send();
        return promise;
    }
    
    static getFileName(url) {
        return url.substring(url.lastIndexOf('/')+1)
    }
    
    static download(url, dest) {
        return this.getBlob(url).then((data) => {
            var filename = this.getFileName(url);
            return FS.write(dest + filename, data);
        });
    }
    
}

export default HTTP;
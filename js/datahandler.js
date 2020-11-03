function loadCSVData(path, callback, delimiter)
{
    Papa.parse(path, new parsecfg(callback, delimiter));
}

//csv parsing config
function parsecfg(callback, delimiter){
    this.delimiter = delimiter;
    this.newline = "";
    this.complete = callback;
    this.download = true;
    // skipEmptyLines: false,
    // chunk: undefined,
    // fastMode: undefined,
    // beforeFirstChunk: undefined,
    // withCredentials: undefined
    // quoteChar: '"',
    // header: false,
    // dynamicTyping: false,
    // preview: 0,
    // encoding: "",
    // worker: false,
    // comments: false,
    // step: undefined,
    // error: undefined,
};

let unparseCfg = {
    // quotes: false, //or array of booleans
    // quoteChar: '"',
    // escapeChar: '"',
    delimiter: ";",
    // header: true,
    // newline: "\r\n",
    // skipEmptyLines: false, //or 'greedy',
    // columns: null //or array of strings
}

function saveJSONAsFile(jsn, filename)
{
    // var data = encode( JSON.stringify(jsn, null, 4) );
    var data = JSON.stringify(jsn);
    saveStringAsFile(data, filename)
}


function saveStringAsFile(data, filename)
{
    var blob = new Blob( [ data ], {
        type: 'text/plain'
    });

    url = URL.createObjectURL( blob );
    var link = document.createElement( 'a' );
    link.setAttribute( 'href', url );
    link.setAttribute( 'download', filename );

    var event = document.createEvent( 'MouseEvents' );
    event.initMouseEvent( 'click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
    link.dispatchEvent( event );
}


/**
 * XMLHttpRequest to load data from a file
 * @param path
 * @param callback
 * TODO: refactor name
 */
function loadData(path, callback)
{
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = callback;
    xmlhttp.open("GET", path, true);
    xmlhttp.send();
}

/**
 * parsing loaded data into a json object via loadData()
 * @returns a json object
 * //TODO: error handling
 */
function parseJSONCallback() {
    if (this.readyState == 4 && this.status == 200) {

        console.log("data loaded...");
        // console.log(this.responseText);
        var fileresult = JSON.parse(this.responseText);
        return fileresult;
    }
}
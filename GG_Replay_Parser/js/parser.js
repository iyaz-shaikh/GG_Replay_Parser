// Your code here!

$(document).ready(function () {
    $("#submit").click(function () {
        onFileUpload();
    });
});

function onFileUpload() {
    var uploadedFile = document.getElementById("fileUpload").files[0];

    if (uploadedFile != null) {
        parseEntireReplayFile(uploadedFile);
    }
}

function parseEntireReplayFile(file) {
    var fReader = new FileReader();
    var masterFileString = "";
    fReader.addEventListener('load', function () {
        var base10Array = new Uint8Array(this.result);
        var stringHexArray = new Array(base10Array.length); //for debugging
        var i = 0;
        while (i < base10Array.length) {
            // map to hex
            stringHexArray[i] = (base10Array[i] < 16 ? '0' : '') + base10Array[i].toString(16);
            masterFileString = masterFileString + stringHexArray[i];
            i++;
        }
        base10Array = null; // free memory
      
        var results = new Array();
        let uniqueSteamIDs = new Set();

        //Begin Parsing.
        for (var hIndex = REPLAY_START; hIndex < masterFileString.length; hIndex += REPLAY_LENGTH) {
            if (hIndex + REPLAY_LENGTH >= masterFileString.length)
                break;

            var snippet = "";
            for (var sIndex = 0; sIndex < REPLAY_LENGTH; sIndex++) {
                snippet = snippet + masterFileString.charAt(hIndex + sIndex);
            }
            var parsedData = {}; //dictionary

            parsedData[WINNER_ID] = parseSnippetWithIndices(snippet, WINNER_INDICES);
            parsedData[UPLOADER_STEAMID] = parseSnippetWithIndices(snippet, UPLOADERSTEAMID_INDICES, true, null, STEAMID_PREFIX);
            parsedData[PLAYER1_STEAMID] = parseSnippetWithIndices(snippet, P1STEAMID_INDICES, true, null, STEAMID_PREFIX);
            parsedData[PLAYER2_STEAMID] = parseSnippetWithIndices(snippet, P2STEAMID_INDICES, true, null, STEAMID_PREFIX);
            parsedData[CHARACTER1_ID] = parseSnippetWithIndices(snippet, CHARACTER1_INDICES);
            parsedData[CHARACTER2_ID] = parseSnippetWithIndices(snippet, CHARACTER2_INDICES);

            //Timestamp
            parsedData[YEAR_ID] = parseSnippetWithIndices(snippet, YEAR_INDICES, true, YEAR_OFFSET);
            parsedData[MONTH_ID] = parseSnippetWithIndices(snippet, MONTH_INDICES, true);
            parsedData[DAY_ID] = parseSnippetWithIndices(snippet, DAY_INDICES, true);
            parsedData[HOUR_ID] = parseSnippetWithIndices(snippet, HOUR_INDICES, true);
            parsedData[MINUTE_ID] = parseSnippetWithIndices(snippet, MINUTE_INDICES, true);
            parsedData[SECOND_ID] = parseSnippetWithIndices(snippet, SECOND_INDICES, true);

            let uniqueHash = parsedData[PLAYER1_STEAMID] + parsedData[PLAYER2_STEAMID] + parsedData[CHARACTER1_ID]
                + parsedData[CHARACTER2_ID] + parsedData[WINNER_ID] + parsedData[DAY_ID]
                + parsedData[MONTH_ID] + parsedData[YEAR_ID] + parsedData[MINUTE_ID];
            parsedData[UNIQUEHASH_ID] = uniqueHash;

            //Need to do some formatting for this
            parsedData[TIMESTAMP_ID] = assembleTimeStamp(parsedData);

            //Check for unique Steam IDs
            if (!uniqueSteamIDs.has(parsedData[PLAYER1_STEAMID])) {
                uniqueSteamIDs.add(parsedData[PLAYER1_STEAMID]);
            }
            if (!uniqueSteamIDs.has(parsedData[PLAYER2_STEAMID])) {
                uniqueSteamIDs.add(parsedData[PLAYER2_STEAMID]);
            }

            //Create new object with only necessary data (to keep memory as low as possible).
            var replayInSQLFormat = {};
            replayInSQLFormat[UNIQUEHASH_ID] = parsedData[UNIQUEHASH_ID];
            replayInSQLFormat[PLAYER1_STEAMID] = parsedData[PLAYER1_STEAMID];
            replayInSQLFormat[WINNER_ID] = parsedData[WINNER_ID];
            replayInSQLFormat[PLAYER2_STEAMID] = parsedData[PLAYER2_STEAMID];
            replayInSQLFormat[CHARACTER1_ID] = parsedData[CHARACTER1_ID];
            replayInSQLFormat[CHARACTER2_ID] = parsedData[CHARACTER2_ID];
            replayInSQLFormat[UPLOADER_STEAMID] = parsedData[UPLOADER_STEAMID];
            replayInSQLFormat[TIMESTAMP_ID] = parsedData[TIMESTAMP_ID];

            results.push(replayInSQLFormat);
        }

        //Render unique Steam Ids
        var oldSteamIDs = $("#uniqueSteamIDs").find("tbody");
        var newSteamIDs = $("<tbody>");
        let uniqueSteamIDsIterator = uniqueSteamIDs.values();
        let uniqueSteamIDsArray = new Array(); //For Future use.
        var uniqueSteamIDsIndex = 0;
        for (let uniqueSteamID of uniqueSteamIDsIterator) {
            var newRow = $("<tr>");
            newRow.append($("<td>" + uniqueSteamID + "</td >"));
            newRow.append($("</tr>"));
            newSteamIDs.append(newRow);
            uniqueSteamIDsArray[uniqueSteamIDsIndex] = uniqueSteamID;
            uniqueSteamIDsIndex++;
        }

        newSteamIDs.append("</tbody>");
        oldSteamIDs.replaceWith(newSteamIDs);


        //Render stuff in table
        var oldRows = $("#debugTable").find("tbody");
        var newRows = $("<tbody>");

        for (var rIndex = 0; rIndex < results.length; rIndex++) {
            let replay = results[rIndex];
            var newRow = $("<tr>");
            newRow.append($("<td>" + replay[WINNER_ID] + "</td >"));
            newRow.append($("<td>" + replay[UPLOADER_STEAMID] + "</td >"));
            newRow.append($("<td>" + replay[PLAYER1_STEAMID] + "</td >"));
            newRow.append($("<td>" + replay[CHARACTER1_ID] + "</td >"));
            newRow.append($("<td>" + replay[CHARACTER2_ID] + "</td >"));
            newRow.append($("<td>" + replay[PLAYER2_STEAMID] + "</td >"));
            newRow.append($("<td>" + replay[TIMESTAMP_ID] + "</td >"));
            newRow.append($("</tr>"));
            newRows.append(newRow);
        }
        newRows.append($("</tbody>"));
        oldRows.replaceWith(newRows);

        //HTTP requests
        steamIDPostRequest(uniqueSteamIDsArray);
        replayDataPostRequest(results);
    });
    fReader.readAsArrayBuffer(file);

}



//helper
//Offset can only be used in cases < 2^53
function parseSnippetWithIndices(snippet, indices, convertToBase10, offset, prefix) {
    var indexedSnippet = prefix != null ? prefix : "";
    for (var i = 0; i < indices.length; i++) {
        if (indices[i] < snippet.length) {
            indexedSnippet = indexedSnippet + snippet.charAt(indices[i]);
        }
    }
    if (convertToBase10) {
        var base10Snippet = h2d(indexedSnippet);
        if (offset != null) {
            var base10SnippetInDecimal = parseInt(base10Snippet, 10);
            base10SnippetInDecimal += offset;
            base10Snippet = base10SnippetInDecimal.toString(10);
        }
        indexedSnippet = base10Snippet;
    }
    return indexedSnippet;
}


function assembleTimeStamp(result) {
    let year = parseInt(result[YEAR_ID], 10);
    let month = parseInt(result[MONTH_ID], 10);
    let day = parseInt(result[DAY_ID], 10);
    let hour = parseInt(result[HOUR_ID], 10);
    let minute = parseInt(result[MINUTE_ID], 10);
    let second = parseInt(result[SECOND_ID], 10);

    var date = new Date(Date.UTC(year, month, day, hour, minute, second));
    var options = {
        weekday: "long", year: "numeric", month: "short",
        day: "numeric", hour: "2-digit", minute: "2-digit"
    };  
    let dateString = date.toLocaleDateString("en-US");
    return dateString;
}

//Online workaround to Javascript's limitation of having a max of 52 bit floating point numbers in parseInt, which causes inaccuracies when converting from hex to dec.

function h2d(s) {

    function add(x, y) {
        var c = 0, r = [];
        var x = x.split('').map(Number);
        var y = y.split('').map(Number);
        while (x.length || y.length) {
            var s = (x.pop() || 0) + (y.pop() || 0) + c;
            r.unshift(s < 10 ? s : s - 10);
            c = s < 10 ? 0 : 1;
        }
        if (c) r.unshift(c);
        return r.join('');
    }

    var dec = '0';
    s.split('').forEach(function (chr) {
        var n = parseInt(chr, 16);
        for (var t = 8; t; t >>= 1) {
            dec = add(dec, dec);
            if (n & t) dec = add(dec, '1');
        }
    });
    return dec;
}


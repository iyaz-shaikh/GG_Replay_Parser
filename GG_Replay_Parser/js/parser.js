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
        var i = 0;
        while (i < base10Array.length) {
            // map to hex
            masterFileString = masterFileString + (base10Array[i] < 16 ? '0' : '') + base10Array[i].toString(16);
            i++;
        }
        base10Array = null; //free memory
      
        var results = new Array();
        let uniqueSteamIDs = new Set();

        var timezone_offset = moment.parseZone(new Date()).utcOffset() / 60.0;

        //Begin Parsing.
        for (var hIndex = REPLAY_START; hIndex < masterFileString.length; hIndex += REPLAY_LENGTH) {
            if (hIndex + REPLAY_LENGTH >= masterFileString.length)
                break;

            var replaySnippet = "";
            for (var sIndex = 0; sIndex < REPLAY_LENGTH; sIndex++) {
                replaySnippet = replaySnippet + masterFileString.charAt(hIndex + sIndex);
            }

            var regularData = {}; 
            var inversedData = {};

            regularData[WINNER_ID] = parseSnippetWithIndices(replaySnippet, WINNER_INDICES);
            regularData[UPLOADER_STEAMID] = parseSnippetWithIndices(replaySnippet, UPLOADERSTEAMID_INDICES, true, null, STEAMID_PREFIX);
            regularData[PLAYER_STEAMID] = parseSnippetWithIndices(replaySnippet, P1STEAMID_INDICES, true, null, STEAMID_PREFIX);
            regularData[OPPONENT_STEAMID] = parseSnippetWithIndices(replaySnippet, P2STEAMID_INDICES, true, null, STEAMID_PREFIX);
            regularData[CHARACTER1_ID] = parseSnippetWithIndices(replaySnippet, CHARACTER1_INDICES);
            regularData[CHARACTER2_ID] = parseSnippetWithIndices(replaySnippet, CHARACTER2_INDICES);
            regularData[TIMESTAMP_ID] = assembleTimeStamp(replaySnippet, timezone_offset);

            regularData[UNIQUEHASH_ID] = generateUniqueHash(regularData);

            inversedData[UPLOADER_STEAMID] = regularData[UPLOADER_STEAMID];
            inversedData[PLAYER_STEAMID] = regularData[OPPONENT_STEAMID];
            inversedData[OPPONENT_STEAMID] = regularData[PLAYER_STEAMID];
            inversedData[CHARACTER1_ID] = regularData[CHARACTER2_ID];
            inversedData[CHARACTER2_ID] = regularData[CHARACTER1_ID];
            inversedData[TIMESTAMP_ID] = regularData[TIMESTAMP_ID];
            inversedData[WINNER_ID] = flipWinnerStringToBoolean(regularData[WINNER_ID]);

            inversedData[UNIQUEHASH_ID] = generateUniqueHash(inversedData);

            //Check for unique Steam IDs
            if (!uniqueSteamIDs.has(regularData[PLAYER_STEAMID])) {
                uniqueSteamIDs.add(regularData[PLAYER_STEAMID]);
            }
            if (!uniqueSteamIDs.has(regularData[OPPONENT_STEAMID])) {
                uniqueSteamIDs.add(regularData[OPPONENT_STEAMID]);
            }

            results.push(regularData);
            results.push(inversedData);
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
            newRow.append($("<td>" + replay[PLAYER_STEAMID] + "</td >"));
            newRow.append($("<td>" + replay[CHARACTER1_ID] + "</td >"));
            newRow.append($("<td>" + replay[CHARACTER2_ID] + "</td >"));
            newRow.append($("<td>" + replay[OPPONENT_STEAMID] + "</td >"));
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

function flipWinnerStringToBoolean(winner) {
    var winnerBoolean = winner == "01";
    return winnerBoolean ? "00" : "01";
}


function generateUniqueHash(parsedData) {
    return parsedData[PLAYER_STEAMID] + parsedData[OPPONENT_STEAMID] + parsedData[CHARACTER1_ID]
        + parsedData[CHARACTER2_ID] + parsedData[WINNER_ID] + parsedData[TIMESTAMP_ID];
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


function assembleTimeStamp(snippet) {
    let year = parseInt(parseSnippetWithIndices(snippet, YEAR_INDICES, true, YEAR_OFFSET), 10);
    let month = parseInt(parseSnippetWithIndices(snippet, MONTH_INDICES, true), 10);
    let day = parseInt(parseSnippetWithIndices(snippet, DAY_INDICES, true), 10);
    let hour = parseInt(parseSnippetWithIndices(snippet, HOUR_INDICES, true), 10);
    let minute = parseInt(parseSnippetWithIndices(snippet, MINUTE_INDICES, true), 10);
//    let s = parseInt(parseSnippetWithIndices(snippet, SECOND_INDICES, true), 10);

    var date = new Date(year, month, day, hour, minute, 00);
    let date2 = moment.utc(date).format('YYYY/MM/DD HH:mm:ss');

    return date2;
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


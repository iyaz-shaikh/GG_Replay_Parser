function steamIDPostRequest(uniqueSteamIDs) {
    $.post(
        "http://localhost:2541/addSteamIDs",
        { steamIDs: uniqueSteamIDs },
        function (data) {
            alert('page content: steam IDs');
        }
    );
}

function steamIDGetRequest() {
    $.get("http://localhost:2541/steamIDs",
        function (data) {
            alert('job done');
        }
    );
}

function replayDataPostRequest(replays) {
    $.post(
        "http://localhost:2541/addReplayData",
        { replays: replays },
        function (data) {
            alert('replays sent');
        }

    )
}
function steamIDPostRequest(uniqueSteamIDs) {
    $.post(
        "http://localhost:1337/addSteamIDs",
        { steamIDs: uniqueSteamIDs },
        function (data) {
            alert('page content: steam IDs');
        }
    );
}

function steamIDGetRequest() {
    $.get("http://localhost:1337/steamIDs",
        function (data) {
            alert('job done');
        }
    );
}

function replayDataPostRequest(replays) {
    $.post(
        "http://localhost:1337/addReplayData",
        { replays: replays },
        function (data) {
            alert('replays sent');
        }

    )
}
﻿function steamIDPostRequest(uniqueSteamIDs) {
    $.post(
        "http://localhost:1337/addSteamIDs",
        { steamIDs: uniqueSteamIDs },
        function (data) {
            alert('page content: steam IDs');
        }
    );
}
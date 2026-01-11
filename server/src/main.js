// const params = new Proxy(new URLSearchParams(window.location.search), {
//     get: (searchParams, prop) => searchParams.get(prop),
// });
//
// const authToken = params.authToken;
// const uid = params.uid;

addEventListener("DOMContentLoaded", _ => {
    // const main_center = document.getElementById("main_center");

    // if (authToken == null || uid == null) {
    //     // no auth token yet, need to authenticate
    //     main_center.innerHTML = "<form action='/auth' method='get'><button type='submit'>Auth</button></form>";
    // } else {
    //     // authenticated!
    //     // main_center.innerHTML = `<h2>${authToken}</h2>`;
    //
    // }

    document.getElementById("auth_button").onclick = async _ => {
        const res = await (await fetch("/auth", {
            method: "GET",
        })).json();
        document.getElementById("auth_resp").innerHTML = `<h3>${res.qrcodeUrl}</h3>`;
    };

    document.getElementById("send_hit_button").onclick = _ => {
        const secret = document.getElementById("secret_input").value;
        fetch(`/hit?secret=${secret}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ dmg: 1.0 })
        });
    };
});


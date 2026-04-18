function pairingCodeHTML(pairingCode) {
    return `
		<h3>Pairing code:</h3>
		<code>${pairingCode}</code>
	`;
}

async function addLinkOptions(parent, pairingCode) {
    // pair lovense
    const lovenseDiv = document.createElement("div");
    parent.appendChild(lovenseDiv);

    const lovenseButton = document.createElement("button");
    const lovenseResponse = document.createElement("div");
	lovenseResponse.style = "padding: 10px";

    lovenseButton.innerText = "Pair Lovense";
    lovenseButton.onclick = async _ => {
        const resp = await fetch("/lovense/auth", {
            method: "POST",
            headers: {
                "pairing-code": pairingCode
            }
        });
        const json = await resp.json();
        if (resp.status == 200) {
            // we got a QR code!!
            const qrcodeURL = json.qrcodeURL;
            const img = document.createElement("img");
            img.src = qrcodeURL;
            img.alt = "QR Code";
			img.style = "border-radius: 10px";
            lovenseResponse.appendChild(img);
        } else {
            // error
            const error = json.error;

            console.error(`Failed to get Lovense QR code: ${error}`)

            document.getElementById("error").innerText = error;
        }
    };

    lovenseDiv.appendChild(lovenseButton);
    lovenseDiv.appendChild(lovenseResponse);
}

async function newSession() {
    console.info("Creating new session");

    const resp = await fetch("/new-session", {
        method: "POST"
    });
    const json = await resp.json();

    if (resp.status == 200) {
        // got successful pairing code!
        const pairingCode = json.pairingCode;

        console.info(`Got pairing code: ${pairingCode}`);

        document.getElementById("pairing_code").innerHTML = pairingCodeHTML(pairingCode);

        document.getElementById("new_session_button").disabled = true;

        addLinkOptions(document.getElementById("link_options"), pairingCode);
    } else {
        // get pairing code failed
        const error = json.error;

        console.error(`Failed to get pairing code: ${error}`)

        document.getElementById("error").innerText = error;
    }
}

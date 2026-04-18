function pairingCodeHTML(pairingCode) {
    return `
		<h3>Pairing code:</h3>
		<code>${pairingCode}</code>
	`;
}

function addCollapsible(parent, title) {
    const parentDiv = document.createElement("div");
    parentDiv.style = "margin-bottom: 18px;";

    const collapseButton = document.createElement("button");
    collapseButton.type = "button";
    collapseButton.className = "collapsible-button";
    collapseButton.innerText = title;

    const contentDiv = document.createElement("div");
    contentDiv.className = "collapsible-content";

    parentDiv.appendChild(collapseButton);
    parentDiv.appendChild(contentDiv);

    collapseButton.addEventListener("click", () => {
        let content = collapseButton.nextElementSibling;
        if (content.style.display == "block") {
            content.style.display = "none";
        } else {
            content.style.display = "block";
        }
    });

    parent.appendChild(parentDiv);

    return contentDiv;
}

function addLovenseLink(parent, pairingCode) {
    const button = document.createElement("button");
    const response = document.createElement("div");
    response.style = "padding: 10px";

    button.innerText = "Pair Lovense";
    button.onclick = async _ => {
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
            response.appendChild(img);
        } else {
            // error
            const error = json.error;

            console.error(`Failed to get Lovense QR code: ${error}`)

            document.getElementById("error").innerText = error;
        }
    };

    parent.appendChild(button);
    parent.appendChild(response);
}

async function addOpenShockLink(parent, pairingCode) {
    const tokenInput = document.createElement("input");
    tokenInput.type = "text";
    tokenInput.id = "OpenShockTokenInput";
    tokenInput.placeholder = "OpenShock API Token";
    tokenInput.style = "width: 80%;";

    const button = document.createElement("button");
    button.innerText = "Pair OpenShock";
    button.style = "margin: 8px;";

    const shockersInput = document.createElement("textarea");
    shockersInput.rows = 4;
    shockersInput.cols = 64;
    shockersInput.placeholder = "IDs of shockers to control";

    console.log("pair openshock w/ code: " + pairingCode);
    button.onclick = async _ => {
        const resp = await fetch("/openshock/auth", {
            method: "POST",
            headers: {
                "pairing-code": pairingCode,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                token: tokenInput.value,
                shockers: shockersInput.value.split("\n").map(s => s.trim())
            }),
        });
        if (resp.status == 200) {
            console.log("paired OpenShock!");
            // clear text input
            tokenInput.value = "";
        } else {
            const json = await resp.json();
            const error = json.error;

            console.error(`Failed to pair OpenShock: ${error}`)

            document.getElementById("error").innerText = error;
        }
    };

    parent.appendChild(tokenInput);
    parent.appendChild(button);
    parent.appendChild(shockersInput);
}

function addLinkOptions(parent, pairingCode) {
    // Lovense pairing
    const lovenseDiv = addCollapsible(parent, "Lovense");
    addLovenseLink(lovenseDiv, pairingCode);

    // OpenShock pairing
    const openShockDiv = addCollapsible(parent, "OpenShock");
    addOpenShockLink(openShockDiv, pairingCode);
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

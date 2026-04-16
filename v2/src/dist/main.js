function pairingCodeHTML(pairingCode) {
    return `
		<h3>Pairing code:</h3>
		<code>${pairingCode}</code>
	`;
}


async function newSession(button) {
    console.info("Creating new session");

    const resp = await fetch("/new-session", {
        method: "POST"
    });
    const json = await resp.json();

    if (resp.status == 200) {
        // got successful pairing code!
        const pairingCode = json.pairingCode;

		console.info(`Got pairing code: ${pairingCode}`);

        document.getElementById("interact_div").innerHTML += pairingCodeHTML(pairingCode);

        button.disabled = true;
    } else {
        // get pairing code failed
        const error = json.error;

		console.error(`Failed to get pairing code: ${error}`)

        document.getElementById("error_response_div").innerText = error;
    }
}

const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
});

const pError = params.e;
const qrcodeUrl = params.qr;

addEventListener("DOMContentLoaded", _ => {
    if (pError) {
        document.getElementById("error_response_div").innerText = pError;
    }

    if (qrcodeUrl) {
        const img = document.createElement("img");
        img.src = qrcodeUrl;
        img.alt = "QR Code";
        document.getElementById("qrcode_div").appendChild(img);
    }
});


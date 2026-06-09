# ✨Sparkler✨

Sparkler is a middleware web-app designed to connect various games ("sources")
to real-world stimuli ("sinks"), like making a call to OpenShock whenever you
take damage in Minecraft.

This repo **only** has code on the central control server, for information on
individual sources/games check the [Sources](#sources) section. For more
information on the Sparkler control API (possibly for building your own custom
source), check the [API](#api) section.

Currently, the supported sinks are Lovense and OpenShock.

## The Control Server

The control server is a simple [express.js](https://expressjs.com/) webserver
that handles serving the very basic frontend HTML and authenticating with the
various sink APIs. It expects the following environment variables for **all
usage**:

- `PORT`: The port to open the HTTP server on

For use with the **Lovense API**, the following environment variables must be
present:

- `LOVENSE_TOKEN`: The [Lovense API dev token](https://developer.lovense.com/)

- `LOVENSE_PLATFORM`: The domain of your Lovense developer account

For use with the **OpenShock API**, the following environment variables must be
present:

- `OPENSHOCK_TOKEN`: Your OpenShock API token


Once the server is running, it will serve the main HTML page where you can
create a new control session, which will give you the **pairing code** for that
session (this is how you will pair any command sources). It will also have
dropdown menus for connecting to the supported sinks (i.e. Lovense, OpenShock,
etc) so that you can pair those.

## Sources

Currently, the only officially supported source is the [Minecraft
mod](https://github.com/myrari/sparkler-minecraft), but more are planned in
development for more games!

If you want to make your own, the API documentation can be found in the
[API](#api) section!

## API

Communication between any source and the control server is done via a small
HTTP API, where the main route for sending commands is a `POST` route to
`/sparkle`. You **must** provide the session secret as the HTTP header
`secret`, and the body of the `POST` request should be `JSON` of the following
schema:

```json
{
    intensity: number,
    duration: number
}
```

To get the session secret, you must follow the **authentication pipeline**:

1. The user creates a new **session** on the web app and receives the session's
   **pairing code**.

2. The source sends a `POST` request to `/auth` with the pairing code in the
   HTTP header `pairing-code`.

3. The server responds with a `JSON` object containing the parameter `secret`,
   which is a string representing the **session secret**.

Once the source has the session secret, it can be used in the `secret` header
for all requests to `/sparkle`.


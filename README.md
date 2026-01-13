# ✨Sparkler✨

This is a project for connecting a Minecraft client to a remote-controlled
Lovense device via a central control server (hosted at
[sparkler.myrari.net](https://sparkler.myrari.net/)).

It is structued into 2 primary sub-projects:

- [The client-side Minecraft Mod](/fabric_mod)

- [The control server](/server)

## The Minecraft Mod

The mod is a fully client-side Fabric mod (currently set up to be build for
version 1.21.10) that uses a small mixin to detect when the client player loses
health by reading the hotbar GUI. It then uses the built-in Java HTTP Client to
send an HTTP post request to the control server, containing information on
which player was hit, for how much damage, and how much health they have
remaining.

The mod also adds a `/sparkle` command that gives that session's client secret
(more about this in the [API](#api) section).

## The Control Server

The control server is a simple [express.js](https://expressjs.com/) webserver
that handles serving the very basic frontend HTML and authenticating with the
Lovense API. It expects the following environment variables:

- `PORT`: The port to open the HTTP server on

- `DEV_TOKEN`: The [Lovense API dev token](https://developer.lovense.com/)

- `PLATFORM`: The domain of your Lovense developer account

Once the server is running, it will serve the main HTML page where you can
enter your Minecraft username and client secret (see [API](#api)), and it will
then authenticate your Minecraft account with [Mojang's
API](https://minecraft.wiki/w/Mojang_API) and present a QR code to be scanned
in the Lovense Remote app. Once you have authenticated your Minecraft account,
all control commands will be sent to all devices you have connected in the
Remote app.

## API

Communication between the client mod and the control server is done via a very
minimal HTTP API, where the body of each request is expected to be `JSON` and
it recognizes the following routes:

| Route | Parameters |
| ----- | ---------- |
| `/hit` (`POST`) | `dmg`: integer representing the amount of damage taken |
| | `to`: integer representing the player's remaining health |

In addition, for authentication purposes, every request must include the query
parameters `id` (the Minecraft UUID) and `secret` (the client secret). These
must both match **exactly** with what is entered in the Web UI (see [The
Control Server](#the-control-server)), and you can get your client secret by
running the in-game `/sparkle` command on the Minecraft client.


package net.myrari.sparkler;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpRequest.BodyPublishers;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandManager;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.minecraft.client.Minecraft;

class SparklerConfig {
	public int PORT;
	public String CLIENT_SECRET;

	public SparklerConfig(int port, String secret) {
		this.PORT = port;
		this.CLIENT_SECRET = secret;
	}
}

public class SparklerClient implements ClientModInitializer {
	public static final String MOD_ID = "sparkler";

	// This logger is used to write text to the console and the log file.
	// It is considered best practice to use your mod id as the logger's name.
	// That way, it's clear which mod wrote info, warnings, and errors.
	public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

	private static void sendHit(HttpClient httpClient) {
		// eventually load config from file
		SparklerConfig cfg = new SparklerConfig(9648, "secret");

		URI uri = URI.create("http://localhost:" + cfg.PORT + "/hit?secret=" + cfg.CLIENT_SECRET);

		HttpRequest req = HttpRequest.newBuilder()
				.uri(uri)
				.POST(BodyPublishers.noBody())
				.build();

		CompletableFuture<HttpResponse<Void>> futureRes = httpClient.sendAsync(req,
				HttpResponse.BodyHandlers.discarding());

		futureRes.thenAccept((res) -> {
			int status = res.statusCode();
			if (status == 200) {
				LOGGER.info("Successfully sent hit!");
			} else {
				LOGGER.warn("Tried to send hit, but got error code: " + status);
			}
		});
	}

	@Override
	public void onInitializeClient() {
		// This entrypoint is suitable for setting up client-specific logic, such as
		// rendering.

		UUID uuid = Minecraft.getInstance().getGameProfile().id();

		LOGGER.info("Found player uuid: " + uuid);

		HttpClient httpClient = HttpClient.newHttpClient();

		ClientCommandRegistrationCallback.EVENT.register((dispatcher, registryAccess) -> {
			dispatcher.register(
					ClientCommandManager.literal("sparkle").executes(ctx -> {
						LOGGER.info("Called /sparkle");
						sendHit(httpClient);
						return 1;
					}));
		});

		PlayerHurtCallback.EVENT.register((player) -> {
			if (uuid.compareTo(player.getUUID()) == 0) {
				LOGGER.trace("player hurt!");
				sendHit(httpClient);
			}
		});
	}
}
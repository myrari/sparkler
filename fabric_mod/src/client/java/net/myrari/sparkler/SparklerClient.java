package net.myrari.sparkler;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpRequest.BodyPublishers;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.mojang.brigadier.context.CommandContext;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandManager;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.fabricmc.fabric.api.client.command.v2.FabricClientCommandSource;
import net.minecraft.network.chat.Component;

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

	private static int sendHit(CommandContext<FabricClientCommandSource> ctx, HttpClient httpClient) {
		LOGGER.info("Called /sparkle");

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
				ctx.getSource().sendFeedback(Component.literal("Sent hit!"));
			} else {
				LOGGER.warn("Tried to send hit, but got error code: " + status);
				ctx.getSource().sendFeedback(Component.literal("COULD NOT SEND HIT: " + status));
			}
		});

		return 1;
	}

	@Override
	public void onInitializeClient() {
		// This entrypoint is suitable for setting up client-specific logic, such as
		// rendering.

		HttpClient httpClient = HttpClient.newHttpClient();

		ClientCommandRegistrationCallback.EVENT.register((dispatcher, registryAccess) -> {
			dispatcher.register(
					ClientCommandManager.literal("sparkle").executes(ctx -> sendHit(ctx, httpClient)));
		});
	}
}
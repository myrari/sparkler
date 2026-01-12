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

import com.mojang.serialization.Codec;
import com.mojang.serialization.codecs.RecordCodecBuilder;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandManager;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.minecraft.client.Minecraft;

class SparklerConfig {
	private final int port;
	private final String client_secret;

	public static final Codec<SparklerConfig> CODEC = RecordCodecBuilder.create(instance -> instance.group(
			Codec.INT.fieldOf("port").forGetter(SparklerConfig::getPort),
			Codec.STRING.fieldOf("client_secret").forGetter(SparklerConfig::getClientSecret))
			.apply(instance, SparklerConfig::new));

	public SparklerConfig(int port, String secret) {
		this.port = port;
		this.client_secret = secret;
	}

	public int getPort() {
		return this.port;
	}

	public String getClientSecret() {
		return this.client_secret;
	}
}

public class SparklerClient implements ClientModInitializer {
	public static final String MOD_ID = "sparkler";

	public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

	private static void sendHit(HttpClient httpClient, UUID uuid, float dmg, float to) {
		// eventually load config from file
		SparklerConfig cfg = new SparklerConfig(9648, "secret");

		URI uri = URI.create("http://localhost:" + cfg.getPort() + "/hit?secret=" + cfg.getClientSecret());

		String bodyString = "{\"dmg\": \"" + dmg + "\", \"to\": \"" + to + "\", \"id\": \"" + uuid + "\"}";

		LOGGER.info("body: " + bodyString);

		HttpRequest req = HttpRequest.newBuilder()
				.uri(uri)
				.header("Content-Type", "application/json")
				.POST(BodyPublishers.ofString(bodyString))
				.build();

		CompletableFuture<HttpResponse<String>> futureRes = httpClient.sendAsync(req,
				HttpResponse.BodyHandlers.ofString());

		futureRes.thenAccept((res) -> {
			int status = res.statusCode();
			if (status == 200) {
				LOGGER.info("Successfully sent hit for " + dmg);
			} else {
				LOGGER.warn("Tried to send hit, but got error code: " + status);
			}
		});
	}

	@Override
	public void onInitializeClient() {
		UUID uuid = Minecraft.getInstance().getGameProfile().id();

		LOGGER.info("Found player uuid: " + uuid);

		HttpClient httpClient = HttpClient.newHttpClient();

		ClientCommandRegistrationCallback.EVENT.register((dispatcher, registryAccess) -> {
			dispatcher.register(
					ClientCommandManager.literal("sparkle").executes(ctx -> {
						LOGGER.info("Called /sparkle");
						sendHit(httpClient, uuid, 1.0f, 0.0f);
						return 1;
					}));
		});

		PlayerHurtCallback.EVENT.register((player, dmg, to) -> {
			if (uuid.compareTo(player.getUUID()) == 0) {
				LOGGER.debug("player hurt for " + dmg);
				sendHit(httpClient, uuid, dmg, to);
			}
		});
	}
}
package net.myrari.sparkler;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpRequest.BodyPublishers;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.github.xaviercanadas.randomwordslugs.generator.SlugGenerator;
import com.mojang.serialization.Codec;
import com.mojang.serialization.codecs.RecordCodecBuilder;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandManager;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.minecraft.client.Minecraft;
import net.minecraft.network.chat.Component;

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

	private static void sendHit(HttpClient httpClient, String host, String secret, UUID uuid, float dmg, float to) {
		URI uri = URI.create(host + "/hit?secret=" + secret);

		String bodyString = "{\"dmg\": \"" + dmg + "\", \"to\": \"" + to + "\", \"id\": \"" + uuid + "\"}";

		LOGGER.info("body: " + bodyString);

		HttpRequest req = HttpRequest.newBuilder()
				.uri(uri)
				.header("Content-Type", "application/json")
				.POST(BodyPublishers.ofString(bodyString))
				.build();

		var futureRes = httpClient.sendAsync(req, HttpResponse.BodyHandlers.ofString());

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
		final String HOST = "https://sparkler.myrari.net";

		UUID uuid = Minecraft.getInstance().getGameProfile().id();

		LOGGER.debug("Found player uuid: " + uuid);

		var slugGen = new SlugGenerator();
		String secret = slugGen.generate(4);
		LOGGER.info("session secret: " + secret);

		HttpClient httpClient = HttpClient.newHttpClient();

		ClientCommandRegistrationCallback.EVENT.register((dispatcher, registryAccess) -> {
			dispatcher.register(
					ClientCommandManager.literal("sparkle").executes(ctx -> {
						LOGGER.debug("Called /sparkle");
						ctx.getSource().sendFeedback(Component.literal("Here's your client secret:"));
						ctx.getSource().sendFeedback(Component.literal("§a" + secret + "§r"));
						ctx.getSource().sendFeedback(Component.literal("Authenticate with it at: " + HOST));
						return 1;
					}));
		});

		PlayerHurtCallback.EVENT.register((player, dmg, to) -> {
			if (uuid.compareTo(player.getUUID()) == 0) {
				LOGGER.debug("player hurt for " + dmg);
				sendHit(httpClient, HOST, secret, uuid, dmg, to);
			}
		});
	}
}
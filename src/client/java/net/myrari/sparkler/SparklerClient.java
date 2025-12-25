package net.myrari.sparkler;

import java.net.http.HttpClient;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.mojang.brigadier.context.CommandContext;

import net.fabricmc.api.ClientModInitializer;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandManager;
import net.fabricmc.fabric.api.client.command.v2.ClientCommandRegistrationCallback;
import net.fabricmc.fabric.api.client.command.v2.FabricClientCommandSource;
import net.minecraft.network.chat.Component;

class SparklerConfig {

}

public class SparklerClient implements ClientModInitializer {
	public static final String MOD_ID = "sparkler";

	// This logger is used to write text to the console and the log file.
	// It is considered best practice to use your mod id as the logger's name.
	// That way, it's clear which mod wrote info, warnings, and errors.
	public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

	private static int executeSparkleCmd(CommandContext<FabricClientCommandSource> ctx, HttpClient httpClient) {
		LOGGER.info("Called /sparkle!");
		ctx.getSource().sendFeedback(Component.literal("Called /sparkle"));
		return 1;
	}

	@Override
	public void onInitializeClient() {
		// This entrypoint is suitable for setting up client-specific logic, such as
		// rendering.

		HttpClient httpClient = HttpClient.newHttpClient();

		ClientCommandRegistrationCallback.EVENT.register((dispatcher, registryAccess) -> {
			dispatcher.register(ClientCommandManager.literal("sparkle").executes(ctx -> executeSparkleCmd(ctx, httpClient)));
		});
	}
}
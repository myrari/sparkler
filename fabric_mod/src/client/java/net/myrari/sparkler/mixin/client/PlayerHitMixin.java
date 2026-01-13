package net.myrari.sparkler.mixin.client;

import net.minecraft.client.gui.Gui;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.util.Mth;
import net.minecraft.world.entity.player.Player;
import net.myrari.sparkler.PlayerHurtCallback;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

/** 
 * Mixin for detecting when the client player loses health
 */
@Mixin(Gui.class)
abstract public class PlayerHitMixin {
	@Shadow
	private int lastHealth;

	@Shadow
	private Player getCameraPlayer() {
		throw new AssertionError();
	}

	@Inject(method = "renderPlayerHealth", at = @At(value = "HEAD"))
	private void onRenderPlayerHealth(GuiGraphics guiGraphics, CallbackInfo ci) {
		Player player = this.getCameraPlayer();
		if (player != null) {
			int currentHealth = Mth.ceil(player.getHealth());
			int dmg = this.lastHealth - currentHealth;
			if (dmg > 0) {
				PlayerHurtCallback.EVENT.invoker().hurt(player, dmg, currentHealth);
			}
		}
	}
}
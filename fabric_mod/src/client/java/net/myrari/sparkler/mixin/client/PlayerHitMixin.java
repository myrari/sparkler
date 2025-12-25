package net.myrari.sparkler.mixin.client;

import net.minecraft.client.player.LocalPlayer;
import net.myrari.sparkler.PlayerHurtCallback;

import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfo;

@Mixin(LocalPlayer.class)
public class PlayerHitMixin {
	@Inject(at = @At("HEAD"), method = "hurtTo")
	private void hurtTo(float f, CallbackInfo ci) {
		LocalPlayer pl = (LocalPlayer) (Object) this;
		if (f < pl.getHealth()) {
			PlayerHurtCallback.EVENT.invoker().hurt(pl);
		}
	}
}
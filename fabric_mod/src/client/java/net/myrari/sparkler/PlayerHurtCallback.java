package net.myrari.sparkler;

import net.fabricmc.fabric.api.event.Event;
import net.fabricmc.fabric.api.event.EventFactory;
import net.minecraft.client.player.LocalPlayer;

/**
 * Callback for when a LocalPlayer is hurt.
 */
public interface PlayerHurtCallback {
    Event<PlayerHurtCallback> EVENT = EventFactory.createArrayBacked(PlayerHurtCallback.class,
            (listeners) -> (player) -> {
                for (PlayerHurtCallback listener : listeners) {
                    listener.hurt(player);
                }
            });

    void hurt(LocalPlayer player);
}

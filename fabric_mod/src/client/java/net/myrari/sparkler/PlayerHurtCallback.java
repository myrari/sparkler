package net.myrari.sparkler;

import net.fabricmc.fabric.api.event.Event;
import net.fabricmc.fabric.api.event.EventFactory;
import net.minecraft.world.entity.player.Player;

/**
 * Callback for when a Player is hurt.
 */
public interface PlayerHurtCallback {
    Event<PlayerHurtCallback> EVENT = EventFactory.createArrayBacked(PlayerHurtCallback.class,
            (listeners) -> (player, dmg, to) -> {
                for (PlayerHurtCallback listener : listeners) {
                    listener.hurt(player, dmg, to);
                }
            });

    void hurt(Player player, float dmg, float to);
}

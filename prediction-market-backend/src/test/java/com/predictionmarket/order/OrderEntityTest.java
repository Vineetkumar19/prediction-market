package com.predictionmarket.order;

import com.predictionmarket.common.Enums.OrderStatus;
import com.predictionmarket.common.Enums.Side;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * The share-count and locked-token invariants that everything else depends on.
 *
 * The last test is the important one: after a refund and a settlement, an
 * order must have released exactly what it took and not a token more or less.
 * That is what stops the 10% charge being stranded in `locked` forever.
 */
class OrderEntityTest {

    /** 10 shares at 50 = 500 base + 50 charge = 550 debit. */
    private OrderEntity newOrder() {
        return new OrderEntity(1L, 1L, Side.YES, 10, 50, 500, 50, 550);
    }

    @Test
    @DisplayName("a new order is fully unmatched and fully locked")
    void freshOrder() {
        OrderEntity order = newOrder();

        assertEquals(10, order.getRequestedShares());
        assertEquals(0, order.getMatchedShares());
        assertEquals(10, order.getRemainingShares());
        assertEquals(550, order.stillLocked());
        assertEquals(OrderStatus.PENDING, order.getStatus());
    }

    @Test
    @DisplayName("a partial fill moves shares and sets PARTIALLY_MATCHED")
    void partialFill() {
        OrderEntity order = newOrder();
        order.fill(4);
        order.refreshStatus();

        assertEquals(4, order.getMatchedShares());
        assertEquals(6, order.getRemainingShares());
        assertEquals(OrderStatus.PARTIALLY_MATCHED, order.getStatus());
    }

    @Test
    @DisplayName("filling everything sets FULLY_MATCHED")
    void fullFill() {
        OrderEntity order = newOrder();
        order.fill(10);
        order.refreshStatus();

        assertEquals(0, order.getRemainingShares());
        assertEquals(OrderStatus.FULLY_MATCHED, order.getStatus());
    }

    @Test
    @DisplayName("an order can never be filled beyond what is remaining")
    void overFillRejected() {
        OrderEntity order = newOrder();
        order.fill(7);

        assertThrows(IllegalArgumentException.class, () -> order.fill(4));
    }

    @Test
    @DisplayName("refund then settlement release exactly the total debit, never more")
    void lockedBucketAlwaysEmptiesExactly() {
        OrderEntity order = newOrder();

        // 6 of 10 shares matched, 4 left over at the deadline.
        order.fill(6);
        order.refreshStatus();

        // Refund the 4 unmatched: 4 x 50 = 200 base, 20 charge, 220 back.
        long refund = 220;
        order.recordRelease(refund);
        order.clearRemaining();

        assertEquals(330, order.stillLocked(), "the 6 matched shares plus their charge stay locked");

        // Settlement releases whatever is left - stake AND its charge.
        long releasedAtSettlement = order.stillLocked();
        order.recordRelease(releasedAtSettlement);

        assertEquals(0, order.stillLocked(), "nothing may be left stranded in locked");
        assertEquals(550, refund + releasedAtSettlement, "released total equals the original debit");
    }
}

package com.predictionmarket.common;

import com.predictionmarket.common.Enums.Side;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The money maths, checked against the charge table in spec section 3 and the
 * point-settlement rule.
 *
 * These run with no database and no Spring context - `mvn test` executes them
 * in a second or two.
 */
class BusinessRulesTest {

    private final BusinessRules rules = new BusinessRules(0.10);

    @Test
    @DisplayName("spec section 3: the charge table")
    void chargeTable() {
        // shares, base, charge, total  - straight from the spec at 50/share
        assertRow(1, 50, 5, 55);
        assertRow(2, 100, 10, 110);
        assertRow(5, 250, 25, 275);
        assertRow(10, 500, 50, 550);
        assertRow(20, 1000, 100, 1100);
        assertRow(100, 5000, 500, 5500);
    }

    private void assertRow(int shares, long base, long charge, long total) {
        assertEquals(base, rules.baseAmount(50, shares), "base for " + shares + " shares");
        assertEquals(charge, rules.charge(base), "charge for " + shares + " shares");
        assertEquals(total, rules.totalDebit(50, shares), "total for " + shares + " shares");
    }

    @Test
    @DisplayName("the worked example: priced at 50, settles at 70, BUY is +20 and SELL is -20")
    void theWorkedExample() {
        long price = 50;
        long finalValue = 70;

        assertEquals(70, rules.settlementReturn(Side.YES, price, 1, finalValue), "BUY gets 70 back");
        assertEquals(30, rules.settlementReturn(Side.NO, price, 1, finalValue), "SELL gets 30 back");

        assertEquals(20, rules.pnl(Side.YES, price, 1, finalValue), "BUY is +20");
        assertEquals(-20, rules.pnl(Side.NO, price, 1, finalValue), "SELL is -20");
    }

    @Test
    @DisplayName("the mirror case: the same question settling at 30 flips the signs exactly")
    void theMirrorCase() {
        assertEquals(-20, rules.pnl(Side.YES, 50, 1, 30), "BUY is -20");
        assertEquals(20, rules.pnl(Side.NO, 50, 1, 30), "SELL is +20");
    }

    @Test
    @DisplayName("landing exactly on the price is a draw, not a win for either side")
    void exactlyOnTheLineIsFlat() {
        assertEquals(0, rules.pnl(Side.YES, 50, 4, 50));
        assertEquals(0, rules.pnl(Side.NO, 50, 4, 50));
        assertEquals(200, rules.settlementReturn(Side.YES, 50, 4, 50), "stake comes straight back");
        assertEquals(200, rules.settlementReturn(Side.NO, 50, 4, 50));
    }

    @Test
    @DisplayName("P&L scales with the number of matched shares")
    void scalesWithShares() {
        assertEquals(200, rules.pnl(Side.YES, 50, 10, 70), "10 shares at +20 each");
        assertEquals(-200, rules.pnl(Side.NO, 50, 10, 70));
    }

    @Test
    @DisplayName("nobody can lose more than they staked, however extreme the final value")
    void theCollateralCapHolds() {
        long price = 50;

        // A player scoring 300 on a question priced at 50 pays out the same as
        // a player scoring 100: there is no more collateral behind the SELL.
        assertEquals(100, rules.settlementReturn(Side.YES, price, 1, 300), "BUY is capped at 2x price");
        assertEquals(0, rules.settlementReturn(Side.NO, price, 1, 300), "SELL cannot go below zero");
        assertEquals(50, rules.pnl(Side.YES, price, 1, 300), "max profit is one share price");
        assertEquals(-50, rules.pnl(Side.NO, price, 1, 300), "max loss is one share price");

        // And the same at the other end.
        assertEquals(0, rules.settlementReturn(Side.YES, price, 1, 0));
        assertEquals(100, rules.settlementReturn(Side.NO, price, 1, 0));
        assertEquals(100, rules.maxSettlementValue(price));
    }

    @Test
    @DisplayName("a matched pair always returns exactly what the pair staked")
    void everyPairIsZeroSum() {
        long price = 50;
        int shares = 3;

        // Sweep every final value from well below the line to well above it.
        for (long finalValue = 0; finalValue <= 200; finalValue += 7) {
            long buy = rules.settlementReturn(Side.YES, price, shares, finalValue);
            long sell = rules.settlementReturn(Side.NO, price, shares, finalValue);
            long staked = rules.baseAmount(price, shares) * 2;

            assertEquals(staked, buy + sell,
                    "pair must return exactly its combined stake at final value " + finalValue);
            assertEquals(0, rules.pnl(Side.YES, price, shares, finalValue)
                            + rules.pnl(Side.NO, price, shares, finalValue),
                    "one side's profit is the other's loss at final value " + finalValue);
            assertTrue(buy >= 0 && sell >= 0, "no return may be negative");
        }
    }

    @Test
    @DisplayName("the only tokens that disappear are the two 10% charges")
    void tokenConservation() {
        long price = 50;
        int shares = 2;
        long finalValue = 65;

        long paidTotal = rules.totalDebit(price, shares) * 2;                        // 110 + 110
        long returnedTotal = rules.settlementReturn(Side.YES, price, shares, finalValue)
                + rules.settlementReturn(Side.NO, price, shares, finalValue);        // 200

        long keptBySystem = paidTotal - returnedTotal;

        assertEquals(220, paidTotal);
        assertEquals(200, returnedTotal);
        assertEquals(20, keptBySystem, "the simulation keeps exactly both 10% charges");
        assertEquals(rules.charge(rules.baseAmount(price, shares)) * 2, keptBySystem);
    }

    @Test
    @DisplayName("partial refund: 5 unmatched shares at 50 come back as 275")
    void unmatchedRefund() {
        // spec section 11 worked example
        long unmatchedBase = rules.baseAmount(50, 5);
        long unmatchedCharge = rules.charge(unmatchedBase);

        assertEquals(250, unmatchedBase);
        assertEquals(25, unmatchedCharge);
        assertEquals(275, unmatchedBase + unmatchedCharge);
    }

    @Test
    @DisplayName("the charge rounds to whole tokens, matching the frontend's Math.round")
    void roundingMatchesFrontend() {
        // 25 tokens/share x 3 shares = 75 -> 7.5 -> rounds to 8
        assertEquals(8, rules.charge(rules.baseAmount(25, 3)));
        // 15 x 1 = 15 -> 1.5 -> rounds to 2
        assertEquals(2, rules.charge(rules.baseAmount(15, 1)));
    }
}

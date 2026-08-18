package com.predictionmarket.common;

import com.predictionmarket.common.Enums.Side;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * The money maths, in one place.
 *
 * THE MODEL: a share behaves like a share, not like a bet.
 * ------------------------------------------------------------------
 * The share price is also the line. A question priced at 50 tokens is asking
 * "will this player score more than 50?". After the match the admin declares
 * what actually happened - say 70 - and every share is simply revalued to that
 * number.
 *
 *   BUY  bought at 50, now worth 70  ->  +20 per share
 *   SELL sold   at 50, now worth 70  ->  -20 per share
 *
 * Nobody's stake is wiped out and nobody's stake is doubled. The two sides
 * exchange exactly the difference between the price and the final value.
 *
 * THE CAP, AND WHY IT HAS TO EXIST
 * ------------------------------------------------------------------
 * Each side only ever puts up `sharePrice` per share as collateral, so that is
 * the most either side can possibly lose. The BUY side's return is therefore
 * clamped into [0, 2 x sharePrice]:
 *
 *   final value 0 or below      BUY gets 0,   SELL gets 100   (max swing)
 *   final value 30              BUY gets 30,  SELL gets 70
 *   final value 50 (= price)    BUY gets 50,  SELL gets 50    (flat)
 *   final value 70              BUY gets 70,  SELL gets 30
 *   final value 100 or above    BUY gets 100, SELL gets 0     (max swing)
 *
 * So on a 50-token share the most anyone can win or lose is 50 per share. A
 * player scoring 300 on a question priced at 50 pays out the same as a player
 * scoring 100 - there is no more collateral behind it to pay from. Both screens
 * that matter (the entry modal and the resolve dialog) say this out loud rather
 * than surprising anyone at settlement.
 *
 * The pair always returns exactly 2 x sharePrice per matched share, which is
 * exactly what the two sides staked. That is what keeps tokens conserved: the
 * only tokens that ever disappear are the two 10% charges.
 *
 * Tokens are whole numbers everywhere. There is no floating point in any
 * balance - only in this class, and only for the rounding step on the charge.
 */
@Component
public class BusinessRules {

    private final double chargeRate;

    public BusinessRules(@Value("${app.charge-rate:0.10}") double chargeRate) {
        this.chargeRate = chargeRate;
    }

    public double chargeRate() {
        return chargeRate;
    }

    /** sharePrice x shares. */
    public long baseAmount(long sharePrice, int shares) {
        return sharePrice * shares;
    }

    /**
     * The 10% simulated charge, rounded to a whole token.
     * Math.round matches the frontend's Math.round so the number the user was
     * shown before confirming is the number they are actually charged.
     */
    public long charge(long baseAmount) {
        return Math.round(baseAmount * chargeRate);
    }

    public long totalDebit(long sharePrice, int shares) {
        long base = baseAmount(sharePrice, shares);
        return base + charge(base);
    }

    /**
     * The most a single share can be worth at settlement: both sides' collateral.
     * Also the point at which the BUY side stops gaining.
     */
    public long maxSettlementValue(long sharePrice) {
        return sharePrice * 2;
    }

    /**
     * What ONE bought share is worth once the admin declares `finalValue`,
     * clamped to the collateral standing behind it.
     */
    public long buyValuePerShare(long sharePrice, long finalValue) {
        long cap = maxSettlementValue(sharePrice);
        if (finalValue <= 0) {
            return 0;
        }
        return Math.min(finalValue, cap);
    }

    /** What ONE sold share is worth. Always the mirror image of the bought one. */
    public long sellValuePerShare(long sharePrice, long finalValue) {
        return maxSettlementValue(sharePrice) - buyValuePerShare(sharePrice, finalValue);
    }

    /**
     * Total tokens returned to one position at settlement.
     *
     * This is a RETURN, not a profit: it already contains the player's own
     * stake. Profit or loss is this minus what they staked - see {@link #pnl}.
     */
    public long settlementReturn(Side side, long sharePrice, int matchedShares, long finalValue) {
        long perShare = side == Side.YES
                ? buyValuePerShare(sharePrice, finalValue)
                : sellValuePerShare(sharePrice, finalValue);
        return perShare * matchedShares;
    }

    /**
     * Profit (positive) or loss (negative) on the matched shares.
     *
     * Deliberately excludes the 10% charge: the charge is a cost of entry, not
     * part of the position's performance, and showing it inside the P&L would
     * make a flat result look like a loss.
     */
    public long pnl(Side side, long sharePrice, int matchedShares, long finalValue) {
        return settlementReturn(side, sharePrice, matchedShares, finalValue)
                - baseAmount(sharePrice, matchedShares);
    }
}

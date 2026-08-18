package com.predictionmarket.order;

import com.predictionmarket.common.Enums.ContestStatus;
import com.predictionmarket.common.Enums.Role;
import com.predictionmarket.common.Enums.Side;
import com.predictionmarket.contest.Contest;
import com.predictionmarket.contest.ContestRepository;
import com.predictionmarket.dto.OrderDtos.PlaceOrderRequest;
import com.predictionmarket.event.EventEntity;
import com.predictionmarket.event.EventRepository;
import com.predictionmarket.settlement.SettlementService;
import com.predictionmarket.user.User;
import com.predictionmarket.user.UserRepository;
import com.predictionmarket.wallet.Wallet;
import com.predictionmarket.wallet.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The concurrency tests. These are the ones worth running.
 *
 * HOW TO RUN
 * ----------
 * These need a real MySQL, and they wipe the schema they use, so they point at
 * a SEPARATE database. Create it once:
 *
 *     CREATE DATABASE prediction_market_test
 *         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
 *
 * then:
 *
 *     mvn test -Dtest=OrderConcurrencyIT
 *
 * (Adjust the username and password in @TestPropertySource below if yours are
 * not root/root.)
 *
 * WHAT THEY PROVE
 * ---------------
 * 1. lostUpdateIsImpossible   - 20 threads try to spend the same balance at the
 *                               same moment. Exactly as many succeed as the
 *                               wallet can afford, and the balance never goes
 *                               negative. This is what the wallet row lock is for.
 * 2. noDoubleMatching         - 20 opposing orders land simultaneously on one
 *                               question. Matched YES shares always equal matched
 *                               NO shares and never exceed what was offered.
 *                               This is what the contest row lock is for.
 * 3. settlementIsIdempotent   - 8 threads settle the same question at once.
 *                               Exactly one wins, everyone is paid once.
 */
@SpringBootTest
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:mysql://localhost:3306/prediction_market_test?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC&createDatabaseIfNotExist=true",
        "spring.datasource.username=root",
        "spring.datasource.password=root",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "app.seed.enabled=false",
        "app.deadline-job.enabled=false"
})
class OrderConcurrencyIT {

    @Autowired private UserRepository userRepository;
    @Autowired private WalletRepository walletRepository;
    @Autowired private EventRepository eventRepository;
    @Autowired private ContestRepository contestRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private OrderService orderService;
    @Autowired private SettlementService settlementService;
    @Autowired private PasswordEncoder passwordEncoder;

    private Contest contest;

    @BeforeEach
    void setUp() {
        orderRepository.deleteAll();
        contestRepository.deleteAll();
        eventRepository.deleteAll();
        walletRepository.deleteAll();
        userRepository.deleteAll();

        EventEntity event = eventRepository.save(new EventEntity("Test event", "concurrency", ""));
        contest = contestRepository.save(new Contest(
                event.getId(), "Test question", "How many runs will the opener score?", "", 100,
                Instant.now(), Instant.now().plus(6, ChronoUnit.HOURS),
                Instant.now().plus(12, ChronoUnit.HOURS), ContestStatus.OPEN));
    }

    private User player(String userId, long tokens) {
        User user = userRepository.save(
                new User(userId, userId, passwordEncoder.encode("password"), Role.USER));
        Wallet wallet = new Wallet(user.getId());
        wallet.credit(tokens);
        walletRepository.save(wallet);
        return user;
    }

    /** Runs `count` tasks at the same instant and returns how many succeeded. */
    private int race(int count, java.util.function.IntConsumer task) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(count);
        CountDownLatch startGun = new CountDownLatch(1);
        CountDownLatch finished = new CountDownLatch(count);
        AtomicInteger succeeded = new AtomicInteger();

        for (int i = 0; i < count; i++) {
            final int index = i;
            pool.submit(() -> {
                try {
                    startGun.await();
                    task.accept(index);
                    succeeded.incrementAndGet();
                } catch (Exception expected) {
                    // Rejections are the point of the test - insufficient
                    // balance, already settled, and so on.
                } finally {
                    finished.countDown();
                }
            });
        }

        startGun.countDown();
        assertTrue(finished.await(60, TimeUnit.SECONDS), "threads did not finish in time");
        pool.shutdownNow();
        return succeeded.get();
    }

    @Test
    @DisplayName("20 simultaneous orders cannot spend the same tokens twice")
    void lostUpdateIsImpossible() throws Exception {
        // Enough for exactly 5 entries of 1 share (110 each) and no more.
        User user = player("racer", 550);

        int succeeded = race(20, i ->
                orderService.place(user.getId(), new PlaceOrderRequest(contest.getId(), Side.YES, 1)));

        Wallet wallet = walletRepository.findByUserId(user.getId()).orElseThrow();

        assertEquals(5, succeeded, "exactly 5 of the 20 attempts should be affordable");
        assertEquals(0, wallet.getAvailable(), "every affordable token should be committed");
        assertEquals(550, wallet.getLocked());
        assertTrue(wallet.getAvailable() >= 0, "a balance must never go negative");
        assertEquals(5, orderRepository.findByContestId(contest.getId()).size());
    }

    @Test
    @DisplayName("simultaneous opposing orders never double-match")
    void noDoubleMatching() throws Exception {
        List<User> buyers = new ArrayList<>();
        List<User> sellers = new ArrayList<>();
        for (int i = 0; i < 10; i++) {
            buyers.add(player("buyer" + i, 100_000));
            sellers.add(player("seller" + i, 100_000));
        }

        // 10 BUY of 3 shares and 10 SELL of 3 shares, all at once.
        race(20, i -> {
            if (i % 2 == 0) {
                orderService.place(buyers.get(i / 2).getId(),
                        new PlaceOrderRequest(contest.getId(), Side.YES, 3));
            } else {
                orderService.place(sellers.get(i / 2).getId(),
                        new PlaceOrderRequest(contest.getId(), Side.NO, 3));
            }
        });

        List<OrderEntity> orders = orderRepository.findByContestId(contest.getId());
        int matchedYes = orders.stream().filter(o -> o.getSide() == Side.YES)
                .mapToInt(OrderEntity::getMatchedShares).sum();
        int matchedNo = orders.stream().filter(o -> o.getSide() == Side.NO)
                .mapToInt(OrderEntity::getMatchedShares).sum();

        assertEquals(matchedYes, matchedNo, "matched shares must balance on both sides");
        assertEquals(30, matchedYes, "all 30 shares on each side should have found an opponent");

        for (OrderEntity order : orders) {
            assertEquals(order.getRequestedShares(),
                    order.getMatchedShares() + order.getRemainingShares(),
                    "share counts must always add up on order " + order.getId());
            assertTrue(order.getMatchedShares() <= order.getRequestedShares(),
                    "an order matched more than it asked for");
        }
    }

    @Test
    @DisplayName("eight simultaneous settle requests pay out exactly once")
    void settlementIsIdempotent() throws Exception {
        User buyer = player("winner", 100_000);
        User seller = player("loser", 100_000);

        orderService.place(buyer.getId(), new PlaceOrderRequest(contest.getId(), Side.YES, 5));
        orderService.place(seller.getId(), new PlaceOrderRequest(contest.getId(), Side.NO, 5));

        // Priced at 100, settles at 150: BUY is +50/share, SELL is -50/share.
        int succeeded = race(8, i -> settlementService.settle(contest.getId(), 150, "test"));
        assertEquals(1, succeeded, "only one settle should be allowed to run");

        Wallet gained = walletRepository.findByUserId(buyer.getId()).orElseThrow();
        Wallet lost = walletRepository.findByUserId(seller.getId()).orElseThrow();

        // 5 shares at 100: each paid 550 (500 stake + 50 charge).
        // BUY  gets 5 x 150 = 750 back  -> +250 on the position
        // SELL gets 5 x  50 = 250 back  -> -250 on the position
        assertEquals(100_000 - 550 + 750, gained.getAvailable(), "BUY paid out exactly once");
        assertEquals(100_000 - 550 + 250, lost.getAvailable(), "SELL paid out exactly once");
        assertEquals(0, gained.getLocked(), "nothing may be stranded in locked");
        assertEquals(0, lost.getLocked());

        // And a ninth attempt, run on its own, still refuses.
        assertThrows(Exception.class,
                () -> settlementService.settle(contest.getId(), 150, "test"));
    }

    @Test
    @DisplayName("tokens are conserved across a full match and settlement")
    void tokensAreConserved() throws Exception {
        User buyer = player("conserve-buyer", 10_000);
        User seller = player("conserve-seller", 10_000);

        long startTotal = total(buyer) + total(seller);

        orderService.place(buyer.getId(), new PlaceOrderRequest(contest.getId(), Side.YES, 4));
        orderService.place(seller.getId(), new PlaceOrderRequest(contest.getId(), Side.NO, 4));
        // An awkward, off-centre final value on purpose - conservation must not
        // depend on the number landing anywhere convenient.
        settlementService.settle(contest.getId(), 83, "test");

        long endTotal = total(buyer) + total(seller);

        // 4 shares at 100: charge is 40 per side, so the simulation keeps 80.
        assertEquals(80, startTotal - endTotal,
                "the only tokens that may disappear are the two 10% charges");
        assertEquals(0, walletRepository.findByUserId(buyer.getId()).orElseThrow().getLocked());
        assertEquals(0, walletRepository.findByUserId(seller.getId()).orElseThrow().getLocked());
    }

    @Test
    @DisplayName("settling above the cap still pays out only the collateral that exists")
    void extremeValueCannotOverdrawTheOtherSide() throws Exception {
        User buyer = player("cap-buyer", 10_000);
        User seller = player("cap-seller", 10_000);

        long startTotal = total(buyer) + total(seller);

        orderService.place(buyer.getId(), new PlaceOrderRequest(contest.getId(), Side.YES, 2));
        orderService.place(seller.getId(), new PlaceOrderRequest(contest.getId(), Side.NO, 2));

        // Priced at 100, declared at 10_000. The BUY side cannot be paid more
        // than the 200 the SELL side actually staked.
        settlementService.settle(contest.getId(), 10_000, "test");

        Wallet b = walletRepository.findByUserId(buyer.getId()).orElseThrow();
        Wallet s = walletRepository.findByUserId(seller.getId()).orElseThrow();

        assertEquals(10_000 - 220 + 400, b.getAvailable(), "BUY receives both stakes and no more");
        assertEquals(10_000 - 220, s.getAvailable(), "SELL loses its stake and no more");
        assertTrue(s.getAvailable() >= 0, "a balance must never go negative");
        assertEquals(0, b.getLocked());
        assertEquals(0, s.getLocked());
        assertEquals(40, startTotal - (total(buyer) + total(seller)),
                "still only the two 10% charges disappear");
    }

    private long total(User user) {
        Wallet w = walletRepository.findByUserId(user.getId()).orElseThrow();
        return w.getAvailable() + w.getLocked();
    }
}

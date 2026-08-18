package com.predictionmarket.common;

import com.predictionmarket.common.Enums.ContestStatus;
import com.predictionmarket.common.Enums.Role;
import com.predictionmarket.common.Enums.TxType;
import com.predictionmarket.contest.Contest;
import com.predictionmarket.contest.ContestRepository;
import com.predictionmarket.event.EventEntity;
import com.predictionmarket.event.EventRepository;
import com.predictionmarket.user.User;
import com.predictionmarket.user.UserRepository;
import com.predictionmarket.wallet.Wallet;
import com.predictionmarket.wallet.WalletRepository;
import com.predictionmarket.wallet.WalletTransaction;
import com.predictionmarket.wallet.WalletTransactionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Puts something in the database on a completely fresh install so the app is
 * usable the moment it starts: an admin account, three players, and a couple of
 * events with questions.
 *
 * It only ever runs when the users table is empty, so restarting the server
 * never touches real data. Turn it off entirely with app.seed.enabled=false in
 * application.properties once you have your own accounts.
 *
 * CHANGE THE ADMIN PASSWORD before anyone else can reach this server.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final WalletTransactionRepository transactionRepository;
    private final EventRepository eventRepository;
    private final ContestRepository contestRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean enabled;

    public DataSeeder(UserRepository userRepository,
                      WalletRepository walletRepository,
                      WalletTransactionRepository transactionRepository,
                      EventRepository eventRepository,
                      ContestRepository contestRepository,
                      PasswordEncoder passwordEncoder,
                      @Value("${app.seed.enabled:true}") boolean enabled) {
        this.userRepository = userRepository;
        this.walletRepository = walletRepository;
        this.transactionRepository = transactionRepository;
        this.eventRepository = eventRepository;
        this.contestRepository = contestRepository;
        this.passwordEncoder = passwordEncoder;
        this.enabled = enabled;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled || userRepository.count() > 0) {
            return;
        }

        log.info("Empty database detected - seeding demo accounts and sample events");

        createUser("admin", "Admin", "admin123", Role.ADMIN, 100_000);
        createUser("demo", "Demo Player", "demo123", Role.USER, 10_000);
        createUser("rahul", "Rahul", "rahul123", Role.USER, 10_000);
        createUser("aisha", "Aisha", "aisha123", Role.USER, 10_000);

        Instant now = Instant.now();

        // Cricket only. Every question asks for a NUMBER, and the share price is
        // that number - a question priced at 50 is asking "more or less than 50
        // runs?". Keep new seed questions in that shape or the settlement maths
        // has nothing sensible to revalue against.
        EventEntity indPak = eventRepository.save(new EventEntity(
                "India vs Pakistan", "T20 World Cup - Super 4", ""));
        EventEntity engAus = eventRepository.save(new EventEntity(
                "England vs Australia", "Third ODI", ""));

        contestRepository.save(new Contest(indPak.getId(),
                "Virat Kohli runs",
                "How many runs will Virat Kohli score?",
                "", 45,
                now, now.plus(6, ChronoUnit.HOURS), now.plus(12, ChronoUnit.HOURS),
                ContestStatus.OPEN));

        contestRepository.save(new Contest(indPak.getId(),
                "Opening partnership runs",
                "How many runs will the opening partnership add?",
                "", 60,
                now, now.plus(5, ChronoUnit.HOURS), now.plus(12, ChronoUnit.HOURS),
                ContestStatus.OPEN));

        contestRepository.save(new Contest(engAus.getId(),
                "Jos Buttler runs",
                "How many runs will Jos Buttler score?",
                "", 50,
                now, now.plus(8, ChronoUnit.HOURS), now.plus(16, ChronoUnit.HOURS),
                ContestStatus.OPEN));

        contestRepository.save(new Contest(engAus.getId(),
                "Travis Head runs",
                "How many runs will Travis Head score?",
                "", 35,
                now, now.plus(8, ChronoUnit.HOURS), now.plus(16, ChronoUnit.HOURS),
                ContestStatus.OPEN));

        log.info("Seed complete. Log in as admin/admin123 and change that password.");
    }

    private void createUser(String userId, String name, String password, Role role, long tokens) {
        User user = userRepository.save(new User(userId, name, passwordEncoder.encode(password), role));

        Wallet wallet = new Wallet(user.getId());
        wallet.credit(tokens);
        walletRepository.save(wallet);

        if (tokens > 0) {
            transactionRepository.save(new WalletTransaction(user.getId(), TxType.ADMIN_CREDIT,
                    tokens, "Opening allocation", null, null));
        }
    }

    /** Kept so the seed list is easy to extend without touching run(). */
    @SuppressWarnings("unused")
    private static final List<String> SEED_NOTE = List.of(
            "admin/admin123", "demo/demo123", "rahul/rahul123", "aisha/aisha123");
}

package com.predictionmarket.scheduler;

import com.predictionmarket.common.Enums.ContestStatus;
import com.predictionmarket.contest.Contest;
import com.predictionmarket.contest.ContestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/**
 * Every 30 seconds, finds questions whose matching deadline has passed and
 * hands each one to DeadlineProcessor, which closes it in its own transaction.
 *
 * This job is the reason "no opponent means a full refund" actually happens
 * without the admin having to notice and click anything.
 */
@Component
public class DeadlineJob {

    private static final Logger log = LoggerFactory.getLogger(DeadlineJob.class);

    private final ContestRepository contestRepository;
    private final DeadlineProcessor processor;
    private final boolean enabled;

    public DeadlineJob(ContestRepository contestRepository,
                       DeadlineProcessor processor,
                       @Value("${app.deadline-job.enabled:true}") boolean enabled) {
        this.contestRepository = contestRepository;
        this.processor = processor;
        this.enabled = enabled;
    }

    @Scheduled(fixedDelayString = "${app.deadline-job.interval-ms:30000}")
    public void run() {
        if (!enabled) {
            return;
        }

        List<Contest> due = contestRepository.findByStatusInAndMatchingDeadlineBefore(
                List.of(ContestStatus.OPEN, ContestStatus.PARTIAL), Instant.now());

        for (Contest contest : due) {
            try {
                processor.process(contest.getId());
            } catch (Exception ex) {
                log.error("Deadline processing failed for contest {}", contest.getId(), ex);
            }
        }
    }
}

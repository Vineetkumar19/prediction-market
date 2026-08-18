package com.predictionmarket.audit;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Writes the admin trail. Kept trivial on purpose - if logging an action can
 * fail loudly it will one day block a refund, which would be far worse than a
 * missing log line.
 */
@Service
public class AuditService {

    public static final String SYSTEM = "SYSTEM";

    private final AuditLogRepository repository;

    public AuditService(AuditLogRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void record(String action, String actor, String target, Long amount, String detail) {
        repository.save(new AuditLog(action, actor, target, amount, detail));
    }
}

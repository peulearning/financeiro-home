package com.financeiro.service;

import com.financeiro.repository.HouseholdMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

/**
 * Materializa as recorrencias ativas de todos os espacos compartilhados.
 * Roda de madrugada e materializa tudo ate a data de hoje.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RecurrenceScheduler {

    private final HouseholdMemberRepository memberRepository;
    private final RecurrenceService recurrenceService;

    @Scheduled(cron = "${app.recurrence.cron:0 7 3 * * *}")
    public void generateDaily() {
        List<Long> householdIds = memberRepository.findDistinctHouseholdIds();

        if (householdIds.isEmpty()) {
            return;
        }

        LocalDate today = LocalDate.now();
        int total = 0;
        for (Long householdId : householdIds) {
            try {
                total += recurrenceService.generateAll(householdId, today);
            } catch (RuntimeException ex) {
                log.error("Falha ao gerar recorrencias do espaco {}: {}", householdId, ex.getMessage(), ex);
            }
        }
        log.info("Agendador de recorrencias concluiu. {} movimentacoes geradas em {} espacos.",
                total, householdIds.size());
    }
}

package com.financeiro.service;

import com.financeiro.domain.Account;
import com.financeiro.domain.Category;
import com.financeiro.domain.Recurrence;
import com.financeiro.domain.TransactionEntry;
import com.financeiro.domain.User;
import com.financeiro.domain.enums.CategoryType;
import com.financeiro.domain.enums.RecurrenceFrequency;
import com.financeiro.domain.enums.TransactionType;
import com.financeiro.exception.BusinessRuleException;
import com.financeiro.exception.NotFoundException;
import com.financeiro.repository.HouseholdRepository;
import com.financeiro.repository.RecurrenceRepository;
import com.financeiro.repository.TransactionRepository;
import com.financeiro.repository.UserRepository;
import com.financeiro.web.dto.RecurrenceRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecurrenceService {

    /** Teto por execucao para nunca travar o sistema com um cadastro antigo. */
    private static final int MAX_PER_RUN = 120;

    private final RecurrenceRepository recurrenceRepository;
    private final TransactionRepository transactionRepository;
    private final HouseholdRepository householdRepository;
    private final UserRepository userRepository;
    private final AccountService accountService;
    private final CategoryService categoryService;

    @Transactional(readOnly = true)
    public List<RecurrenceRequest.Response> list(Long householdId) {
        return recurrenceRepository.findByHouseholdIdOrderByCreatedAtDesc(householdId).stream()
                .map(RecurrenceRequest.Response::from)
                .toList();
    }

    @Transactional
    public RecurrenceRequest.Response create(Long householdId, Long userId, RecurrenceRequest request) {
        validate(request);

        Account account = accountService.requireScoped(householdId, request.accountId());
        if (!account.isActive()) {
            throw new BusinessRuleException("A conta '" + account.getName() + "' esta inativa");
        }

        Category category = null;
        if (request.categoryId() != null) {
            category = categoryService.requireScoped(householdId, request.categoryId(),
                    request.type() == TransactionType.INCOME ? CategoryType.INCOME : CategoryType.EXPENSE);
        }

        User user = requireUser(userId);

        Recurrence recurrence = recurrenceRepository.save(buildRecurrence(
                householdRepository.getReferenceById(householdId),
                account, category, request, user));

        return RecurrenceRequest.Response.from(recurrence);
    }

    private Recurrence buildRecurrence(com.financeiro.domain.Household household,
                                       Account account,
                                       Category category,
                                       RecurrenceRequest request,
                                       User user) {
        Integer dayOfMonth = request.frequency() == RecurrenceFrequency.MONTHLY
                ? (request.dayOfMonth() != null ? request.dayOfMonth() : request.startDate().getDayOfMonth())
                : null;
        Integer weekday = request.frequency() == RecurrenceFrequency.WEEKLY
                ? (request.weekday() != null ? request.weekday() : request.startDate().getDayOfWeek().getValue())
                : null;

        return Recurrence.builder()
                .household(household)
                .account(account)
                .category(category)
                .type(request.type())
                .amount(request.amount())
                .description(request.description().trim())
                .frequency(request.frequency())
                .startDate(request.startDate())
                .endDate(request.endDate())
                .dayOfMonth(dayOfMonth)
                .weekday(weekday)
                .active(true)
                .createdBy(user)
                .build();
    }

    @Transactional
    public RecurrenceRequest.Response update(Long householdId, Long recurrenceId, RecurrenceRequest request) {
        validate(request);
        Recurrence recurrence = requireScoped(householdId, recurrenceId);

        Account account = accountService.requireScoped(householdId, request.accountId());
        Category category = null;
        if (request.categoryId() != null) {
            category = categoryService.requireScoped(householdId, request.categoryId(),
                    request.type() == TransactionType.INCOME ? CategoryType.INCOME : CategoryType.EXPENSE);
        }

        recurrence.setAccount(account);
        recurrence.setCategory(category);
        recurrence.setType(request.type());
        recurrence.setAmount(request.amount());
        recurrence.setDescription(request.description().trim());
        recurrence.setFrequency(request.frequency());
        recurrence.setStartDate(request.startDate());
        recurrence.setEndDate(request.endDate());
        recurrence.setDayOfMonth(request.dayOfMonth());
        recurrence.setWeekday(request.weekday());

        // Nao zera o ultimo gerado: as ocorrencias ja lancadas permanecem
        // e apenas as pendentes a partir da ultima data sao geradas.
        // Se a serie mudou, o cursor antigo e preservado para nao duplicar.
        return RecurrenceRequest.Response.from(recurrenceRepository.save(recurrence));
    }

    @Transactional
    public RecurrenceRequest.Response setActive(Long householdId, Long recurrenceId, boolean active) {
        Recurrence recurrence = requireScoped(householdId, recurrenceId);
        recurrence.setActive(active);
        return RecurrenceRequest.Response.from(recurrenceRepository.save(recurrence));
    }

    @Transactional
    public void delete(Long householdId, Long recurrenceId) {
        recurrenceRepository.delete(requireScoped(householdId, recurrenceId));
    }

    /** Materializa as ocorrencias pendentes de uma recurrencia. */
    @Transactional
    public int generatePending(Long householdId, Long recurrenceId, LocalDate until) {
        Recurrence recurrence = requireScoped(householdId, recurrenceId);
        return materialize(recurrence, until);
    }

    /** Processa todas as recurrencias ativas do espaco. */
    @Transactional
    public int generateAll(Long householdId, LocalDate until) {
        List<Recurrence> pending = recurrenceRepository.findPending(householdId, LocalDate.now().minusYears(3), until);
        int total = 0;
        for (Recurrence recurrence : pending) {
            total += materialize(recurrence, until);
        }
        if (total > 0) {
            log.info("{} movimentacoes geradas por recorrencia para o espaco {}", total, householdId);
        }
        return total;
    }

    private int materialize(Recurrence recurrence, LocalDate until) {
        if (!recurrence.isActive() || recurrence.getStartDate().isAfter(until)) {
            return 0;
        }

        User user = requireUser(recurrence.getCreatedBy().getId());
        List<LocalDate> dates = occurrencesUntil(recurrence, until);

        if (dates.isEmpty()) {
            return 0;
        }

        List<TransactionEntry> entries = new ArrayList<>(dates.size());
        for (LocalDate date : dates) {
            entries.add(TransactionEntry.builder()
                    .household(recurrence.getHousehold())
                    .account(recurrence.getAccount())
                    .category(recurrence.getCategory())
                    .type(recurrence.getType())
                    .amount(recurrence.getAmount())
                    .description(recurrence.getDescription())
                    .entryDate(date)
                    .createdBy(user)
                    .build());
        }

        transactionRepository.saveAll(entries);
        recurrence.setLastGeneratedAt(dates.get(dates.size() - 1));
        recurrenceRepository.save(recurrence);
        return entries.size();
    }

    /** Lista as datas devidas entre o ultimo gerado (ou inicio) e {@code until}. */
    List<LocalDate> occurrencesUntil(Recurrence recurrence, LocalDate until) {
        List<LocalDate> result = new ArrayList<>();
        LocalDate cursor = recurrence.getLastGeneratedAt();

        LocalDate next = (cursor == null)
                ? firstOccurrence(recurrence)
                : nextOccurrence(recurrence, cursor);

        int guard = 0;
        while (next != null && !next.isAfter(until) && result.size() < MAX_PER_RUN && guard++ < MAX_PER_RUN * 2) {
            if (recurrence.getEndDate() != null && next.isAfter(recurrence.getEndDate())) {
                break;
            }
            if (!next.isBefore(recurrence.getStartDate())) {
                result.add(next);
            }
            next = nextOccurrence(recurrence, next);
        }
        return result;
    }

    private LocalDate firstOccurrence(Recurrence recurrence) {
        if (recurrence.getFrequency() == RecurrenceFrequency.WEEKLY && recurrence.getWeekday() != null) {
            LocalDate start = recurrence.getStartDate();
            int delta = recurrence.getWeekday() - start.getDayOfWeek().getValue();
            if (delta < 0) {
                delta += 7;
            }
            return start.plusDays(delta);
        }
        return recurrence.getStartDate();
    }

    /**
     * Proxima ocorrencia apos {@code after}. Para MONTHLY o dia e fixado em
     * {@code dayOfMonth} e trunado no ultimo dia quando o mes for menor.
     */
    private LocalDate nextOccurrence(Recurrence recurrence, LocalDate after) {
        return switch (recurrence.getFrequency()) {
            case DAILY -> after.plusDays(1);
            case WEEKLY -> after.plusWeeks(1);
            case MONTHLY -> {
                LocalDate firstOfNextMonth = after.withDayOfMonth(1).plusMonths(1);
                int day = recurrence.getDayOfMonth() == null
                        ? recurrence.getStartDate().getDayOfMonth()
                        : recurrence.getDayOfMonth();
                yield firstOfNextMonth.withDayOfMonth(Math.min(day, firstOfNextMonth.lengthOfMonth()));
            }
            case YEARLY -> {
                int year = after.getYear() + 1;
                int month = recurrence.getStartDate().getMonthValue();
                LocalDate firstOfMonth = LocalDate.of(year, month, 1);
                int day = Math.min(recurrence.getStartDate().getDayOfMonth(), firstOfMonth.lengthOfMonth());
                yield firstOfMonth.withDayOfMonth(day);
            }
        };
    }

    private void validate(RecurrenceRequest request) {
        if (request.type() == TransactionType.TRANSFER) {
            throw new BusinessRuleException("Recorrencia nao aceita transferencias");
        }
        if (request.endDate() != null && request.endDate().isBefore(request.startDate())) {
            throw new BusinessRuleException("A data final deve ser igual ou posterior a data inicial");
        }
        if (request.frequency() == RecurrenceFrequency.WEEKLY && request.weekday() == null) {
            throw new BusinessRuleException("Informe o dia da semana para recorrencias semanais");
        }
        if (request.frequency() != RecurrenceFrequency.WEEKLY && request.weekday() != null) {
            throw new BusinessRuleException("Dia da semana so se aplica a recorrencias semanais");
        }
        if (request.frequency() == RecurrenceFrequency.DAILY && request.dayOfMonth() != null) {
            throw new BusinessRuleException("Dia do mes so se aplica a recorrencias mensais");
        }
        if (request.dayOfMonth() != null && (request.dayOfMonth() < 1 || request.dayOfMonth() > 31)) {
            throw new BusinessRuleException("Dia do mes deve estar entre 1 e 31");
        }
        if (request.weekday() != null && (request.weekday() < 1 || request.weekday() > 7)) {
            throw new BusinessRuleException("Dia da semana invalido");
        }
    }

    public Recurrence requireScoped(Long householdId, Long id) {
        return recurrenceRepository.findByIdAndHouseholdId(id, householdId)
                .orElseThrow(() -> new NotFoundException("Recorrencia nao encontrada"));
    }

    private User requireUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));
    }
}

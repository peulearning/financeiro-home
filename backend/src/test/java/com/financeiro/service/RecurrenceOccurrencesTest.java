package com.financeiro.service;

import com.financeiro.domain.Recurrence;
import com.financeiro.domain.enums.RecurrenceFrequency;
import com.financeiro.domain.enums.TransactionType;
import com.financeiro.repository.HouseholdRepository;
import com.financeiro.repository.RecurrenceRepository;
import com.financeiro.repository.TransactionRepository;
import com.financeiro.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class RecurrenceOccurrencesTest {

    private final RecurrenceService service = new RecurrenceService(
            mock(RecurrenceRepository.class),
            mock(TransactionRepository.class),
            mock(HouseholdRepository.class),
            mock(UserRepository.class),
            mock(AccountService.class),
            mock(CategoryService.class));

    @Test
    @DisplayName("Diaria gera uma ocorrencia por dia, comecando na data inicial")
    void diaria() {
        Recurrence recurrence = recurrence(RecurrenceFrequency.DAILY, LocalDate.of(2026, 1, 1), null, null);

        List<LocalDate> dates = service.occurrencesUntil(recurrence, LocalDate.of(2026, 1, 3));

        assertThat(dates).containsExactly(
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 1, 2),
                LocalDate.of(2026, 1, 3));
    }

    @Test
    @DisplayName("Semanal respeita o dia da semana escolhido")
    void semanal() {
        // 2026-01-01 e uma quinta-feira; a recorrencia e toda segunda.
        Recurrence recurrence = recurrence(RecurrenceFrequency.WEEKLY, LocalDate.of(2026, 1, 1), null, 1);

        List<LocalDate> dates = service.occurrencesUntil(recurrence, LocalDate.of(2026, 1, 19));

        assertThat(dates).containsExactly(
                LocalDate.of(2026, 1, 5),
                LocalDate.of(2026, 1, 12),
                LocalDate.of(2026, 1, 19));
    }

    @Test
    @DisplayName("Mensal fixa o dia e ajusta meses curtos")
    void mensal() {
        // Dia 31: fevereiro cai no dia 28 (2026 nao e ano bissexto).
        Recurrence recurrence = recurrence(RecurrenceFrequency.MONTHLY, LocalDate.of(2026, 1, 31), 31, null);

        List<LocalDate> dates = service.occurrencesUntil(recurrence, LocalDate.of(2026, 3, 31));

        assertThat(dates).containsExactly(
                LocalDate.of(2026, 1, 31),
                LocalDate.of(2026, 2, 28),
                LocalDate.of(2026, 3, 31));
    }

    @Test
    @DisplayName("Nao gera ocorrencia depois da data final")
    void respeitaDataFinal() {
        Recurrence recurrence = Recurrence.builder()
                .frequency(RecurrenceFrequency.MONTHLY)
                .type(TransactionType.EXPENSE)
                .startDate(LocalDate.of(2026, 1, 10))
                .dayOfMonth(10)
                .endDate(LocalDate.of(2026, 2, 10))
                .active(true)
                .build();

        List<LocalDate> dates = service.occurrencesUntil(recurrence, LocalDate.of(2026, 6, 30));

        assertThat(dates).containsExactly(
                LocalDate.of(2026, 1, 10),
                LocalDate.of(2026, 2, 10));
    }

    @Test
    @DisplayName("Apos o ultimo gerado, continua da ocorrencia seguinte sem repetir")
    void naoRepeteAposUltimoGerado() {
        Recurrence recurrence = recurrence(RecurrenceFrequency.MONTHLY, LocalDate.of(2026, 1, 10), 10, null);
        recurrence.setLastGeneratedAt(LocalDate.of(2026, 2, 10));

        List<LocalDate> dates = service.occurrencesUntil(recurrence, LocalDate.of(2026, 4, 30));

        assertThat(dates).containsExactly(
                LocalDate.of(2026, 3, 10),
                LocalDate.of(2026, 4, 10));
    }

    @Test
    @DisplayName("Recorrencia que comeca no futuro nao gera nada antes da data")
    void comecandoNoFuturo() {
        Recurrence recurrence = recurrence(RecurrenceFrequency.MONTHLY, LocalDate.of(2026, 6, 5), 5, null);

        List<LocalDate> dates = service.occurrencesUntil(recurrence, LocalDate.of(2026, 3, 1));

        assertThat(dates).isEmpty();
    }

    private Recurrence recurrence(RecurrenceFrequency frequency, LocalDate start, Integer dayOfMonth, Integer weekday) {
        return Recurrence.builder()
                .frequency(frequency)
                .type(TransactionType.EXPENSE)
                .startDate(start)
                .dayOfMonth(dayOfMonth)
                .weekday(weekday)
                .active(true)
                .build();
    }
}

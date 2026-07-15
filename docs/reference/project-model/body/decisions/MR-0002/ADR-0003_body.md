# ADR-0003 — Materializzazione governata di scaffold implementativi

## Status

Draft

## Context

La pianificazione guidata introdotta da ADR-0001 valida Requirement, tipo, titolo, path, tracciabilità e comando di verifica senza modificare il repository.

Il passo successivo abilita l'avvio del lavoro tecnico da VS Code senza creare codice scollegato, sovrascrivere file esistenti o dichiarare completa un'implementazione ancora vuota.

## Decision

ThreatForge introduce la materializzazione governata di scaffold implementativi.

La capacità:

- riusa il contratto di validazione del pianificatore esistente;
- crea un solo file sorgente iniziale con tracciabilità obbligatoria;
- registra lo stesso artefatto nell'implementation trace registry;
- usa lo stato canonico `scaffolded` finché l'implementazione non è completata;
- rifiuta path già esistenti o già registrati;
- applica file e record di registro come una singola operazione con rollback in caso di errore;
- è richiamabile da VS Code tramite un adapter sottile.

Lo scaffold non costituisce implementazione completata. Una successiva operazione governata gestisce il passaggio da `scaffolded` a `implemented`.

## Consequences

- Benefit: Lo sviluppatore inizia dal Requirement selezionato senza scrivere manualmente gli header di tracciabilità.
- Benefit: Il repository evita scaffold non registrati e record privi del relativo file.
- Benefit: L'implementation trace distingue pianificazione, scaffold e implementazione completata.
- Benefit: VS Code continua a invocare capacità CLI indipendenti dall'IDE.
- Constraint: L'apertura automatica del file e una futura estensione VS Code restano incrementi separati.

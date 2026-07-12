# ADR-0003 — Materializzazione governata di scaffold implementativi

## Stato

Draft.

## Contesto

La pianificazione guidata introdotta da ADR-0001 valida requisito, tipo, titolo, path, tracciabilità e comando di verifica senza modificare il repository.

Il passo successivo deve permettere di iniziare il lavoro tecnico da VS Code senza creare codice scollegato, senza sovrascrivere file esistenti e senza dichiarare come completa un'implementazione ancora vuota.

## Decisione

ThreatForge introduce la materializzazione governata di scaffold implementativi.

La capacità deve:

- riusare il contratto di validazione del pianificatore esistente;
- creare un solo file sorgente iniziale con tracciabilità obbligatoria;
- registrare lo stesso artefatto nell'implementation trace registry;
- usare lo stato canonico `scaffolded` finché l'implementazione non è completata;
- rifiutare path già esistenti o già registrati;
- applicare file e record di registro come una singola operazione con rollback in caso di errore;
- essere richiamabile da VS Code tramite un adapter sottile.

Lo scaffold non costituisce implementazione completata. Il passaggio da `scaffolded` a `implemented` richiede una successiva operazione governata.

## Conseguenze

- Lo sviluppatore può iniziare dal requisito selezionato senza scrivere manualmente gli header di tracciabilità.
- Il repository non contiene scaffold non registrati o record privi del relativo file.
- L'implementation trace distingue esplicitamente pianificazione, scaffold e implementazione completata.
- VS Code continua a invocare capacità CLI indipendenti dall'IDE.
- L'apertura automatica del file e una futura estensione VS Code restano incrementi separati.

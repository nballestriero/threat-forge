# ADR-0004 — Modello di label controllate e valori tassonomici documentali

## Status

Draft.

## Context

Il vocabolario controllato introdotto da ADR-0002 richiede una distinzione piu precisa tra termine canonico, alias ammesso, traduzione, label storica, label candidata e label vietata.

Un campo generico come `allowed_labels` e troppo permissivo: puo mescolare sinonimi, acronimi, traduzioni, nomi storici, varianti operative e label di visualizzazione. Questa ambiguita rende difficile stabilire quale forma sia canonica, quale sia solo leggibile, quale sia accettata per compatibilita e quale debba essere segnalata dai controlli.

La documentazione governata usa anche campi ricorrenti come `status`, `artifact_type`, `requirement_type`, `decision_type`, `check_status` e ruoli delle label. Se tali valori restano stringhe libere, registri diversi possono usare valori simili con significati diversi.

I nomi temporanei usati per organizzare il lavoro non devono diventare concetti canonici del modello documentale. Possono restare nei path tecnici o nelle procedure operative, ma non devono essere usati come termini di dominio nella documentazione governata.

## Decision

Il vocabolario controllato deve rappresentare le label tramite un modello esplicito basato su ruolo, lingua e ragione d'uso.

Ogni termine governato deve mantenere un solo `canonical_name` e una `canonical_language`.

Ogni label associata a un termine deve dichiarare almeno:

- `value`;
- `language`;
- `role`;
- `reason`.

I ruoli iniziali delle label sono:

- `preferred`: forma preferita da usare nella documentazione governata;
- `accepted_alias`: alias ammesso per una ragione esplicita, per esempio acronimo tecnico o compatibilita storica;
- `translation`: traduzione leggibile, non fonte canonica;
- `forbidden`: forma vietata da segnalare;
- `candidate`: forma proposta ma non ancora accettata;
- `historical`: forma storica riconoscibile ma non preferita per nuovo testo.

Un sinonimo non e automaticamente una label ammessa. Ogni alias accettato deve avere una ragione esplicita.

Le traduzioni possono aiutare la lettura, ma non creano una seconda fonte canonica.

Le label vietate e le frasi temporanee da evitare devono essere registrate in modo esplicito, cosi che futuri controlli terminologici possano segnalarle deterministicamente.

I campi documentali e di registro con valori ripetuti devono essere progressivamente controllati tramite tassonomie o registri di valori ammessi. Ogni valore controllato deve avere significato esplicito, stato e perimetro d'uso.

## Scope

In scope:

- sostituire `allowed_labels` con label dotate di ruolo esplicito;
- distinguere termine canonico, alias, traduzione, label vietata, label candidata e label storica;
- chiarire che le traduzioni non sono fonti canoniche alternative;
- introdurre il principio dei valori tassonomici controllati per i campi dei registri e della documentazione;
- impedire che nomi temporanei operativi diventino concetti canonici.

Out of scope:

- definire tutte le tassonomie del progetto;
- implementare il controllo terminologico sul corpus;
- implementare il validator del vocabolario;
- definire metriche di qualita del corpus;
- definire il registro asset.

## Consequences

### Conseguenze Positive (Benefici)

- Il vocabolario diventa meno ambiguo.
- Sinonimi, traduzioni e acronimi vengono trattati come casi distinti.
- Le label ammesse richiedono una ragione esplicita.
- Le traduzioni possono essere usate per leggibilita senza diventare fonte canonica.
- I futuri controlli possono distinguere errori, warning e candidati.
- La documentazione puo evolvere verso tassonomie controllate dei campi ricorrenti.

### Conseguenze Negative (Costi/Rischi)

- Il registro vocabolario diventa piu verboso.
- Serve disciplina editoriale per non accettare sinonimi inutili.
- I tool futuri devono validare piu campi.
- Alcune label utili alla lettura devono essere classificate con attenzione per non sembrare canoniche.

## Follow-up

1. Aggiornare il registro `documentation-terms.registry.yml` al modello label con ruoli espliciti.
2. Definire un primo registro di valori tassonomici per i campi ricorrenti.
3. Definire un requisito specializzato per verificare schema e coerenza del vocabolario controllato.
4. Implementare un tool che segnali label vietate, alias sospetti e termini candidati.

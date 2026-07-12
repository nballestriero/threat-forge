# ADR-0004 — Modello di label controllate e valori tassonomici documentali

## Status

Draft.

## Context

Il vocabolario controllato introdotto da ADR-0002 richiede una distinzione più precisa tra termine canonico, alias ammesso, traduzione, label storica, label candidata e label vietata.

Un campo generico come `allowed_labels` è troppo permissivo: può mescolare sinonimi, acronimi, traduzioni, nomi storici, varianti operative e label di visualizzazione. Questa ambiguità rende difficile stabilire quale forma sia canonica, quale sia solo leggibile, quale sia accettata per compatibilità e quale debba essere segnalata dai controlli.

La documentazione governata usa anche campi ricorrenti come `status`, `artifact_type`, `requirement_type`, `decision_type`, `check_status` e ruoli delle label. Se tali valori restano stringhe libere, registri diversi possono usare valori simili con significati diversi.

Il caso più rischioso è `status`: valori come `active`, `draft`, `implemented` o `deprecated` non hanno un significato universale. Il significato cambia in base al registro e al tipo di record. Un check `active` viene eseguito dall'orchestratore; un termine `active` è utilizzabile nel vocabolario; una decisione `accepted` è applicabile; un artefatto `implemented` esiste ed è verificabile. Una tassonomia globale di `status` sarebbe quindi ambigua.

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
- `accepted_alias`: alias ammesso per una ragione esplicita, per esempio acronimo tecnico o compatibilità storica;
- `translation`: traduzione leggibile, non fonte canonica;
- `forbidden`: forma vietata da segnalare;
- `candidate`: forma proposta ma non ancora accettata;
- `historical`: forma storica riconoscibile ma non preferita per nuovo testo.

Un sinonimo non è automaticamente una label ammessa. Ogni alias accettato deve avere una ragione esplicita.

Le traduzioni possono aiutare la lettura, ma non creano una seconda fonte canonica.

Le label vietate e le frasi temporanee da evitare devono essere registrate in modo esplicito, così che futuri controlli terminologici possano segnalarle deterministicamente.

I campi documentali e di registro con valori ripetuti devono essere progressivamente controllati tramite value set tassonomici.

Ogni value set deve dichiarare almeno:

- `name`;
- `field_name`;
- `applies_to_registry`;
- `applies_to_record`;
- `status` del value set;
- `description`;
- lista dei valori ammessi con `value` e `meaning`.

Non deve esistere una tassonomia globale generica per `status` quando lo stesso valore può avere significati diversi in registri diversi. I valori controllati devono essere specifici del contesto: per esempio `check_status`, `implementation_artifact_status`, `decision_status`, `requirement_lifecycle_status`, `vocabulary_term_status` e `field_value_set_status`.

Lo stato di un requirement deve essere distinto dallo stato di implementazione. Il lifecycle di un requirement può essere `draft`, `accepted`, `superseded`, `deprecated` o `removed`; l'implementazione deve essere derivata da tracciabilità e verifiche, non forzata nello stesso campo `status`.

Il campo `requirement_type` deve contenere esclusivamente tipi concreti registrati nel proprio value set contestuale. `specialized` rappresenta una categoria astratta e non deve essere registrato come valore del campo né trattato come alias di un tipo concreto.

Ogni tipo concreto deve dichiarare, oltre a `value` e `meaning`, se appartiene alla categoria specializzata, se richiede un requisito padre e quali tipi concreti sono ammessi come padre. Il primo insieme supportato comprende `functional` e `governance`; nuovi tipi come `security`, `performance`, `privacy` o `compliance` devono essere aggiunti come valori concreti governati con proprie regole applicabili.

## Scope

In scope:

- sostituire `allowed_labels` con label dotate di ruolo esplicito;
- distinguere termine canonico, alias, traduzione, label vietata, label candidata e label storica;
- chiarire che le traduzioni non sono fonti canoniche alternative;
- introdurre value set tassonomici contestuali per i campi ricorrenti;
- scomporre `status` in value set specifici per registro e situazione;
- impedire che nomi temporanei operativi diventino concetti canonici.

Out of scope:

- definire tutte le tassonomie del progetto;
- implementare il controllo terminologico completo sul corpus;
- definire metriche di qualità del corpus;
- definire il registro asset;
- decidere il modello completo di implementation state derivato.

## Consequences

### Conseguenze Positive (Benefici)

- Il vocabolario diventa meno ambiguo.
- Sinonimi, traduzioni e acronimi vengono trattati come casi distinti.
- Le label ammesse richiedono una ragione esplicita.
- Le traduzioni possono essere usate per leggibilità senza diventare fonte canonica.
- I futuri controlli possono distinguere errori, warning e candidati.
- I valori dei campi ricorrenti diventano verificabili.
- Il campo `status` non viene più trattato come una lista globale ambigua.
- Ogni valore controllato ha un significato adatto alla situazione in cui viene usato.

### Conseguenze Negative (Costi/Rischi)

- Il registro vocabolario diventa più verboso.
- Il registro dei valori tassonomici richiede più record.
- Serve disciplina editoriale per non accettare sinonimi inutili.
- I tool futuri devono validare più campi e più contesti.
- Alcune label utili alla lettura devono essere classificate con attenzione per non sembrare canoniche.

## Follow-up

1. Aggiornare il registro `documentation-terms.registry.yml` al modello label con ruoli espliciti.
2. Definire un primo registro di value set contestuali per i campi ricorrenti.
3. Definire un requisito specializzato per verificare schema e coerenza dei value set.
4. Implementare un tool che segnali label vietate, alias sospetti, termini candidati e valori fuori dal proprio value set contestuale.

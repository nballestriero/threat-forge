# ADR-0004 — Modello di label controllate e valori tassonomici documentali

## Status

Draft

## Context

Il vocabolario controllato introdotto da ADR-0002 richiede una distinzione più precisa tra termine canonico, alias ammesso, traduzione, label storica, label candidata e label vietata.

Un campo generico come `allowed_labels` è troppo permissivo: può mescolare sinonimi, acronimi, traduzioni, nomi storici, varianti operative e label di visualizzazione. Questa ambiguità rende difficile stabilire quale forma sia canonica, quale sia soltanto leggibile, quale sia accettata per compatibilità e quale sia segnalata dai controlli.

La documentazione governata usa anche campi ricorrenti come `status`, `artifact_type`, `requirement_type`, `decision_type`, `check_status` e ruoli delle label. Stringhe libere in questi campi consentono a registri diversi di usare valori simili con significati differenti.

Il caso più rischioso è `status`: valori come `active`, `draft`, `implemented` o `deprecated` non hanno un significato universale. Il significato cambia in base al registro e al tipo di record. Un check `active` viene eseguito dall'orchestratore; un termine `active` è utilizzabile nel vocabolario; una Decision `accepted` è applicabile; un artefatto `implemented` esiste ed è verificabile. Una tassonomia globale di `status` risulterebbe ambigua.

I nomi temporanei usati per organizzare il lavoro non appartengono ai concetti canonici del modello documentale. Restano utilizzabili nei path tecnici o nelle procedure operative senza diventare termini di dominio nella documentazione governata.

## Decision

Il vocabolario controllato rappresenta le label tramite un modello esplicito basato su ruolo, lingua e ragione d'uso.

Ogni termine governato mantiene un solo `canonical_name` e una `canonical_language`. Ogni label associata a un termine dichiara almeno:

- `value`;
- `language`;
- `role`;
- `reason`.

I ruoli iniziali delle label sono:

- `preferred`: forma preferita nella documentazione governata;
- `accepted_alias`: alias ammesso per una ragione esplicita, come un acronimo tecnico o una compatibilità storica;
- `translation`: traduzione leggibile e non canonica;
- `forbidden`: forma vietata e segnalabile;
- `candidate`: forma proposta e non ancora accettata;
- `historical`: forma storica riconoscibile e non preferita per nuovo testo.

Un sinonimo non costituisce automaticamente una label ammessa. Ogni alias accettato conserva una ragione esplicita. Le traduzioni supportano la lettura senza creare una seconda fonte canonica. Le label vietate e le frasi temporanee da evitare sono registrate esplicitamente per consentire segnalazioni deterministiche.

I campi documentali e di registro con valori ripetuti evolvono verso value set tassonomici contestuali. Ogni value set dichiara almeno:

- `name`;
- `field_name`;
- `applies_to_registry`;
- `applies_to_record`;
- `status` del value set;
- `description`;
- lista dei valori ammessi con `value` e `meaning`.

Non esiste una tassonomia globale generica per `status` quando lo stesso valore assume significati differenti in registri diversi. I valori controllati sono specifici del contesto, tra cui `check_status`, `implementation_artifact_status`, `decision_status`, `requirement_lifecycle_status`, `vocabulary_term_status` e `field_value_set_status`.

Lo stato di un Requirement resta distinto dallo stato di implementazione. Il lifecycle di un Requirement comprende `draft`, `accepted`, `superseded`, `deprecated` e `removed`; lo stato implementativo deriva dalla tracciabilità e dalle verifiche anziché dal medesimo campo `status`.

Il campo `requirement_type` contiene esclusivamente tipi concreti registrati nel proprio value set contestuale. `specialized` rappresenta una categoria astratta e non compare come valore del campo né come alias di un tipo concreto.

Ogni tipo concreto dichiara, oltre a `value` e `meaning`, l'eventuale appartenenza alla categoria specializzata, la presenza di un Requirement padre e i tipi concreti ammessi come padre. I tipi concreti disponibili sono esclusivamente quelli registrati nel value set contestuale `requirement_type` e associati alle rispettive varianti e regole canoniche. Ogni nuovo tipo entra attraverso un'estensione governata esplicita e non attraverso una lista locale o un alias implicito.

La decisione comprende la sostituzione di `allowed_labels`, la distinzione dei ruoli delle label, i value set contestuali, la scomposizione di `status` e l'esclusione dei nomi temporanei dai concetti canonici. Gli incrementi derivati aggiornano il registro del vocabolario, definiscono i primi value set, introducono il Governance Requirement di coerenza e aggiungono il controllo sulle label e sui valori fuori contesto.

## Consequences

- Benefit: Il vocabolario riduce l'ambiguità tra forme canoniche, sinonimi, traduzioni e acronimi.
- Benefit: Le label ammesse conservano una ragione esplicita.
- Benefit: Le traduzioni migliorano la leggibilità senza diventare fonti canoniche.
- Benefit: I controlli futuri distinguono errori, warning e candidati.
- Benefit: I valori dei campi ricorrenti diventano verificabili nel proprio contesto.
- Benefit: Il campo `status` non viene trattato come una lista globale ambigua.
- Benefit: Ogni valore controllato conserva un significato adatto al registro e al record di applicazione.
- Cost: Il registro del vocabolario diventa più verboso.
- Cost: Il registro dei valori tassonomici richiede più record.
- Cost: La classificazione delle label richiede disciplina editoriale.
- Cost: I tool di validazione gestiscono più campi e più contesti.
- Risk: Una label utile alla lettura può sembrare canonica quando il ruolo non è classificato correttamente.

## Non-goals

- Definire tutte le tassonomie del progetto
- Implementare il controllo terminologico completo sul corpus nella decisione stessa
- Definire metriche di qualità del corpus
- Definire il registro asset
- Decidere il modello completo di implementation state derivato

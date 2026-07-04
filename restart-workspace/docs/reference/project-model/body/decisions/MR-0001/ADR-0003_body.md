# ADR-0003 — Tracciabilità degli artefatti implementativi previsti e realizzati

## Status

Draft.

## Context

La documentazione governata può citare tool, report, gate, fixture o altri artefatti implementativi necessari per soddisfare requisiti.

Se questi artefatti vengono citati solo nella prosa di decisioni, requisiti o how-to, diventano difficili da controllare deterministicamente. Possono essere dimenticati, rimanere incompleti o divergere dal codice realmente scritto.

Il progetto ha bisogno di una fonte controllata che colleghi requisiti, artefatti previsti, artefatti implementati, percorsi, comandi di verifica e stato di completamento.

La tracciabilità deve coprire sia il lavoro già implementato sia il lavoro pianificato ma non ancora realizzato.

## Decision

Il progetto deve usare un registro di tracciabilità implementativa per rappresentare gli artefatti implementativi collegati ai requisiti.

Il registro deve includere artefatti pianificati e artefatti implementati.

Ogni artefatto pianificato deve indicare almeno:

- identificativo governato;
- tipo di artefatto;
- stato;
- requisiti collegati;
- percorso previsto;
- ragione;
- condizione di completamento.

Ogni artefatto implementato deve indicare almeno:

- identificativo governato;
- tipo di artefatto;
- stato;
- requisiti collegati;
- percorso implementato;
- eventuale comando di verifica.

Gli artefatti pianificati ma non ancora implementati devono produrre un warning deterministico.

Gli artefatti dichiarati come implementati devono essere controllati deterministicamente contro:

- esistenza del requisito collegato;
- esistenza del percorso implementato;
- coerenza tra registro e dichiarazioni di tracciabilità presenti nel codice;
- assenza di riferimenti a requisiti inesistenti.

Il registro non sostituisce i requisiti. Il registro indica quali artefatti sono previsti o implementati per soddisfare requisiti esistenti.

Il body del requisito descrive l'obbligo. Il registro di tracciabilità implementativa descrive gli artefatti previsti o realizzati per soddisfarlo.

## Scope

In scope:

- tool;
- report;
- gate;
- fixture;
- artefatti di verifica;
- altri artefatti implementativi collegati a requisiti.

Out of scope:

- definire il formato definitivo dello schema del registro;
- definire tutti i valori controllati ammessi;
- implementare il tool di validazione;
- definire soglie di qualità del corpus documentale;
- definire il modello completo di generazione del grafo.

## Consequences

### Conseguenze Positive (Benefici)

- La documentazione governata non lascia promesse implementative solo nella prosa.
- Gli artefatti pianificati diventano visibili tramite warning deterministici.
- La tracciabilità tra requisiti, registro e codice può essere controllata senza leggere manualmente tutti i body dei requisiti.
- Il registro permette di distinguere lavoro pianificato, lavoro implementato e lavoro da completare.
- Le future relazioni di grafo possono essere generate o validate a partire da requisiti, registro implementativo e dichiarazioni nel codice.

### Conseguenze Negative (Costi/Rischi)

- Il registro di tracciabilità implementativa deve rimanere sincronizzato con i requisiti e con il codice.
- Un registro non aggiornato può introdurre falsi warning o falsa sicurezza.
- La disciplina iniziale aumenta la verbosità prima che i tool automatici riducano il carico manuale.
- I warning su artefatti pianificati devono essere calibrati per non diventare rumore ignorato.

## Follow-up

1. Definire un requisito funzionale per il registro di tracciabilità implementativa.
2. Definire un requisito specializzato per il controllo deterministico di coerenza tra registro, requisiti e codice.
3. Creare un primo registro minimo di tracciabilità implementativa.
4. Implementare il primo tool di controllo che produca warning per artefatti pianificati non completati.

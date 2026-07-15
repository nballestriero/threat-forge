# ADR-0003 — Tracciabilità degli artefatti implementativi previsti e realizzati

## Status

Draft

## Context

La documentazione governata può citare tool, report, gate, fixture o altri artefatti implementativi collegati alla soddisfazione dei Requirement.

Quando questi artefatti compaiono soltanto nella prosa di Decision, Requirement o how-to guide, risultano difficili da controllare deterministicamente. Possono essere dimenticati, rimanere incompleti o divergere dal codice realmente scritto.

Il progetto necessita di una fonte controllata che colleghi Requirement, artefatti previsti, artefatti implementati, percorsi, comandi di verifica e stato di completamento.

La tracciabilità copre sia il lavoro già implementato sia il lavoro pianificato ma non ancora realizzato.

## Decision

ThreatForge usa un implementation trace registry per rappresentare gli artefatti implementativi collegati ai Requirement.

Il registro include artefatti pianificati e artefatti implementati.

Ogni artefatto pianificato contiene almeno:

- identificativo governato;
- tipo di artefatto;
- stato;
- Requirement collegati;
- percorso previsto;
- ragione;
- condizione di completamento.

Ogni artefatto implementato contiene almeno:

- identificativo governato;
- tipo di artefatto;
- stato;
- Requirement collegati;
- percorso implementato;
- eventuale comando di verifica.

Gli artefatti pianificati e non ancora implementati producono un warning deterministico. Gli artefatti dichiarati come implementati sono confrontati deterministicamente con l'esistenza dei Requirement collegati, l'esistenza del percorso implementato, la coerenza tra registro e dichiarazioni di tracciabilità nel codice e l'assenza di riferimenti a Requirement inesistenti.

Il registro non sostituisce i Requirement. Il body del Requirement descrive l'obbligo; l'implementation trace registry descrive gli artefatti previsti o realizzati per soddisfarlo.

La decisione copre tool, report, gate, fixture, artefatti di verifica e altri artefatti implementativi collegati ai Requirement. La sequenza di adozione comprende il Requirement funzionale del registro, il Governance Requirement per il controllo di coerenza, il primo registro minimo e il checker dei warning sugli artefatti pianificati non completati.

## Consequences

- Benefit: Le promesse implementative non restano soltanto nella prosa della documentazione governata.
- Benefit: Gli artefatti pianificati diventano visibili tramite warning deterministici.
- Benefit: La coerenza tra Requirement, registro e codice è controllabile senza leggere manualmente tutti i body.
- Benefit: Il registro distingue lavoro pianificato, lavoro implementato e lavoro da completare.
- Benefit: Le future relazioni di grafo possono derivare da Requirement, implementation trace registry e dichiarazioni nel codice.
- Cost: Il registro richiede sincronizzazione continua con Requirement e codice.
- Risk: Un registro non aggiornato può introdurre falsi warning o falsa sicurezza.
- Cost: La disciplina iniziale aumenta la verbosità prima dell'automazione completa.
- Risk: Warning non calibrati sugli artefatti pianificati possono diventare rumore ignorato.

## Non-goals

- Definire il formato definitivo dello schema del registro
- Definire tutti i valori controllati ammessi
- Implementare il tool di validazione nella decisione stessa
- Definire soglie di qualità del corpus documentale
- Definire il modello completo di generazione del grafo
